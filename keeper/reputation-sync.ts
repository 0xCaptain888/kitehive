// Keeper: Auto-sync reputation → AA spending rules
// Listens to AttestationCreated events and reconfigures agent wallets

import { ethers } from 'ethers';

interface ReputationTier {
  label: string;
  minScore: number;
  maxScore: number;
  dailyBudget: string;
  perTxLimit: string;
}

const REPUTATION_TIERS: ReputationTier[] = [
  { label: 'New', minScore: 0, maxScore: 199, dailyBudget: '3', perTxLimit: '0.50' },
  { label: 'Growing', minScore: 200, maxScore: 299, dailyBudget: '10', perTxLimit: '2.00' },
  { label: 'Established', minScore: 300, maxScore: 399, dailyBudget: '20', perTxLimit: '5.00' },
  { label: 'Trusted', minScore: 400, maxScore: 500, dailyBudget: '50', perTxLimit: '10.00' },
];

export function calculateTier(score: number): ReputationTier {
  for (const tier of REPUTATION_TIERS) {
    if (score >= tier.minScore && score <= tier.maxScore) {
      return tier;
    }
  }
  return REPUTATION_TIERS[0]; // Default to New
}

interface AttestationEvent {
  taskId: string;
  agent: string;
  qualityScore: number;
  txHash: string;
}

interface TrustLifecycleEvent {
  agent: string;
  oldTier: string;
  newTier: string;
  oldScore: number;
  newScore: number;
  budgetChange: string;
  timestamp: number;
}

export class ReputationKeeper {
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private agentTiers: Map<string, string> = new Map();
  private lifecycleEvents: TrustLifecycleEvent[] = [];
  private eventListeners: ((event: TrustLifecycleEvent) => void)[] = [];

  constructor(
    rpcUrl: string,
    contractAddress: string,
    contractABI: string[]
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
  }

  onTrustLifecycle(listener: (event: TrustLifecycleEvent) => void): void {
    this.eventListeners.push(listener);
  }

  private emit(event: TrustLifecycleEvent): void {
    this.lifecycleEvents.push(event);
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  async onAttestationCreated(event: AttestationEvent): Promise<TrustLifecycleEvent | null> {
    const { agent } = event;

    try {
      const [score, tasks] = await this.contract.getReputation(agent);
      const numericScore = Number(score);
      const previousTier = this.agentTiers.get(agent) || 'New';
      const newTier = calculateTier(numericScore);

      if (previousTier !== newTier.label) {
        const previousTierData = REPUTATION_TIERS.find((t) => t.label === previousTier) || REPUTATION_TIERS[0];

        const lifecycleEvent: TrustLifecycleEvent = {
          agent,
          oldTier: previousTier,
          newTier: newTier.label,
          oldScore: numericScore - event.qualityScore * 100 / Number(tasks),
          newScore: numericScore,
          budgetChange: `$${previousTierData.dailyBudget} → $${newTier.dailyBudget}`,
          timestamp: Date.now(),
        };

        this.agentTiers.set(agent, newTier.label);
        this.emit(lifecycleEvent);

        console.log(
          `[ReputationKeeper] Tier change: ${agent} ${previousTier} → ${newTier.label} (budget: ${lifecycleEvent.budgetChange})`
        );

        return lifecycleEvent;
      }

      this.agentTiers.set(agent, newTier.label);
      return null;
    } catch (error) {
      console.error(`[ReputationKeeper] Error processing attestation:`, error);
      return null;
    }
  }

  async configureSpendingRules(
    agentAddress: string,
    tier: ReputationTier,
    aaSdk: any,
    vaultProxy: string,
    signFunction: any
  ): Promise<void> {
    const newRules = [
      {
        timeWindow: 86400n, // 24 hours
        budget: ethers.parseUnits(tier.dailyBudget, 18),
        initialWindowStartTime: BigInt(Math.floor(Date.now() / 1000)),
        targetProviders: [],
      },
    ];

    try {
      await aaSdk.sendUserOperationAndWait(agentAddress, {
        target: vaultProxy,
        callData: encodeConfigureSpendingRules(newRules),
      }, signFunction);

      console.log(
        `[ReputationKeeper] Spending rules updated for ${agentAddress}: daily=$${tier.dailyBudget}, per-tx=$${tier.perTxLimit}`
      );
    } catch (error) {
      console.error(`[ReputationKeeper] Failed to update spending rules:`, error);
    }
  }

  getLifecycleEvents(limit: number = 20): TrustLifecycleEvent[] {
    return this.lifecycleEvents.slice(-limit);
  }

  getAgentTier(agentAddress: string): string {
    return this.agentTiers.get(agentAddress) || 'New';
  }

  getTierInfo(tierLabel: string): ReputationTier | undefined {
    return REPUTATION_TIERS.find((t) => t.label === tierLabel);
  }
}

function encodeConfigureSpendingRules(rules: any[]): string {
  // Simplified encoding — in production use proper ABI encoding
  const iface = new ethers.Interface([
    'function configureSpendingRules(tuple(uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] targetProviders)[] rules)',
  ]);
  return iface.encodeFunctionData('configureSpendingRules', [rules]);
}

export { REPUTATION_TIERS };
