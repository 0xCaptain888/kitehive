// RFQ (Request-for-Quote) + quote collection
// Broadcasts to agents, collects dynamic quotes, feeds to bandit

export interface RFQ {
  taskId: string;
  type: 'research' | 'writing' | 'external_api';
  description: string;
  complexity: number;
  deadline: number; // seconds
  maxBudget: number; // USDC
}

export interface Quote {
  agentId: string;
  price: number;
  estimatedLatency: number; // ms
  confidence: number; // 0-1
  capabilities: string[];
}

export interface NegotiationResult {
  rfq: RFQ;
  quotes: Quote[];
  selectedAgent: string;
  selectedQuote: Quote;
  reasoning: string;
  isExploration: boolean;
  timestamp: number;
}

interface AgentEndpoint {
  id: string;
  url: string;
  type: string;
  capabilities: string[];
}

export class Negotiator {
  private registry: Map<string, AgentEndpoint> = new Map();

  registerAgent(agent: AgentEndpoint): void {
    this.registry.set(agent.id, agent);
  }

  unregisterAgent(agentId: string): void {
    this.registry.delete(agentId);
  }

  getRegisteredAgents(): AgentEndpoint[] {
    return Array.from(this.registry.values());
  }

  async broadcastRFQ(rfq: RFQ): Promise<Quote[]> {
    const candidates = Array.from(this.registry.values()).filter(
      (agent) => agent.type === rfq.type
    );

    const quotes: Quote[] = [];

    const quotePromises = candidates.map(async (agent) => {
      try {
        const response = await fetch(`${agent.url}/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rfq),
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const quote = await response.json() as Quote;
          return { ...quote, agentId: agent.id };
        }
      } catch {
        // Agent unreachable — skip
      }
      return null;
    });

    const results = await Promise.allSettled(quotePromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      }
    }

    return quotes;
  }

  async executeWithPayment(
    agent: AgentEndpoint,
    task: { taskId: string; description: string; data?: any },
    paymentHeader: string
  ): Promise<{ result: any; status: number }> {
    const response = await fetch(`${agent.url}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': paymentHeader,
      },
      body: JSON.stringify(task),
      signal: AbortSignal.timeout(60000),
    });

    if (response.status === 402) {
      // x402 Payment Required — extract payment details
      const paymentDetails = await response.json();
      return { result: paymentDetails, status: 402 };
    }

    const result = await response.json();
    return { result, status: response.status };
  }
}
