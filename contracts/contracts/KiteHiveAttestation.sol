// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract KiteHiveAttestation {
    struct Attestation {
        address agent;
        bytes32 taskId;
        uint8 qualityScore;       // 1-5
        string reasoningCID;      // IPFS CID → full reasoning chain
        uint256 timestamp;
        address attestedBy;
    }

    mapping(bytes32 => Attestation) public attestations;
    mapping(address => uint256) public reputationScore;  // 0-500
    mapping(address => uint256) public totalTasks;
    mapping(bytes32 => bool) public disputed;
    mapping(bytes32 => string) public disputeReasonCID;

    event AttestationCreated(bytes32 indexed taskId, address indexed agent, uint8 qualityScore);
    event DisputeRaised(bytes32 indexed taskId, address indexed agent);
    event DisputeResolved(bytes32 indexed taskId, uint8 newScore);

    function attest(
        address agent, bytes32 taskId,
        uint8 qualityScore, string calldata reasoningCID
    ) external {
        require(qualityScore >= 1 && qualityScore <= 5, "Invalid score");
        attestations[taskId] = Attestation({
            agent: agent, taskId: taskId, qualityScore: qualityScore,
            reasoningCID: reasoningCID, timestamp: block.timestamp,
            attestedBy: msg.sender
        });
        uint256 old = totalTasks[agent];
        reputationScore[agent] =
            (reputationScore[agent] * old + qualityScore * 100) / (old + 1);
        totalTasks[agent] = old + 1;
        emit AttestationCreated(taskId, agent, qualityScore);
    }

    function raiseDispute(bytes32 taskId, string calldata reasonCID) external {
        require(attestations[taskId].agent == msg.sender, "Not your attestation");
        require(!disputed[taskId], "Already disputed");
        disputed[taskId] = true;
        disputeReasonCID[taskId] = reasonCID;
        emit DisputeRaised(taskId, attestations[taskId].agent);
    }

    function resolveDispute(bytes32 taskId, uint8 newScore) external {
        require(disputed[taskId], "Not disputed");
        Attestation storage a = attestations[taskId];
        uint256 t = totalTasks[a.agent];
        reputationScore[a.agent] =
            (reputationScore[a.agent] * t - a.qualityScore * 100 + newScore * 100) / t;
        a.qualityScore = newScore;
        disputed[taskId] = false;
        emit DisputeResolved(taskId, newScore);
    }

    function getReputation(address agent) external view returns (uint256, uint256) {
        return (reputationScore[agent], totalTasks[agent]);
    }
}
