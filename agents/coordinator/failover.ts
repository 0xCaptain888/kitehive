// Fault tolerance — detects agent failures and routes to alternatives

export interface FailoverConfig {
  maxRetries: number;
  timeoutMs: number;
  qualityThreshold: number;
}

export interface FailoverEvent {
  originalAgent: string;
  failureReason: string;
  fallbackAgent: string | null;
  timestamp: number;
  recovered: boolean;
}

export class FailoverManager {
  private config: FailoverConfig;
  private failureHistory: Map<string, number[]> = new Map();
  private events: FailoverEvent[] = [];

  constructor(config: Partial<FailoverConfig> = {}) {
    this.config = {
      maxRetries: 2,
      timeoutMs: 30000,
      qualityThreshold: 2,
      ...config,
    };
  }

  async executeWithFailover<T>(
    primaryAgent: string,
    execute: (agentId: string) => Promise<T>,
    alternatives: string[],
    validate: (result: T) => boolean
  ): Promise<{ result: T; agent: string; failovers: number }> {
    const agents = [primaryAgent, ...alternatives];
    let lastError: Error | null = null;

    for (let i = 0; i < Math.min(agents.length, this.config.maxRetries + 1); i++) {
      const agent = agents[i];
      try {
        const result = await Promise.race([
          execute(agent),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), this.config.timeoutMs)
          ),
        ]);

        if (validate(result)) {
          if (i > 0) {
            this.events.push({
              originalAgent: primaryAgent,
              failureReason: lastError?.message || 'Unknown',
              fallbackAgent: agent,
              timestamp: Date.now(),
              recovered: true,
            });
          }
          return { result, agent, failovers: i };
        }

        lastError = new Error(`Quality below threshold for ${agent}`);
        this.recordFailure(agent);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(agent);

        if (i === 0) {
          this.events.push({
            originalAgent: primaryAgent,
            failureReason: lastError.message,
            fallbackAgent: agents[i + 1] || null,
            timestamp: Date.now(),
            recovered: i + 1 < agents.length,
          });
        }
      }
    }

    throw new Error(
      `All agents failed. Primary: ${primaryAgent}, tried ${Math.min(agents.length, this.config.maxRetries + 1)} agents. Last error: ${lastError?.message}`
    );
  }

  private recordFailure(agentId: string): void {
    if (!this.failureHistory.has(agentId)) {
      this.failureHistory.set(agentId, []);
    }
    this.failureHistory.get(agentId)!.push(Date.now());
  }

  getFailureRate(agentId: string, windowMs: number = 3600000): number {
    const history = this.failureHistory.get(agentId) || [];
    const cutoff = Date.now() - windowMs;
    return history.filter((t) => t > cutoff).length;
  }

  getRecentEvents(limit: number = 10): FailoverEvent[] {
    return this.events.slice(-limit);
  }

  isAgentHealthy(agentId: string): boolean {
    return this.getFailureRate(agentId) < 3;
  }
}
