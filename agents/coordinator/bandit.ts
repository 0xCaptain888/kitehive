// Thompson Sampling multi-armed bandit for agent selection
// Balances exploration (trying uncertain agents) with exploitation (using proven ones)

interface AgentArm {
  agentId: string;
  alpha: number;  // successes + 1 (Beta distribution param)
  beta: number;   // failures + 1
}

interface AgentOption {
  id: string;
  quote: {
    price: number;
    estimatedLatency: number;
    confidence: number;
  };
  completedTasks: number;
}

interface BanditResult {
  selected: AgentOption;
  qualitySample: number;
  explorationBonus: number;
  isExploration: boolean;
  allSamples: { agentId: string; sample: number; score: number }[];
}

// Beta distribution sampling using Jorgensen's algorithm
function betaSample(alpha: number, beta: number): number {
  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  return x / (x + y);
}

function gammaSample(shape: number): number {
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export class AgentBandit {
  private arms: Map<string, AgentArm> = new Map();
  private explorationBoost: number = 1.0;

  addAgent(agentId: string, priorAlpha: number = 1, priorBeta: number = 1): void {
    this.arms.set(agentId, { agentId, alpha: priorAlpha, beta: priorBeta });
  }

  removeAgent(agentId: string): void {
    this.arms.delete(agentId);
  }

  setExplorationBoost(boost: number): void {
    this.explorationBoost = boost;
  }

  selectAgent(candidates: AgentOption[], budget: number, deadline: number): BanditResult | null {
    const eligible = candidates.filter(
      (c) => c.quote.price <= budget && c.quote.estimatedLatency <= deadline * 1000
    );

    if (eligible.length === 0) return null;

    let bestScore = -Infinity;
    let selected: AgentOption = eligible[0];
    let bestSample = 0;
    const allSamples: { agentId: string; sample: number; score: number }[] = [];

    for (const candidate of eligible) {
      let arm = this.arms.get(candidate.id);
      if (!arm) {
        this.addAgent(candidate.id);
        arm = this.arms.get(candidate.id)!;
      }

      const qualitySample = betaSample(arm.alpha, arm.beta);
      const explorationBonus = this.explorationBoost / Math.sqrt(arm.alpha + arm.beta);
      const score = (qualitySample + explorationBonus * 0.1) / candidate.quote.price;

      allSamples.push({ agentId: candidate.id, sample: qualitySample, score });

      if (score > bestScore) {
        bestScore = score;
        selected = candidate;
        bestSample = qualitySample;
      }
    }

    const arm = this.arms.get(selected.id)!;
    const explorationBonus = this.explorationBoost / Math.sqrt(arm.alpha + arm.beta);

    return {
      selected,
      qualitySample: bestSample,
      explorationBonus,
      isExploration: explorationBonus > 0.3,
      allSamples,
    };
  }

  update(agentId: string, qualityScore: number): void {
    const arm = this.arms.get(agentId);
    if (!arm) return;
    if (qualityScore >= 4) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }
  }

  getStats(agentId: string): { alpha: number; beta: number; expectedQuality: number } | null {
    const arm = this.arms.get(agentId);
    if (!arm) return null;
    return {
      alpha: arm.alpha,
      beta: arm.beta,
      expectedQuality: arm.alpha / (arm.alpha + arm.beta),
    };
  }

  getAllStats(): Map<string, { alpha: number; beta: number; expectedQuality: number }> {
    const stats = new Map();
    for (const [id, arm] of this.arms) {
      stats.set(id, {
        alpha: arm.alpha,
        beta: arm.beta,
        expectedQuality: arm.alpha / (arm.alpha + arm.beta),
      });
    }
    return stats;
  }
}
