import { NextRequest } from 'next/server';

// In-memory state (in production, use a database)
const agentState = {
  agents: [
    { id: 'research-agent-a', type: 'research', earnings: 12.50, reputation: 420, tier: 'Trusted', completedTasks: 47, currentPrice: 0.55, walletAddress: '0xRA1' },
    { id: 'writer-agent-a', type: 'writing', earnings: 8.30, reputation: 380, tier: 'Established', completedTasks: 35, currentPrice: 0.35, walletAddress: '0xWA1' },
    { id: 'writer-agent-b', type: 'writing', earnings: 3.10, reputation: 290, tier: 'Growing', completedTasks: 18, currentPrice: 0.25, walletAddress: '0xWB1' },
    { id: 'external-api', type: 'external_api', earnings: 1.80, reputation: 450, tier: 'Trusted', completedTasks: 22, currentPrice: 0.10, walletAddress: '0xEA1' },
  ],
  metrics: {
    giniCoefficient: 0.38,
    marketEfficiency: 0.72,
    explorationRate: 0.18,
    priceVolatility24h: 14.2,
    totalTransactions: 122,
    totalVolume: 25.70,
    activeAgents: 4,
  },
  trustEvents: [
    { agent: 'writer-agent-a', oldTier: 'Growing', newTier: 'Established', budgetChange: '$10 → $20', timestamp: Date.now() - 86400000 },
    { agent: 'research-agent-a', oldTier: 'Established', newTier: 'Trusted', budgetChange: '$20 → $50', timestamp: Date.now() - 43200000 },
  ],
  banditArms: new Map<string, { alpha: number; beta: number }>([
    ['research-agent-a', { alpha: 22, beta: 4 }],
    ['writer-agent-a', { alpha: 16, beta: 5 }],
    ['writer-agent-b', { alpha: 6, beta: 7 }],
    ['external-api', { alpha: 18, beta: 2 }],
  ]),
};

// Beta distribution sampling
function betaSample(alpha: number, beta: number): number {
  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  return x / (x + y);
}

function gammaSample(shape: number): number {
  if (shape < 1) return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
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

// Dynamic pricing
function generateQuote(agent: typeof agentState.agents[0], complexity: number) {
  const basePrice = agent.type === 'research' ? 0.40 : agent.type === 'writing' ? 0.30 : 0.10;
  const load = Math.floor(Math.random() * 3);
  const loadMultiplier = 1 + load * 0.15;
  const reputationMultiplier = 0.8 + (agent.reputation / 500) * 0.4;
  const complexityMultiplier = 0.5 + complexity * 0.3;
  const price = Math.round(basePrice * loadMultiplier * reputationMultiplier * complexityMultiplier * 100) / 100;
  const estimatedLatency = Math.round((3000 + complexity * 2000 + load * 1500) * (1 / reputationMultiplier));
  return { price, estimatedLatency, confidence: agent.reputation / 500, load };
}

// Thompson Sampling selection
function selectAgent(candidates: { id: string; price: number; estimatedLatency: number; confidence: number }[], budget: number, deadline: number) {
  const eligible = candidates.filter(c => c.price <= budget && c.estimatedLatency <= deadline * 1000);
  if (eligible.length === 0) return null;

  let bestScore = -Infinity;
  let selected = eligible[0];
  let bestSample = 0;
  const allSamples: { agentId: string; sample: number; score: number }[] = [];

  // Anti-monopoly: check Gini
  const explorationBoost = agentState.metrics.giniCoefficient > 0.5 ? 1.5 : 1.0;

  for (const c of eligible) {
    const arm = agentState.banditArms.get(c.id) || { alpha: 1, beta: 1 };
    const qualitySample = betaSample(arm.alpha, arm.beta);
    const expBonus = explorationBoost / Math.sqrt(arm.alpha + arm.beta);
    const score = (qualitySample + expBonus * 0.1) / c.price;
    allSamples.push({ agentId: c.id, sample: qualitySample, score });
    if (score > bestScore) {
      bestScore = score;
      selected = c;
      bestSample = qualitySample;
    }
  }

  const arm = agentState.banditArms.get(selected.id) || { alpha: 1, beta: 1 };
  const explorationBonusVal = explorationBoost / Math.sqrt(arm.alpha + arm.beta);

  return {
    selected,
    qualitySample: bestSample,
    explorationBonus: explorationBonusVal,
    isExploration: explorationBonusVal > 0.3,
    allSamples,
  };
}

// Gini coefficient
function calculateGini(earnings: number[]): number {
  if (earnings.length === 0) return 0;
  const sorted = [...earnings].sort((a, b) => a - b);
  const n = sorted.length;
  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j]);
    }
  }
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  return Math.round((sumDiff / (2 * n * n * mean)) * 1000) / 1000;
}

// Reputation tiers
function calculateTier(score: number): { label: string; dailyBudget: string; perTxLimit: string } {
  if (score >= 400) return { label: 'Trusted', dailyBudget: '50', perTxLimit: '10.00' };
  if (score >= 300) return { label: 'Established', dailyBudget: '20', perTxLimit: '5.00' };
  if (score >= 200) return { label: 'Growing', dailyBudget: '10', perTxLimit: '2.00' };
  return { label: 'New', dailyBudget: '3', perTxLimit: '0.50' };
}

// Task decomposition templates
function decomposeTask(task: string): { subtasks: { id: string; type: string; description: string }[]; reasoning: string } {
  const lower = task.toLowerCase();
  if (lower.includes('compare') || lower.includes('vs') || lower.includes('competitor')) {
    return {
      subtasks: [
        { id: 'subtask-1', type: 'research', description: `Collect data: features, TVL, team, funding for relevant projects related to: ${task}` },
        { id: 'subtask-2', type: 'external_api', description: 'Get latest network activity and pricing data from external sources' },
        { id: 'subtask-3', type: 'writing', description: 'Synthesize into competitive analysis with comparison table + SWOT' },
      ],
      reasoning: 'Competitive analysis requires data collection, external data enrichment, then synthesis into structured report.',
    };
  }
  if (lower.includes('yield') || lower.includes('defi')) {
    return {
      subtasks: [
        { id: 'subtask-1', type: 'research', description: `Research DeFi protocols and yield data for: ${task}` },
        { id: 'subtask-2', type: 'external_api', description: 'Fetch real-time yield rates and TVL from external APIs' },
        { id: 'subtask-3', type: 'writing', description: 'Create yield comparison report with risk analysis' },
      ],
      reasoning: 'Yield analysis needs protocol research, real-time data, and risk-adjusted comparison.',
    };
  }
  return {
    subtasks: [
      { id: 'subtask-1', type: 'research', description: `Research and gather data for: ${task}` },
      { id: 'subtask-2', type: 'writing', description: `Synthesize research into a structured report for: ${task}` },
    ],
    reasoning: 'General analysis: research phase followed by synthesis.',
  };
}

// Generate mock task result content
function generateReportContent(task: string): string {
  const lower = task.toLowerCase();
  if (lower.includes('kite') && (lower.includes('competitor') || lower.includes('compare'))) {
    return kiteCompetitiveReport();
  }
  if (lower.includes('yield') || lower.includes('defi')) {
    return defiYieldReport();
  }
  return genericReport(task);
}

function kiteCompetitiveReport(): string {
  return [
    '## Kite AI Competitive Analysis',
    '',
    '### Executive Summary',
    'Kite AI occupies a unique position in the AI blockchain landscape as the first chain purpose-built for AI agent economies. While competitors focus on inference or data, Kite focuses on the economic layer — payments, identity, and trust.',
    '',
    '### Comparison Table',
    '| Feature | Kite AI | Bittensor | Ritual | Fetch.ai |',
    '|---------|---------|-----------|--------|----------|',
    '| Primary Focus | Agent Economy | Decentralized Inference | AI Compute | Autonomous Agents |',
    '| Payment Protocol | x402 (HTTP-native) | TAO staking | None | FET token |',
    '| Agent Identity | Passport + AA Wallet | None | None | Basic |',
    '| Spending Controls | Programmable AA Rules | None | None | None |',
    '| TPS | 10,000+ | ~200 | N/A | ~5,000 |',
    '| Settlement | Instant (gasless) | ~12s | N/A | ~5s |',
    '| Service Discovery | ksearch (native) | None | None | Almanac |',
    '',
    '### SWOT Analysis',
    '**Strengths:**',
    '- Only chain with native agent-to-agent payment (x402)',
    '- Programmable spending controls via AA SDK',
    '- Gasless transactions reduce friction',
    '- Agent Passport provides verifiable identity',
    '',
    '**Weaknesses:**',
    '- Early-stage ecosystem with limited agent diversity',
    '- Smaller developer community than established chains',
    '- Dependency on USDC for settlement',
    '',
    '**Opportunities:**',
    '- AI agent market projected to reach $65B by 2028',
    '- No direct competitor in "agent economy" niche',
    '- Cross-chain expansion via LayerZero possible',
    '',
    '**Threats:**',
    '- Ethereum L2s could add agent payment features',
    '- Competing L1s (Fetch, Bittensor) expanding scope',
    '- Regulatory uncertainty around autonomous agent payments',
    '',
    '### Key Insights',
    '1. Kite\'s x402 protocol is a genuine innovation — HTTP-native payments eliminate integration complexity',
    '2. The combination of Passport + AA SDK + Attestation creates a trust stack no competitor offers',
    '3. First-mover advantage in agent economy infrastructure is significant',
  ].join('\n');
}

function defiYieldReport(): string {
  return [
    '## DeFi Yield Comparison Report',
    '',
    '### Executive Summary',
    'Cross-protocol yield analysis reveals significant dispersion across DeFi platforms, with risk-adjusted returns varying by 3-5x.',
    '',
    '### Yield Comparison Table',
    '| Protocol | Chain | Stablecoin APY | Risk Level | TVL |',
    '|----------|-------|---------------|------------|-----|',
    '| Aave V3 | Ethereum | 4.2% | Low | $12.8B |',
    '| Compound V3 | Ethereum | 3.8% | Low | $3.2B |',
    '| Morpho | Ethereum | 5.1% | Medium | $2.1B |',
    '| Kamino | Solana | 6.8% | Medium | $1.8B |',
    '| Aerodrome | Base | 8.2% | Medium-High | $890M |',
    '',
    '### Risk Analysis',
    '- **Smart Contract Risk:** Aave/Compound lowest due to extensive audits and battle-testing',
    '- **Liquidity Risk:** Smaller protocols (Kamino, Aerodrome) have higher withdrawal risk during stress',
    '- **Rate Volatility:** Higher yields correlate with higher rate volatility (r=0.78)',
    '',
    '### Recommendations',
    '1. Conservative: Aave V3 USDC supply (4.2%, minimal risk)',
    '2. Balanced: Morpho optimizer on top of Aave (5.1%, moderate risk)',
    '3. Aggressive: Aerodrome LP positions (8.2%+, higher risk)',
  ].join('\n');
}

function genericReport(task: string): string {
  return [
    `## Analysis Report: ${task}`,
    '',
    '### Executive Summary',
    'Based on comprehensive research and multi-source data analysis, here are the key findings.',
    '',
    '### Key Findings',
    '- **Finding 1:** Market analysis indicates strong growth potential in the target sector',
    '- **Finding 2:** Competitive landscape shows clear differentiation opportunities',
    '- **Finding 3:** Technical infrastructure supports scalability requirements',
    '- **Finding 4:** Regulatory environment is evolving but manageable',
    '',
    '### Data Summary',
    '| Metric | Current | 30d Change | Trend |',
    '|--------|---------|------------|-------|',
    '| Market Size | $24.5B | +8.2% | Expanding |',
    '| Active Users | 1.2M | +15.3% | Growing |',
    '| Developer Activity | 3,400 repos | +22.1% | Accelerating |',
    '',
    '### Recommendations',
    '1. Prioritize first-mover sectors with lower competition',
    '2. Focus on developer experience to drive adoption',
    '3. Build strategic partnerships for ecosystem growth',
  ].join('\n');
}

export async function POST(request: NextRequest) {
  const { task } = await request.json();

  if (!task) {
    return new Response(JSON.stringify({ error: 'Task is required' }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Step 1: Task Decomposition
        send('log', { type: 'decomposition', message: `Decomposing task: "${task}"` });
        await delay(600);

        const decomposition = decomposeTask(task);
        send('log', { type: 'decomposition', message: `Strategy: ${decomposition.reasoning}` });
        await delay(400);

        for (const st of decomposition.subtasks) {
          send('log', { type: 'decomposition', message: `${st.id} → ${st.type}: ${st.description}` });
          await delay(300);
        }

        // Step 2: RFQ Broadcast (via ksearch discovery simulation)
        send('log', { type: 'rfq', message: 'Discovering agents via ksearch catalog...' });
        await delay(500);
        send('log', { type: 'rfq', message: `Found ${agentState.agents.length} registered agents in Kite service catalog` });
        await delay(300);
        send('log', { type: 'rfq', message: 'Broadcasting RFQ to all eligible agents...' });
        await delay(400);

        // Generate real quotes using dynamic pricing
        const quotes: { agentId: string; type: string; price: number; estimatedLatency: number; confidence: number }[] = [];
        const complexity = 2 + Math.floor(Math.random() * 3);

        for (const agent of agentState.agents) {
          const quote = generateQuote(agent, complexity);
          quotes.push({ agentId: agent.id, type: agent.type, ...quote });
          send('log', {
            type: 'rfq',
            message: `${agent.id} quotes $${quote.price.toFixed(2)} (latency: ${(quote.estimatedLatency / 1000).toFixed(1)}s, confidence: ${quote.confidence.toFixed(2)}, load: ${quote.load})`,
            agentId: agent.id,
          });
          await delay(250);
        }

        // Step 3: Thompson Sampling selection for each subtask type
        const payments: { from: string; to: string; amount: number; timestamp: number }[] = [];
        const costBreakdown: { agentId: string; cost: number }[] = [];

        for (const subtask of decomposition.subtasks) {
          const candidates = quotes
            .filter(q => q.type === subtask.type)
            .map(q => ({ id: q.agentId, price: q.price, estimatedLatency: q.estimatedLatency, confidence: q.confidence }));

          if (candidates.length === 0) continue;

          const result = selectAgent(candidates, 5.0, 30);
          if (!result) continue;

          const mode = result.isExploration ? 'EXPLORATION' : 'EXPLOITATION';
          const otherCandidates = result.allSamples
            .filter(s => s.agentId !== result.selected.id)
            .map(s => `${s.agentId}: sampled=${s.sample.toFixed(3)}, score=${s.score.toFixed(3)}`)
            .join('; ');

          send('log', {
            type: 'selection',
            message: `[${mode}] ${subtask.id} → ${result.selected.id} selected — sampled quality ${result.qualitySample.toFixed(3)}, price $${result.selected.price.toFixed(2)}, exploration bonus ${result.explorationBonus.toFixed(3)}`,
            agentId: result.selected.id,
          });

          if (otherCandidates) {
            send('log', {
              type: 'selection',
              message: `  Rejected alternatives: ${otherCandidates}`,
            });
          }

          // LLM-style explanation
          const explanation = result.isExploration
            ? `${result.selected.id} has high uncertainty (bonus ${result.explorationBonus.toFixed(3)}). Thompson Sampling favors exploration to reduce uncertainty about this agent's true quality.`
            : `${result.selected.id} has a proven track record. Sampled quality ${result.qualitySample.toFixed(3)} at $${result.selected.price.toFixed(2)} offers the best risk-adjusted value per dollar.`;
          send('log', { type: 'selection', message: `  Reasoning: "${explanation}"` });
          await delay(400);

          // Step 4: x402 Payment
          send('log', {
            type: 'payment',
            message: `x402 payment $${result.selected.price.toFixed(2)} → ${result.selected.id} (EIP-3009 gasless transfer via Kite facilitator)`,
            agentId: result.selected.id,
          });

          payments.push({
            from: 'coordinator',
            to: result.selected.id,
            amount: result.selected.price,
            timestamp: Date.now(),
          });

          costBreakdown.push({ agentId: result.selected.id, cost: result.selected.price });

          send('payment', {
            from: 'coordinator',
            to: result.selected.id,
            amount: result.selected.price,
          });

          // Simulate agent execution time
          await delay(1200 + Math.random() * 800);

          send('log', {
            type: 'payment',
            message: `${result.selected.id} completed ${subtask.id} — result received`,
            agentId: result.selected.id,
          });
          await delay(200);
        }

        // Step 5: Quality evaluation & attestation
        await emitAttestation(send, costBreakdown, task);

        send('done', { taskId: taskId });
      } catch (error) {
        send('error', { message: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function emitAttestation(
  send: (event: string, data: any) => void,
  costBreakdown: { agentId: string; cost: number }[],
  task: string,
) {
  const qualityScore = 3 + Math.floor(Math.random() * 3); // 3-5
  const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const reasoningCID = 'Qm' + Array.from({ length: 44 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  send('log', { type: 'attestation', message: `Quality evaluation: ${qualityScore}/5` });
  await delay(300);
  send('log', { type: 'attestation', message: `Reasoning CID: ${reasoningCID}` });
  send('log', { type: 'attestation', message: `Writing attestation to Kite chain...` });
  await delay(800);
  send('log', { type: 'attestation', message: `Attestation created on-chain — Tx: ${txHash.slice(0, 18)}...${txHash.slice(-8)}` });
  await delay(200);

  // Update bandit arms
  for (const item of costBreakdown) {
    const arm = agentState.banditArms.get(item.agentId);
    if (arm) {
      if (qualityScore >= 4) arm.alpha += 1;
      else arm.beta += 1;
    }
  }

  // Update agent stats
  const totalCost = costBreakdown.reduce((sum, c) => sum + c.cost, 0);
  for (const item of costBreakdown) {
    const agent = agentState.agents.find(a => a.id === item.agentId);
    if (agent) {
      agent.earnings += item.cost;
      agent.completedTasks += 1;
      // Update reputation (Bayesian)
      const oldRep = agent.reputation;
      agent.reputation = Math.round((oldRep * agent.completedTasks + qualityScore * 100) / (agent.completedTasks + 1));
      const newTier = calculateTier(agent.reputation);
      if (newTier.label !== agent.tier) {
        const oldTier = agent.tier;
        agent.tier = newTier.label;
        const oldBudget = calculateTier(oldRep).dailyBudget;
        const trustEvent = {
          agent: agent.id,
          oldTier,
          newTier: newTier.label,
          budgetChange: `$${oldBudget} → $${newTier.dailyBudget}`,
          timestamp: Date.now(),
        };
        agentState.trustEvents.push(trustEvent);
        send('trust_lifecycle', trustEvent);
        send('log', { type: 'attestation', message: `Trust lifecycle: ${agent.id} promoted ${oldTier} → ${newTier.label} (budget: ${trustEvent.budgetChange})` });
      }
    }
  }

  // Update economy metrics
  const earnings = agentState.agents.map(a => a.earnings);
  agentState.metrics.totalTransactions += costBreakdown.length;
  agentState.metrics.totalVolume += totalCost;
  agentState.metrics.giniCoefficient = calculateGini(earnings);
  agentState.metrics.activeAgents = agentState.agents.length;

  // Check anti-monopoly
  if (agentState.metrics.giniCoefficient > 0.5) {
    send('log', { type: 'attestation', message: `⚠ Anti-monopoly: Gini ${agentState.metrics.giniCoefficient.toFixed(3)} > 0.5 — exploration boost active` });
  }

  // Generate report content
  const content = generateReportContent(task);

  // Send final result
  send('result', {
    taskId,
    content,
    qualityScore,
    costBreakdown,
    totalCost,
    attestationTxHash: txHash,
    reasoningCID,
    completedAt: new Date().toISOString(),
  });

  // Send updated state
  send('state_update', {
    agents: agentState.agents,
    metrics: agentState.metrics,
    trustEvents: agentState.trustEvents.slice(-10),
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
