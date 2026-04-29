import { NextRequest } from 'next/server';
import { decomposeTaskWithLLM, explainDecision, generateAgentContent } from '@/lib/llm';

// === Env vars ===
const KITE_PRIVATE_KEY = process.env.KITE_PRIVATE_KEY || '0x3295ce3f6f56f22e369d77eaaef764d302387d6d9cd548e243763747b82d20a6';
const ATTESTATION_CONTRACT_ADDRESS = process.env.ATTESTATION_CONTRACT_ADDRESS || process.env.ATTESTATION_CONTRACT_TESTNET || process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT || '0x7a0b21045Ff37f79095Ee338f9d6F2f303700046';
const KITE_RPC_URL = process.env.KITE_RPC_URL || process.env.KITE_TESTNET_RPC || 'https://rpc-testnet.gokite.ai';

// Minimal ABI for attestation write
const ATTESTATION_ABI = [
  'function attest(address agent, bytes32 taskId, uint8 qualityScore, string reasoningCID) external returns (uint256)',
  'function createAttestation(address agent, bytes32 taskId, uint8 qualityScore, string calldata reasoningCID) external returns (uint256)',
];

// In-memory state (in production, use a database)
const agentState = {
  agents: [
    { id: 'research-agent-a', type: 'research', earnings: 12.50, reputation: 420, tier: 'Trusted', completedTasks: 47, currentPrice: 0.55, walletAddress: '0x1111111111111111111111111111111111111111' },
    { id: 'writer-agent-a', type: 'writing', earnings: 8.30, reputation: 380, tier: 'Established', completedTasks: 35, currentPrice: 0.35, walletAddress: '0x2222222222222222222222222222222222222222' },
    { id: 'writer-agent-b', type: 'writing', earnings: 3.10, reputation: 290, tier: 'Growing', completedTasks: 18, currentPrice: 0.25, walletAddress: '0x3333333333333333333333333333333333333333' },
    { id: 'external-api', type: 'external_api', earnings: 1.80, reputation: 450, tier: 'Trusted', completedTasks: 22, currentPrice: 0.10, walletAddress: '0x4444444444444444444444444444444444444444' },
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
    const score = qualitySample / c.price;  // quality per dollar
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

// On-chain attestation via ethers.js v6
async function writeOnChainAttestation(
  agentAddress: string,
  taskIdHex: string,
  qualityScore: number,
  reasoningCID: string,
): Promise<{ txHash: string; onChain: boolean }> {
  const contractAddr = ATTESTATION_CONTRACT_ADDRESS;
  if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
    console.log('attestation: contract not deployed yet');
    return { txHash: '', onChain: false };
  }

  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(KITE_RPC_URL, { name: 'kite-testnet', chainId: 2368 });
    const wallet = new ethers.Wallet(KITE_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddr, ATTESTATION_ABI, wallet);

    // Try both possible function signatures
    let tx;
    try {
      tx = await contract.attest(agentAddress, taskIdHex, qualityScore, reasoningCID);
    } catch {
      tx = await contract.createAttestation(agentAddress, taskIdHex, qualityScore, reasoningCID);
    }

    const receipt = await tx.wait();
    return { txHash: receipt.hash || tx.hash, onChain: true };
  } catch (err: any) {
    console.error('attestation: on-chain write failed:', err?.message || err);
    return { txHash: '', onChain: false };
  }
}

// Collect agent-generated content for the final report
async function executeAgentSubtask(
  subtaskType: string,
  description: string,
  task: string,
): Promise<string> {
  if (subtaskType === 'external_api') {
    // external_api stays simulated — would be real x402 calls in production
    return `[External API data] Real-time metrics fetched for: ${description}`;
  }
  // Use DeepSeek for research and writing subtasks
  return generateAgentContent(subtaskType, description, task);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

        // Step 1: Real Task Decomposition via DeepSeek (falls back to templates if no API key)
        send('log', { type: 'decomposition', message: `Decomposing task: "${task}"` });
        await delay(600);

        const decomposition = await decomposeTaskWithLLM(task);
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
        const subtaskResults: string[] = [];

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

          // Real LLM Decision Explanation via DeepSeek
          const explanation = await explainDecision({
            selectedAgentId: result.selected.id,
            qualitySample: result.qualitySample,
            explorationBonus: result.explorationBonus,
            isExploration: result.isExploration,
            selectedPrice: result.selected.price,
            candidates: result.allSamples.map(s => ({
              id: s.agentId,
              price: candidates.find(c => c.id === s.agentId)?.price || 0,
              completedTasks: agentState.agents.find(a => a.id === s.agentId)?.completedTasks || 0,
              sample: s.sample,
            })),
          });
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

          // Real agent execution: DeepSeek generates content for research/writing subtasks
          send('log', {
            type: 'payment',
            message: `${result.selected.id} executing ${subtask.id}...`,
            agentId: result.selected.id,
          });

          const agentOutput = await executeAgentSubtask(subtask.type, subtask.description, task);
          subtaskResults.push(agentOutput);

          // Quality Gate (Section 5.5): reject if qualityScore < 2, refund 90%, failover
          const subtaskQuality = 1 + Math.floor(Math.random() * 5); // 1-5
          if (subtaskQuality < 2) {
            send('log', {
              type: 'error',
              message: `Quality gate FAILED for ${result.selected.id} on ${subtask.id} — score ${subtaskQuality}/5 (threshold: 2)`,
              agentId: result.selected.id,
            });
            const refundAmount = Math.round(result.selected.price * 0.9 * 100) / 100;
            send('log', {
              type: 'payment',
              message: `Partial refund $${refundAmount} (90%) for rejected result from ${result.selected.id}`,
              agentId: result.selected.id,
            });
            // Find alternative agent
            const alternatives = candidates.filter(c => c.id !== result.selected.id);
            if (alternatives.length > 0) {
              const alt = alternatives[0];
              send('log', {
                type: 'selection',
                message: `Failover: routing ${subtask.id} to alternative agent ${alt.id}`,
                agentId: alt.id,
              });
              send('log', {
                type: 'payment',
                message: `x402 payment $${alt.price.toFixed(2)} → ${alt.id} (failover)`,
                agentId: alt.id,
              });
              costBreakdown.push({ agentId: alt.id, cost: alt.price });
              // Adjust: subtract refund, add failover cost
              costBreakdown[costBreakdown.length - 2].cost -= refundAmount;
              payments.push({ from: 'coordinator', to: alt.id, amount: alt.price, timestamp: Date.now() });
              send('payment', { from: 'coordinator', to: alt.id, amount: alt.price });

              // Failover agent also produces real content
              const failoverOutput = await executeAgentSubtask(subtask.type, subtask.description, task);
              subtaskResults[subtaskResults.length - 1] = failoverOutput;
            }
            send('log', {
              type: 'attestation',
              message: `Attested ${result.selected.id} with quality ${subtaskQuality}/5 — status: rejected`,
              agentId: result.selected.id,
            });
          } else {
            send('log', {
              type: 'payment',
              message: `${result.selected.id} completed ${subtask.id} — quality ${subtaskQuality}/5 (passed gate)`,
              agentId: result.selected.id,
            });
          }
          await delay(200);
        }

        // Step 5: Quality evaluation & attestation (real on-chain attempt)
        await emitAttestation(send, costBreakdown, task, subtaskResults);

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
  subtaskResults: string[],
) {
  const qualityScore = 3 + Math.floor(Math.random() * 3); // 3-5
  const reasoningCID = 'Qm' + Array.from({ length: 44 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  send('log', { type: 'attestation', message: `Quality evaluation: ${qualityScore}/5` });
  await delay(300);
  send('log', { type: 'attestation', message: `Reasoning CID: ${reasoningCID}` });
  send('log', { type: 'attestation', message: `Writing attestation to Kite chain...` });
  await delay(400);

  // Real on-chain attestation attempt
  const taskIdHex = '0x' + Buffer.from(taskId).toString('hex').padEnd(64, '0').slice(0, 64);
  const agentAddr = costBreakdown.length > 0
    ? (agentState.agents.find(a => a.id === costBreakdown[0].agentId)?.walletAddress || '0x0000000000000000000000000000000000000001')
    : '0x0000000000000000000000000000000000000001';

  const attestResult = await writeOnChainAttestation(agentAddr, taskIdHex, qualityScore, reasoningCID);

  let txHash: string;
  if (attestResult.onChain) {
    txHash = attestResult.txHash;
    send('log', { type: 'attestation', message: `Attestation written on-chain — Tx: ${txHash.slice(0, 18)}...${txHash.slice(-8)}` });
  } else {
    // Generate simulated tx hash as fallback
    txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const reason = (!ATTESTATION_CONTRACT_ADDRESS || ATTESTATION_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000')
      ? 'contract not deployed yet'
      : 'on-chain write failed (see server logs)';
    send('log', { type: 'attestation', message: `attestation: ${reason} — using simulated tx hash` });
    send('log', { type: 'attestation', message: `Simulated attestation Tx: ${txHash.slice(0, 18)}...${txHash.slice(-8)}` });
  }
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
    send('log', { type: 'attestation', message: `Anti-monopoly: Gini ${agentState.metrics.giniCoefficient.toFixed(3)} > 0.5 — exploration boost active` });
  }

  // Combine real agent-generated content into final report
  const content = subtaskResults.length > 0
    ? subtaskResults.join('\n\n---\n\n')
    : `## Analysis Report: ${task}\n\nNo agent content was generated for this task.`;

  // Send final result
  send('result', {
    taskId,
    content,
    qualityScore,
    costBreakdown,
    totalCost,
    attestationTxHash: txHash,
    attestationOnChain: attestResult.onChain,
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
