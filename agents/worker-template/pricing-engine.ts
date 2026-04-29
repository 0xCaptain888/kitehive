// Dynamic pricing formula — agents set their own prices based on load, reputation, complexity

export interface PriceQuote {
  price: number;
  estimatedLatency: number;
  confidence: number;
  breakdown: {
    basePrice: number;
    loadMultiplier: number;
    reputationMultiplier: number;
    complexityMultiplier: number;
  };
}

export interface PricingConfig {
  basePrice: number;          // Base price in USDC
  maxPrice: number;           // Price ceiling
  minPrice: number;           // Price floor
}

export class PricingEngine {
  private config: PricingConfig;
  private currentLoad: number = 0;
  private reputationScore: number = 250; // 0-500, start at middle
  private priceHistory: { price: number; timestamp: number }[] = [];

  constructor(config: PricingConfig) {
    this.config = config;
  }

  setLoad(queueLength: number): void {
    this.currentLoad = queueLength;
  }

  setReputation(score: number): void {
    this.reputationScore = Math.max(0, Math.min(500, score));
  }

  generateQuote(taskComplexity: number): PriceQuote {
    const loadMultiplier = 1 + this.currentLoad * 0.15;
    const reputationMultiplier = 0.8 + (this.reputationScore / 500) * 0.4;
    const complexityMultiplier = 0.5 + taskComplexity * 0.3;

    let price = this.config.basePrice * loadMultiplier * reputationMultiplier * complexityMultiplier;
    price = Math.max(this.config.minPrice, Math.min(this.config.maxPrice, price));
    price = Math.round(price * 100) / 100;

    const estimatedLatency = Math.round(
      (3000 + taskComplexity * 2000 + this.currentLoad * 1500) *
        (1 / reputationMultiplier)
    );

    this.priceHistory.push({ price, timestamp: Date.now() });

    return {
      price,
      estimatedLatency,
      confidence: this.reputationScore / 500,
      breakdown: {
        basePrice: this.config.basePrice,
        loadMultiplier: Math.round(loadMultiplier * 100) / 100,
        reputationMultiplier: Math.round(reputationMultiplier * 100) / 100,
        complexityMultiplier: Math.round(complexityMultiplier * 100) / 100,
      },
    };
  }

  getPriceVolatility24h(): number {
    const cutoff = Date.now() - 86400000;
    const recent = this.priceHistory.filter((p) => p.timestamp > cutoff);
    if (recent.length < 2) return 0;
    const prices = recent.map((p) => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
    return Math.round((Math.sqrt(variance) / mean) * 10000) / 100; // percentage
  }
}
