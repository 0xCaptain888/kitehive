// Quality Gate + Partial Refund — Section 5.5 of the blueprint
// Rejects low-quality results and triggers failover to alternative agent

export interface QualityGateConfig {
  minQualityScore: number;  // Below this → reject
  refundPercentage: number; // e.g., 0.9 = 90% refund
}

export interface QualityGateResult {
  passed: boolean;
  qualityScore: number;
  refundAmount: number | null;
  failoverTriggered: boolean;
}

const DEFAULT_CONFIG: QualityGateConfig = {
  minQualityScore: 2,
  refundPercentage: 0.9,
};

export async function executeWithQualityGate(
  task: any,
  agent: { id: string; execute: (task: any) => Promise<any> },
  attest: (agentId: string, taskId: string, qualityScore: number, status: string) => Promise<void>,
  refundPartial: (paymentId: string, percentage: number) => Promise<void>,
  failoverToAlternative: (task: any) => Promise<any>,
  config: QualityGateConfig = DEFAULT_CONFIG
): Promise<{ result: any; gateResult: QualityGateResult }> {
  const result = await agent.execute(task);

  if (result.qualityScore < config.minQualityScore) {
    // Reject: attest with low score, refund, failover
    await attest(agent.id, task.taskId, result.qualityScore, 'rejected');
    await refundPartial(task.paymentId, config.refundPercentage);

    const fallbackResult = await failoverToAlternative(task);
    return {
      result: fallbackResult,
      gateResult: {
        passed: false,
        qualityScore: result.qualityScore,
        refundAmount: task.price * config.refundPercentage,
        failoverTriggered: true,
      },
    };
  }

  return {
    result,
    gateResult: {
      passed: true,
      qualityScore: result.qualityScore,
      refundAmount: null,
      failoverTriggered: false,
    },
  };
}
