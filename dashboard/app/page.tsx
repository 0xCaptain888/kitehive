'use client';

import { useState, useCallback, useRef } from 'react';
import { EconomyGraph } from '@/components/EconomyGraph';
import { NegotiationLog } from '@/components/NegotiationLog';
import { AgentLeaderboard } from '@/components/AgentLeaderboard';
import { EconomyHealth } from '@/components/EconomyHealth';
import { TrustLifecycle } from '@/components/TrustLifecycle';
import { TaskInput } from '@/components/TaskInput';
import { TaskOutput } from '@/components/TaskOutput';
import { UserFeedback } from '@/components/UserFeedback';

// --- Types ---
interface Agent {
  id: string;
  type: string;
  earnings: number;
  reputation: number;
  tier: string;
  completedTasks: number;
  currentPrice: number;
}

interface NegotiationEntry {
  id: string;
  timestamp: number;
  type: 'decomposition' | 'rfq' | 'selection' | 'payment' | 'attestation' | 'error';
  message: string;
  agentId?: string;
}

interface TaskResult {
  taskId: string;
  content: string;
  qualityScore: number;
  costBreakdown: { agentId: string; cost: number }[];
  totalCost: number;
  attestationTxHash: string;
  completedAt: string;
}

interface EconomyMetrics {
  giniCoefficient: number;
  marketEfficiency: number;
  explorationRate: number;
  priceVolatility24h: number;
  totalTransactions: number;
  totalVolume: number;
  activeAgents: number;
  coordinatorAccuracy?: { percentage: number; total: number; withinThreshold: number };
}

interface TrustEvent {
  agent: string;
  oldTier: string;
  newTier: string;
  budgetChange: string;
  timestamp: number;
}

interface Payment {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
}

// --- Demo Data ---
const DEMO_AGENTS: Agent[] = [
  { id: 'research-agent-a', type: 'research', earnings: 12.5, reputation: 420, tier: 'Trusted', completedTasks: 47, currentPrice: 0.55 },
  { id: 'writer-agent-a', type: 'writing', earnings: 8.3, reputation: 380, tier: 'Established', completedTasks: 35, currentPrice: 0.35 },
  { id: 'writer-agent-b', type: 'writing', earnings: 3.1, reputation: 290, tier: 'Growing', completedTasks: 18, currentPrice: 0.25 },
  { id: 'external-api', type: 'external_api', earnings: 1.8, reputation: 450, tier: 'Trusted', completedTasks: 22, currentPrice: 0.10 },
];

const DEMO_METRICS: EconomyMetrics = {
  giniCoefficient: 0.38,
  marketEfficiency: 0.72,
  explorationRate: 0.18,
  priceVolatility24h: 14.2,
  totalTransactions: 122,
  totalVolume: 25.7,
  activeAgents: 4,
  coordinatorAccuracy: { percentage: 87.2, total: 47, withinThreshold: 41 },
};

const PRESET_TASKS = [
  { label: 'Kite AI vs Competitors', description: 'Analyze how Kite AI compares to other AI payment blockchains', icon: '\u2694\uFE0F' },
  { label: 'DeFi Yield Comparison', description: 'Cross-protocol yield analysis across top DeFi platforms', icon: '\uD83D\uDCCA' },
  { label: 'L2 Chain Analysis', description: 'Layer 2 performance comparison and scaling analysis', icon: '\uD83D\uDD17' },
];

// --- Demo simulation helpers ---
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randId = () => `task-${Date.now().toString(36)}`;
const txHash = () => '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

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
    do { x = normalSample(); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function normalSample(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// --- Decomposition templates ---
function decomposeTask(task: string): { id: string; type: string; description: string }[] {
  const lower = task.toLowerCase();
  if (lower.includes('compare') || lower.includes('vs') || lower.includes('competitor')) {
    return [
      { id: 'subtask-1', type: 'research', description: `Collect data: features, TVL, team, funding for relevant projects related to: ${task}` },
      { id: 'subtask-2', type: 'external_api', description: 'Get latest network activity and pricing data from external sources' },
      { id: 'subtask-3', type: 'writing', description: 'Synthesize into competitive analysis with comparison table + SWOT' },
    ];
  }
  if (lower.includes('yield') || lower.includes('defi')) {
    return [
      { id: 'subtask-1', type: 'research', description: `Research DeFi protocols and yield data for: ${task}` },
      { id: 'subtask-2', type: 'external_api', description: 'Fetch real-time yield rates and TVL from external APIs' },
      { id: 'subtask-3', type: 'writing', description: 'Create yield comparison report with risk analysis' },
    ];
  }
  return [
    { id: 'subtask-1', type: 'research', description: `Research and gather data for: ${task}` },
    { id: 'subtask-2', type: 'external_api', description: 'Fetch real-time data from external x402 APIs' },
    { id: 'subtask-3', type: 'writing', description: `Synthesize research into a structured report for: ${task}` },
  ];
}

function buildResult(task: string): string {
  const lower = task.toLowerCase();
  if (lower.includes('competitor') || lower.includes('vs') || lower.includes('kite')) {
    return `## Competitive Analysis: Kite AI vs AI Payment Blockchains

### Overview
Kite AI is a purpose-built blockchain for AI agent economies featuring native x402 payment protocol, Agent Passport identity, and Account Abstraction SDK for gasless transactions.

### Comparison Matrix
| Feature | Kite AI | Competitors |
|---|---|---|
| Native Agent Identity | Agent Passport (passkey) | Wallet-only |
| Payment Protocol | x402 + MPP dual-protocol | Custom / REST |
| Gas Model | Gasless via EIP-3009 | Standard gas fees |
| Service Discovery | ksearch native catalog | External registries |
| Reputation | On-chain Bayesian (0-500) | Off-chain / none |
| AA SDK | Built-in spending rules | Third-party |

### SWOT Analysis
**Strengths:** Deep vertical integration, gasless UX, native service discovery
**Weaknesses:** Early-stage ecosystem, limited validator set
**Opportunities:** First-mover in AI agent economy infrastructure
**Threats:** General-purpose L2s adding AI features

### Key Insight
Kite AI's Trust Triangle (Passport + AA Rules + Attestation) creates a unique identity-constraint-proof framework that no competitor currently matches.`;
  }
  if (lower.includes('yield') || lower.includes('defi')) {
    return `## DeFi Yield Analysis — Cross-Protocol Comparison

### Current Yields (Top Protocols)
| Protocol | APY | TVL | Risk Level |
|---|---|---|---|
| Aave v3 | 4.2% | $12.1B | Low |
| Compound III | 3.8% | $3.2B | Low |
| Lido | 3.5% | $28.9B | Medium |
| Pendle | 8.7% | $4.8B | Medium |
| Ethena | 12.1% | $2.9B | High |

### Risk-Adjusted Returns
After adjusting for smart contract risk, liquidity risk, and protocol maturity, Aave v3 delivers the best Sharpe ratio among low-risk options, while Pendle offers the best risk-adjusted yield in the medium tier.

### Recommendation
Diversified allocation: 40% Aave v3, 30% Lido, 20% Pendle, 10% Ethena for balanced risk-return profile.`;
  }
  return `## Analysis Report: ${task}

### Executive Summary
Comprehensive research and analysis completed across multiple data sources. Key findings synthesized from real-time market data and historical analysis.

### Key Findings
1. **Market Position:** Strong fundamentals with growing adoption metrics
2. **Technical Architecture:** Scalable design with proven security model
3. **Growth Trajectory:** 47% month-over-month growth in active users
4. **Risk Assessment:** Moderate risk profile with strong mitigation strategies

### Methodology
Data collected via x402 agent network (3 specialized agents), cross-referenced with on-chain metrics and external API data sources. Quality score: 4/5 with full reasoning chain stored on IPFS.`;
}

// ================================================================
// Main Page Component
// ================================================================
export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(DEMO_AGENTS);
  const [metrics, setMetrics] = useState<EconomyMetrics>(DEMO_METRICS);
  const [negotiationLog, setNegotiationLog] = useState<NegotiationEntry[]>([]);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [trustEvents, setTrustEvents] = useState<TrustEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [budget] = useState(10.0);
  const [spent, setSpent] = useState(DEMO_METRICS.totalVolume);
  const [feedbackTaskId, setFeedbackTaskId] = useState<string | null>(null);
  const abortRef = useRef(false);

  const addLog = useCallback((type: NegotiationEntry['type'], message: string, agentId?: string) => {
    setNegotiationLog((prev) => [
      ...prev,
      { id: `log-${Date.now()}-${Math.random()}`, timestamp: Date.now(), type, message, agentId },
    ]);
  }, []);

  // --- Client-side demo task simulation ---
  const runTask = useCallback(async (taskDescription: string) => {
    if (isRunning) return;
    abortRef.current = false;
    setIsRunning(true);
    setTaskResult(null);
    setNegotiationLog([]);
    setPayments([]);

    const taskId = randId();

    try {
      // Phase 1: Decomposition
      addLog('decomposition', `[GPT-4o] Decomposing task: "${taskDescription}"`);
      await delay(800);
      const subtasks = decomposeTask(taskDescription);
      for (const st of subtasks) {
        if (abortRef.current) return;
        addLog('decomposition', `  Subtask ${st.id} [${st.type}]: ${st.description}`);
        await delay(400);
      }

      // Phase 2: RFQ broadcast
      addLog('rfq', `[ksearch] Discovered ${agents.length} agents in Kite catalog`);
      await delay(600);
      addLog('rfq', `[Coordinator] Broadcasting RFQ to all agents...`);
      await delay(500);

      const quotes: { agent: Agent; price: number; subtaskId: string }[] = [];
      for (const st of subtasks) {
        const eligible = agents.filter((a) => {
          if (st.type === 'research') return a.type === 'research';
          if (st.type === 'writing') return a.type === 'writing';
          if (st.type === 'external_api') return a.type === 'external_api';
          return true;
        });
        for (const ag of eligible) {
          if (abortRef.current) return;
          const load = 0.3 + Math.random() * 0.4;
          const loadMult = 1 + load * 0.15;
          const repMult = 0.8 + (ag.reputation / 500) * 0.4;
          const complexMult = 0.5 + Math.random() * 0.3;
          const price = +(ag.currentPrice * loadMult * repMult * complexMult).toFixed(4);
          quotes.push({ agent: ag, price, subtaskId: st.id });
          addLog('rfq', `  ${ag.id} quoted $${price.toFixed(4)} for ${st.id} (load=${load.toFixed(2)}, rep=${ag.reputation})`, ag.id);
          await delay(300);
        }
      }

      // Phase 3: Thompson Sampling selection
      addLog('selection', `[Thompson Sampling] Selecting agents...`);
      await delay(500);

      const selected: { agent: Agent; price: number; subtaskId: string; sample: number; isExploration: boolean }[] = [];
      for (const st of subtasks) {
        if (abortRef.current) return;
        const stQuotes = quotes.filter((q) => q.subtaskId === st.id);
        let best = stQuotes[0];
        let bestScore = -1;
        let bestSample = 0;
        let isExploration = false;

        for (const q of stQuotes) {
          const alpha = Math.max(1, Math.floor(q.agent.reputation / 50));
          const beta_param = Math.max(1, 10 - alpha);
          const sample = betaSample(alpha, beta_param);
          const score = sample / q.price;
          const explorationBonus = 1 / Math.sqrt(alpha + beta_param);
          if (score > bestScore) {
            bestScore = score;
            best = q;
            bestSample = sample;
            isExploration = explorationBonus > 0.3;
          }
        }
        selected.push({ ...best, sample: bestSample, isExploration });
        const mode = isExploration ? 'EXPLORATION' : 'EXPLOITATION';
        addLog('selection', `  [${mode}] ${st.id} → ${best.agent.id} | sampled quality=${bestSample.toFixed(3)}, price=$${best.price.toFixed(4)}, score=${bestScore.toFixed(3)}`, best.agent.id);
        await delay(400);
      }

      // Phase 4: Execution + Payment
      let totalCost = 0;
      const costBreakdown: { agentId: string; cost: number }[] = [];
      for (const sel of selected) {
        if (abortRef.current) return;
        addLog('payment', `[x402] Calling ${sel.agent.id} with X-Payment header...`, sel.agent.id);
        await delay(600);
        addLog('payment', `  Payment: $${sel.price.toFixed(4)} USDC via EIP-3009 gasless transfer`, sel.agent.id);
        setPayments((prev) => [...prev, { from: 'coordinator', to: sel.agent.id, amount: sel.price, timestamp: Date.now() }]);
        totalCost += sel.price;
        costBreakdown.push({ agentId: sel.agent.id, cost: sel.price });
        await delay(400);
        addLog('payment', `  ${sel.agent.id} completed ${sel.subtaskId} — response received`, sel.agent.id);
        await delay(300);
      }

      // Phase 5: Quality scoring + Attestation
      const qualityScore = 4 + (Math.random() > 0.5 ? 1 : 0);
      const hash = txHash();
      addLog('attestation', `[Quality Gate] Auto-score: ${qualityScore}/5 (threshold: 2)`);
      await delay(400);
      addLog('attestation', `[On-chain] Writing attestation for task ${taskId}...`);
      await delay(600);
      addLog('attestation', `  Attestation tx: ${hash.slice(0, 18)}...`);
      await delay(300);

      // Update reputation
      const updatedAgents = agents.map((a) => {
        const sel = selected.find((s) => s.agent.id === a.id);
        if (sel) {
          const newRep = Math.min(500, a.reputation + (qualityScore >= 4 ? 8 : -3));
          const newTier = newRep >= 400 ? 'Trusted' : newRep >= 300 ? 'Established' : newRep >= 200 ? 'Growing' : 'New';
          const oldTier = a.tier;
          if (newTier !== oldTier) {
            const budgets: Record<string, string> = { New: '$3/day', Growing: '$10/day', Established: '$20/day', Trusted: '$50/day' };
            setTrustEvents((prev) => [...prev, { agent: a.id, oldTier, newTier, budgetChange: `${budgets[oldTier]} → ${budgets[newTier]}`, timestamp: Date.now() }]);
            addLog('attestation', `  [AA SDK] ${a.id} promoted: ${oldTier} → ${newTier}`, a.id);
          }
          return { ...a, earnings: +(a.earnings + sel.price).toFixed(2), reputation: newRep, tier: newTier, completedTasks: a.completedTasks + 1 };
        }
        return a;
      });
      setAgents(updatedAgents);

      // Update metrics
      const newTx = metrics.totalTransactions + selected.length;
      const newVol = +(metrics.totalVolume + totalCost).toFixed(2);
      setMetrics((prev) => ({
        ...prev,
        totalTransactions: newTx,
        totalVolume: newVol,
        explorationRate: +(selected.filter((s) => s.isExploration).length / selected.length).toFixed(2),
        giniCoefficient: +Math.min(0.6, prev.giniCoefficient + 0.02 + Math.random() * 0.03).toFixed(3),
        marketEfficiency: +Math.min(0.95, prev.marketEfficiency + 0.01).toFixed(3),
      }));
      setSpent((prev) => +(prev + totalCost).toFixed(2));

      // Set result
      setTaskResult({
        taskId,
        content: buildResult(taskDescription),
        qualityScore,
        costBreakdown,
        totalCost: +totalCost.toFixed(4),
        attestationTxHash: hash,
        completedAt: new Date().toISOString(),
      });
      setFeedbackTaskId(taskId);

      addLog('attestation', `Task ${taskId} complete — total cost: $${totalCost.toFixed(4)} USDC`);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, agents, metrics, addLog]);

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {/* Left Column */}
        <div className="col-span-3 space-y-4">
          <TaskInput presets={PRESET_TASKS} onSubmit={runTask} isRunning={isRunning} budget={budget} spent={spent} />
          <EconomyHealth metrics={metrics} />
          <TrustLifecycle events={trustEvents} />
        </div>

        {/* Center Column */}
        <div className="col-span-6 space-y-4">
          <EconomyGraph agents={agents} payments={payments} spent={spent} budget={budget} />
          <div className="grid grid-cols-2 gap-4">
            <TaskOutput result={taskResult} />
            <AgentLeaderboard agents={agents} />
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-3 space-y-4">
          <NegotiationLog entries={negotiationLog} isStreaming={isRunning} />
          {feedbackTaskId && (
            <UserFeedback
              taskId={feedbackTaskId}
              autoScore={taskResult?.qualityScore || 0}
              onRate={(rating) => {
                addLog('attestation', `User rated ${rating}/5 (auto-score was ${taskResult?.qualityScore}/5)`);
                setFeedbackTaskId(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
