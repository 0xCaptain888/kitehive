// Economy health monitoring — Gini coefficient, market efficiency, anti-monopoly

export interface EconomyMetrics {
  giniCoefficient: number;
  marketEfficiency: number;
  explorationRate: number;
  priceVolatility24h: number;
  totalTransactions: number;
  totalVolume: number;
  activeAgents: number;
  timestamp: number;
}

export interface Transaction {
  agentId: string;
  price: number;
  qualityScore: number;
  timestamp: number;
  isExploration: boolean;
}

export class EconomyHealthMonitor {
  private transactions: Transaction[] = [];
  private agentEarnings: Map<string, number> = new Map();
  private explorationCount: number = 0;
  private totalCount: number = 0;
  private antiMonopolyActive: boolean = false;
  private eventListeners: ((event: { type: string; message: string; metrics: EconomyMetrics }) => void)[] = [];

  onEvent(listener: (event: { type: string; message: string; metrics: EconomyMetrics }) => void): void {
    this.eventListeners.push(listener);
  }

  private emit(type: string, message: string): void {
    const metrics = this.getMetrics();
    for (const listener of this.eventListeners) {
      listener({ type, message, metrics });
    }
  }

  recordTransaction(tx: Transaction): void {
    this.transactions.push(tx);
    this.totalCount++;
    if (tx.isExploration) this.explorationCount++;

    const current = this.agentEarnings.get(tx.agentId) || 0;
    this.agentEarnings.set(tx.agentId, current + tx.price);

    this.checkEconomyHealth();
  }

  private checkEconomyHealth(): void {
    const earnings = Array.from(this.agentEarnings.values());
    if (earnings.length < 2) return;

    const gini = calculateGini(earnings);

    if (gini > 0.5 && !this.antiMonopolyActive) {
      this.antiMonopolyActive = true;
      this.emit('anti_monopoly', `Gini ${gini.toFixed(2)} exceeds 0.5. Exploration rate increased.`);
    } else if (gini <= 0.45 && this.antiMonopolyActive) {
      this.antiMonopolyActive = false;
      this.emit('anti_monopoly_resolved', `Gini ${gini.toFixed(2)} normalized. Standard exploration rate restored.`);
    }
  }

  isAntiMonopolyActive(): boolean {
    return this.antiMonopolyActive;
  }

  getExplorationBoost(): number {
    return this.antiMonopolyActive ? 1.5 : 1.0;
  }

  getMetrics(): EconomyMetrics {
    const earnings = Array.from(this.agentEarnings.values());

    return {
      giniCoefficient: earnings.length >= 2 ? calculateGini(earnings) : 0,
      marketEfficiency: this.calculateMarketEfficiency(),
      explorationRate: this.totalCount > 0 ? this.explorationCount / this.totalCount : 0,
      priceVolatility24h: this.calculatePriceVolatility(),
      totalTransactions: this.totalCount,
      totalVolume: earnings.reduce((a, b) => a + b, 0),
      activeAgents: this.agentEarnings.size,
      timestamp: Date.now(),
    };
  }

  private calculateMarketEfficiency(): number {
    if (this.transactions.length < 5) return 0;
    const recent = this.transactions.slice(-50);
    const prices = recent.map((t) => t.price);
    const qualities = recent.map((t) => t.qualityScore);
    return pearsonCorrelation(prices, qualities);
  }

  private calculatePriceVolatility(): number {
    const cutoff = Date.now() - 86400000;
    const recent = this.transactions.filter((t) => t.timestamp > cutoff);
    if (recent.length < 2) return 0;

    const prices = recent.map((t) => t.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (mean === 0) return 0;
    const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
    return Math.round((Math.sqrt(variance) / mean) * 10000) / 100;
  }

  getAgentEarnings(): Map<string, number> {
    return new Map(this.agentEarnings);
  }

  getTransactionHistory(limit: number = 100): Transaction[] {
    return this.transactions.slice(-limit);
  }
}

export function calculateGini(earnings: number[]): number {
  if (earnings.length === 0) return 0;
  const sorted = [...earnings].sort((a, b) => a - b);
  const n = sorted.length;
  let sumOfDifferences = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfDifferences += Math.abs(sorted[i] - sorted[j]);
    }
  }
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  return Math.round((sumOfDifferences / (2 * n * n * mean)) * 1000) / 1000;
}

export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 1000;
}
