// 72-hour economy simulation — generates realistic activity for Demo Day
// Run: npx ts-node scripts/simulate-economy.ts

import { AgentBandit } from '../agents/coordinator/bandit';
import { PricingEngine } from '../agents/worker-template/pricing-engine';
import { EconomyHealthMonitor } from '../keeper/economy-health';
import { calculateTier } from '../keeper/reputation-sync';

const TASK_TEMPLATES = [
  'Analyze the TVL trends of top 5 Solana DeFi protocols',
  'Compare gas costs between Ethereum L2s this week',
  'Summarize the latest Kite AI ecosystem developments',
  'Research the current state of AI agent frameworks',
  'What are the trending narratives in crypto this month',
  'Give me a one-paragraph summary of Bitcoin price action today',
  'Create a comprehensive report on RWA tokenization with data from 5 sources',
  'Analyze how Kite AI compares to other AI payment blockchains',
  'Compare DeFi yields across top protocols',
  'Research the latest developments in Layer 2 scaling solutions',
];

const AGENTS = [
  { id: 'research-agent-a', type: 'research', basePrice: 0.40, quality: 0.85 },
  { id: 'writer-agent-a', type: 'writing', basePrice: 0.30, quality: 0.80 },
  { id: 'writer-agent-b', type: 'writing', basePrice: 0.25, quality: 0.70 },
  { id: 'external-api', type: 'external_api', basePrice: 0.10, quality: 0.90 },
];

const SCHEDULE = [
  { hours: [9, 10, 11, 12, 13, 14, 15, 16, 17], intervalMinutes: 8 },
  { hours: [18, 19, 20, 21, 22], intervalMinutes: 20 },
  { hours: [23, 0, 1, 2, 3, 4, 5, 6, 7, 8], intervalMinutes: 45 },
];

const CHAOS_EVENTS = [
  { type: 'agent_slow', probability: 0.05 },
  { type: 'quality_drop', probability: 0.08 },
  { type: 'surge_demand', probability: 0.03 },
  { type: 'new_agent', probability: 0.02 },
];

interface SimulationStats {
  totalTasks: number;
  totalVolume: number;
  agentEarnings: Record<string, number>;
  agentReputations: Record<string, number>;
  giniHistory: number[];
  priceHistory: Record<string, number[]>;
  chaosEvents: string[];
}

async function simulate(durationHours: number = 72): Promise<SimulationStats> {
  console.log(`\n🐝 KiteHive Economy Simulation — ${durationHours}h\n`);

  const bandit = new AgentBandit();
  const monitor = new EconomyHealthMonitor();
  const pricingEngines: Map<string, PricingEngine> = new Map();

  // Initialize agents
  for (const agent of AGENTS) {
    bandit.addAgent(agent.id);
    pricingEngines.set(
      agent.id,
      new PricingEngine({ basePrice: agent.basePrice, maxPrice: 2.0, minPrice: 0.05 })
    );
  }

  const stats: SimulationStats = {
    totalTasks: 0,
    totalVolume: 0,
    agentEarnings: {},
    agentReputations: {},
    giniHistory: [],
    priceHistory: {},
    chaosEvents: [],
  };

  for (const agent of AGENTS) {
    stats.agentEarnings[agent.id] = 0;
    stats.agentReputations[agent.id] = 250;
    stats.priceHistory[agent.id] = [];
  }

  monitor.onEvent((event) => {
    console.log(`  [Economy] ${event.type}: ${event.message}`);
  });

  // Simulate each hour
  let taskNumber = 0;
  for (let hour = 0; hour < durationHours; hour++) {
    const currentHour = hour % 24;
    const schedule = SCHEDULE.find((s) => s.hours.includes(currentHour));
    const tasksThisHour = Math.floor(60 / (schedule?.intervalMinutes || 30));

    for (let t = 0; t < tasksThisHour; t++) {
      taskNumber++;

      // Check chaos events
      for (const chaos of CHAOS_EVENTS) {
        if (Math.random() < chaos.probability) {
          stats.chaosEvents.push(`Hour ${hour}: ${chaos.type}`);
          if (chaos.type === 'quality_drop') {
            const randomAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
            const engine = pricingEngines.get(randomAgent.id)!;
            engine.setReputation(Math.max(100, stats.agentReputations[randomAgent.id] - 50));
          }
        }
      }

      // Generate task
      const task = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)];
      const complexity = 1 + Math.floor(Math.random() * 5);

      // Get quotes
      const candidates = AGENTS.map((agent) => {
        const engine = pricingEngines.get(agent.id)!;
        engine.setLoad(Math.floor(Math.random() * 3));
        const quote = engine.generateQuote(complexity);
        stats.priceHistory[agent.id].push(quote.price);
        return {
          id: agent.id,
          quote: { price: quote.price, estimatedLatency: quote.estimatedLatency, confidence: quote.confidence },
          completedTasks: stats.totalTasks,
        };
      });

      // Apply anti-monopoly boost
      bandit.setExplorationBoost(monitor.getExplorationBoost());

      // Select agent
      const result = bandit.selectAgent(candidates, 5.0, 30);
      if (!result) continue;

      // Simulate quality
      const agentConfig = AGENTS.find((a) => a.id === result.selected.id)!;
      let quality = Math.round(agentConfig.quality * 5 + (Math.random() - 0.5) * 2);
      quality = Math.max(1, Math.min(5, quality));

      // Update systems
      bandit.update(result.selected.id, quality);
      stats.agentEarnings[result.selected.id] += result.selected.quote.price;
      stats.totalVolume += result.selected.quote.price;
      stats.totalTasks++;

      // Update reputation
      const oldRep = stats.agentReputations[result.selected.id];
      stats.agentReputations[result.selected.id] = Math.round(
        (oldRep * (stats.totalTasks - 1) + quality * 100) / stats.totalTasks
      );

      // Update pricing engine reputation
      const engine = pricingEngines.get(result.selected.id)!;
      engine.setReputation(stats.agentReputations[result.selected.id]);

      // Record transaction
      monitor.recordTransaction({
        agentId: result.selected.id,
        price: result.selected.quote.price,
        qualityScore: quality,
        timestamp: Date.now() - (durationHours - hour) * 3600000,
        isExploration: result.isExploration,
      });
    }

    // Record Gini every hour
    const metrics = monitor.getMetrics();
    stats.giniHistory.push(metrics.giniCoefficient);

    // Progress log every 6 hours
    if (hour % 6 === 0) {
      console.log(
        `  Hour ${hour}/${durationHours} | Tasks: ${stats.totalTasks} | Volume: $${stats.totalVolume.toFixed(2)} | Gini: ${metrics.giniCoefficient.toFixed(3)} | Exploration: ${(metrics.explorationRate * 100).toFixed(1)}%`
      );
    }
  }

  // Final summary
  console.log('\n=== Simulation Complete ===');
  console.log(`Total tasks: ${stats.totalTasks}`);
  console.log(`Total volume: $${stats.totalVolume.toFixed(2)}`);
  console.log(`Final Gini: ${stats.giniHistory[stats.giniHistory.length - 1]?.toFixed(3)}`);
  console.log('\nAgent Earnings:');
  for (const [agentId, earnings] of Object.entries(stats.agentEarnings)) {
    const rep = stats.agentReputations[agentId];
    const tier = calculateTier(rep);
    console.log(`  ${agentId}: $${earnings.toFixed(2)} | Rep: ${rep} (${tier.label})`);
  }
  console.log(`\nChaos events: ${stats.chaosEvents.length}`);
  stats.chaosEvents.forEach((e) => console.log(`  ${e}`));

  return stats;
}

// Run simulation
simulate(72).catch(console.error);
