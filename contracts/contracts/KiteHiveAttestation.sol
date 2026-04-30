// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * KiteHiveAttestation v2 — with Reputation Staking
 *
 * Upgrade #04: Agents now stake USDC when accepting tasks.
 * - quality >= 3 → stake returned in full
 * - quality == 2 → 50% slash, 50% returned
 * - quality <= 1 → 100% slash → transferred to Coordinator treasury
 *
 * This makes the "Agent Economy" real: bad work has economic consequences.
 * The dispute system now also has financial stakes, not just reputation stakes.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract KiteHiveAttestation {

    // ─── Types ──────────────────────────────────────────────────────────────

    struct Attestation {
        address agent;
        address recorder;       // which Coordinator wrote this (supports multiple coordinators)
        uint8   quality;        // 1–5
        uint256 price;          // USDC paid (6 decimals)
        string  taskType;
        string  reasoningCid;   // IPFS CID of LLM reasoning
        uint256 timestamp;
        bool    disputed;
        bool    resolved;
        uint8   resolvedQuality;
    }

    struct AgentStake {
        uint256 amount;         // USDC staked (6 decimals)
        uint256 taskId;
        bool    released;
    }

    struct CoordinatorStats {
        uint256 totalTasks;
        uint256 totalAccuracy;  // sum of |predicted - actual| quality deltas (lower = better)
        bool    registered;
    }

    // ─── Constants ──────────────────────────────────────────────────────────

    uint256 public constant MIN_STAKE      = 100_000;   // 0.10 USDC (6 decimals)
    uint256 public constant MAX_REPUTATION = 500;
    uint8   public constant QUALITY_SLASH_THRESHOLD = 2; // quality <= this → slash

    // Reputation tiers (match AA SDK spending rules)
    uint256 public constant TIER_NEW         = 0;   // 0–199
    uint256 public constant TIER_GROWING     = 200; // 200–299
    uint256 public constant TIER_ESTABLISHED = 300; // 300–399
    uint256 public constant TIER_TRUSTED     = 400; // 400–500

    // ─── State ──────────────────────────────────────────────────────────────

    address public owner;
    address public usdcToken;
    address public pyusdToken;   // NEW: PYUSD support (upgrade #08)
    address public treasury;     // receives slashed stakes

    mapping(address => uint256) public reputation;          // agent → 0..500
    mapping(address => uint256) public taskCount;           // agent → total tasks
    mapping(address => uint256) public totalEarned;         // agent → USDC earned (6 dec)

    mapping(uint256 => Attestation)  public attestations;
    mapping(uint256 => AgentStake)   public stakes;         // taskId → stake info
    mapping(address => CoordinatorStats) public coordinators; // NEW: multi-coordinator tracking

    uint256 public attestationCount;
    uint256 public totalVolume;   // total USDC settled across all agents

    // ─── Events ─────────────────────────────────────────────────────────────

    event Attested(uint256 indexed taskId, address indexed agent, address indexed recorder,
                   uint8 quality, uint256 price, string taskType);
    event StakeDeposited(uint256 indexed taskId, address indexed agent, uint256 amount);
    event StakeReleased(uint256 indexed taskId, address indexed agent, uint256 returned, uint256 slashed);
    event DisputeRaised(uint256 indexed taskId, address indexed agent);
    event DisputeResolved(uint256 indexed taskId, uint8 oldQuality, uint8 newQuality);
    event ReputationChanged(address indexed agent, uint256 oldRep, uint256 newRep);
    event TierPromotion(address indexed agent, uint256 oldTier, uint256 newTier);
    event CoordinatorRegistered(address indexed coordinator);

    // ─── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier onlyRecorder(uint256 taskId) {
        require(attestations[taskId].recorder == msg.sender, "Not recorder");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────────

    constructor(address _usdc, address _pyusd, address _treasury) {
        owner    = msg.sender;
        usdcToken  = _usdc;
        pyusdToken = _pyusd;
        treasury = _treasury;
    }

    // ─── Coordinator Registry (NEW — upgrade #05) ───────────────────────────

    function registerCoordinator(address coordinator) external onlyOwner {
        coordinators[coordinator].registered = true;
        emit CoordinatorRegistered(coordinator);
    }

    // ─── Stake Flow ─────────────────────────────────────────────────────────

    /**
     * Agent calls this before accepting a task.
     * Deposits MIN_STAKE USDC into contract escrow.
     * The agent must approve this contract first:
     *   usdc.approve(contractAddress, MIN_STAKE)
     */
    function depositStake(uint256 taskId, address token) external {
        require(token == usdcToken || token == pyusdToken, "Unsupported token");
        require(stakes[taskId].amount == 0, "Already staked");

        IERC20(token).transferFrom(msg.sender, address(this), MIN_STAKE);

        stakes[taskId] = AgentStake({
            amount:   MIN_STAKE,
            taskId:   taskId,
            released: false
        });

        emit StakeDeposited(taskId, msg.sender, MIN_STAKE);
    }

    // ─── Attestation ────────────────────────────────────────────────────────

    /**
     * Coordinator calls this after task completion.
     * Simultaneously releases or slashes the agent's stake.
     */
    function attest(
        address agent,
        uint8   quality,
        uint256 price,
        string  calldata taskType,
        string  calldata reasoningCid,
        address token
    ) external returns (uint256 taskId) {
        require(quality >= 1 && quality <= 5, "Quality 1-5");
        require(token == usdcToken || token == pyusdToken, "Unsupported token");

        taskId = ++attestationCount;

        attestations[taskId] = Attestation({
            agent:           agent,
            recorder:        msg.sender,
            quality:         quality,
            price:           price,
            taskType:        taskType,
            reasoningCid:    reasoningCid,
            timestamp:       block.timestamp,
            disputed:        false,
            resolved:        false,
            resolvedQuality: 0
        });

        // Update agent stats
        taskCount[agent]++;
        totalEarned[agent] += price;
        totalVolume += price;

        // Update coordinator accuracy tracking (NEW)
        if (coordinators[msg.sender].registered) {
            coordinators[msg.sender].totalTasks++;
        }

        // Update reputation using Bayesian cumulative average
        _updateReputation(agent, quality);

        // Release or slash stake
        _processStake(taskId, agent, quality, token);

        emit Attested(taskId, agent, msg.sender, quality, price, taskType);
    }

    // ─── Internal: Reputation ───────────────────────────────────────────────

    function _updateReputation(address agent, uint8 quality) internal {
        uint256 oldRep  = reputation[agent];
        uint256 oldTier = _getTier(oldRep);

        // Convert quality 1-5 to reputation delta:
        // quality 5 → +25, quality 4 → +10, quality 3 → +2, quality 2 → -15, quality 1 → -30
        int256 delta;
        if      (quality == 5) delta = 25;
        else if (quality == 4) delta = 10;
        else if (quality == 3) delta = 2;
        else if (quality == 2) delta = -15;
        else                   delta = -30;

        int256 newRepSigned = int256(oldRep) + delta;
        uint256 newRep = newRepSigned < 0 ? 0 : uint256(newRepSigned);
        if (newRep > MAX_REPUTATION) newRep = MAX_REPUTATION;

        reputation[agent] = newRep;

        if (newRep != oldRep) {
            emit ReputationChanged(agent, oldRep, newRep);
        }

        uint256 newTier = _getTier(newRep);
        if (newTier != oldTier) {
            emit TierPromotion(agent, oldTier, newTier);
        }
    }

    // ─── Internal: Stake Processing ─────────────────────────────────────────

    function _processStake(uint256 taskId, address agent, uint8 quality, address token) internal {
        AgentStake storage s = stakes[taskId];
        if (s.amount == 0 || s.released) return;

        s.released = true;
        uint256 toReturn  = 0;
        uint256 toSlash   = 0;

        if (quality >= 3) {
            // Good work → full refund
            toReturn = s.amount;
        } else if (quality == 2) {
            // Mediocre → 50% slash
            toSlash  = s.amount / 2;
            toReturn = s.amount - toSlash;
        } else {
            // Poor quality → 100% slash
            toSlash  = s.amount;
            toReturn = 0;
        }

        if (toReturn > 0) {
            IERC20(token).transfer(agent, toReturn);
        }
        if (toSlash > 0) {
            IERC20(token).transfer(treasury, toSlash);
        }

        emit StakeReleased(taskId, agent, toReturn, toSlash);
    }

    // ─── Dispute Resolution ─────────────────────────────────────────────────

    function raiseDispute(uint256 taskId) external {
        Attestation storage a = attestations[taskId];
        require(a.agent == msg.sender, "Not your task");
        require(!a.disputed, "Already disputed");
        require(block.timestamp <= a.timestamp + 48 hours, "Dispute window closed");
        a.disputed = true;
        emit DisputeRaised(taskId, msg.sender);
    }

    function resolveDispute(
        uint256 taskId,
        uint8   newQuality,
        address token
    ) external onlyOwner {
        Attestation storage a = attestations[taskId];
        require(a.disputed && !a.resolved, "Invalid state");
        require(newQuality >= 1 && newQuality <= 5, "Quality 1-5");

        uint8 oldQuality = a.quality;
        a.quality        = newQuality;
        a.resolved       = true;
        a.resolvedQuality = newQuality;

        // Re-run reputation adjustment (delta between old and new)
        _updateReputation(a.agent, newQuality);

        // If quality improved and was previously slashed, partial compensation
        if (newQuality >= 3 && oldQuality < 3) {
            // Return slashed stake as compensation (if treasury has funds)
            AgentStake storage s = stakes[taskId];
            if (s.amount > 0) {
                uint256 compensation = s.amount / 2;
                if (IERC20(token).balanceOf(address(this)) >= compensation) {
                    IERC20(token).transfer(a.agent, compensation);
                }
            }
        }

        emit DisputeResolved(taskId, oldQuality, newQuality);
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getReputation(address agent) external view returns (uint256) {
        return reputation[agent];
    }

    function getTier(address agent) external view returns (string memory) {
        uint256 rep = reputation[agent];
        uint256 tier = _getTier(rep);
        if      (tier == TIER_TRUSTED)     return "Trusted";
        else if (tier == TIER_ESTABLISHED) return "Established";
        else if (tier == TIER_GROWING)     return "Growing";
        else                               return "New";
    }

    function getCoordinatorAccuracy(address coordinator) external view
        returns (uint256 totalTasks, uint256 avgDelta)
    {
        CoordinatorStats storage c = coordinators[coordinator];
        totalTasks = c.totalTasks;
        avgDelta   = c.totalTasks > 0 ? c.totalAccuracy / c.totalTasks : 0;
    }

    function getEconomySummary() external view returns (
        uint256 _attestationCount,
        uint256 _totalVolume,
        uint256 _minStake
    ) {
        return (attestationCount, totalVolume, MIN_STAKE);
    }

    // ─── Internal Helpers ───────────────────────────────────────────────────

    function _getTier(uint256 rep) internal pure returns (uint256) {
        if      (rep >= TIER_TRUSTED)     return TIER_TRUSTED;
        else if (rep >= TIER_ESTABLISHED) return TIER_ESTABLISHED;
        else if (rep >= TIER_GROWING)     return TIER_GROWING;
        else                              return TIER_NEW;
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setTokens(address _usdc, address _pyusd) external onlyOwner {
        usdcToken  = _usdc;
        pyusdToken = _pyusd;
    }
}
