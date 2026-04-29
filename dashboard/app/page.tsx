'use client';

import { useState, useCallback } from 'react';
import { EconomyGraph } from '@/components/EconomyGraph';
import { NegotiationLog } from '@/components/NegotiationLog';
import { AgentLeaderboard } from '@/components/AgentLeaderboard';
import { EconomyHealth } from '@/components/EconomyHealth';
import { TrustLifecycle } from '@/components/TrustLifecycle';
import { TaskInput } from '@/components/TaskInput';
import { TaskOutput } from '@/components/TaskOutput';
import { UserFeedback } from '@/components/UserFeedback';

// Mock data types
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

// Initial mock data — represents 72h of economy history
const MOCK_AGENTS: Agent[] = [
  { id: 'research-agent-a', type: 'research', earnings: 12.50, reputation: 420, tier: 'Trusted', completedTasks: 47, currentPrice: 0.55 },
  { id: 'writer-agent-a', type: 'writing', earnings: 8.30, reputation: 380, tier: 'Established', completedTasks: 35, currentPrice: 0.35 },
  { id: 'writer-agent-b', type: 'writing', earnings: 3.10, reputation: 290, tier: 'Growing', completedTasks: 18, currentPrice: 0.25 },
  { id: 'external-api', type: 'external_api', earnings: 1.80, reputation: 450, tier: 'Trusted', completedTasks: 22, currentPrice: 0.10 },
];

// MOCK_METRICS placeholder
const MOCK_METRICS: EconomyMetrics = {
  giniCoefficient: 0.38,
  marketEfficiency: 0.72,
  explorationRate: 0.18,
  priceVolatility24h: 14.2,
  totalTransactions: 122,
  totalVolume: 25.70,
  activeAgents: 4,
};

const PRESET_TASKS = [
  { label: 'Kite AI vs Competitors', description: 'Analyze how Kite AI compares to other AI payment blockchains', icon: '\u2694\uFE0F' },
  { label: 'DeFi Yield Comparison', description: 'Cross-protocol yield analysis across top DeFi platforms', icon: '\uD83D\uDCCA' },
  { label: 'L2 Chain Analysis', description: 'Layer 2 performance comparison and scaling analysis', icon: '\uD83D\uDD17' },
];

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [metrics, setMetrics] = useState<EconomyMetrics>(MOCK_METRICS);
  const [negotiationLog, setNegotiationLog] = useState<NegotiationEntry[]>([]);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [trustEvents, setTrustEvents] = useState<TrustEvent[]>([
    { agent: 'writer-agent-a', oldTier: 'Growing', newTier: 'Established', budgetChange: '$10 \u2192 $20', timestamp: Date.now() - 86400000 },
    { agent: 'research-agent-a', oldTier: 'Established', newTier: 'Trusted', budgetChange: '$20 \u2192 $50', timestamp: Date.now() - 43200000 },
  ]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [budget] = useState(10.0);
  const [spent, setSpent] = useState(MOCK_METRICS.totalVolume);
  const [feedbackTaskId, setFeedbackTaskId] = useState<string | null>(null);

  const addLogEntry = useCallback((entry: Omit<NegotiationEntry, 'id' | 'timestamp'>) => {
    setNegotiationLog((prev) => [
      ...prev,
      { ...entry, id: `log-${Date.now()}-${Math.random()}`, timestamp: Date.now() },
    ]);
  }, []);

  const simulateTask = useCallback(async (taskDescription: string) => {
    if (isRunning) return;
    setIsRunning(true);
    setTaskResult(null);
    setNegotiationLog([]);

    // Step 1: Task decomposition
    addLogEntry({ type: 'decomposition', message: `Decomposing task: "${taskDescription}"` });
    await delay(800);
    addLogEntry({ type: 'decomposition', message: 'SubTask 1 \u2192 Research Agent: Collect data and analyze' });
    addLogEntry({ type: 'decomposition', message: 'SubTask 2 \u2192 Writer Agent: Synthesize into report' });
    await delay(600);

    // Step 2: RFQ broadcast
    addLogEntry({ type: 'rfq', message: 'Broadcasting RFQ to all registered agents...' });
    await delay(500);

    const researchQuote = 0.45 + Math.random() * 0.2;
    const writerAQuote = 0.30 + Math.random() * 0.1;
    const writerBQuote = 0.20 + Math.random() * 0.1;

    addLogEntry({ type: 'rfq', message: `research-agent-a quotes $${researchQuote.toFixed(2)} (latency: 8s, confidence: 0.84)`, agentId: 'research-agent-a' });
    addLogEntry({ type: 'rfq', message: `writer-agent-a quotes $${writerAQuote.toFixed(2)} (latency: 6s, confidence: 0.76)`, agentId: 'writer-agent-a' });
    addLogEntry({ type: 'rfq', message: `writer-agent-b quotes $${writerBQuote.toFixed(2)} (latency: 7s, confidence: 0.58)`, agentId: 'writer-agent-b' });
    await delay(400);

    // Step 3: Thompson Sampling selection
    const isExploration = Math.random() < 0.2;
    const selectedWriter = isExploration ? 'writer-agent-b' : 'writer-agent-a';
    const selectedWriterPrice = isExploration ? writerBQuote : writerAQuote;
    const mode = isExploration ? 'EXPLORATION' : 'EXPLOITATION';

    addLogEntry({
      type: 'selection',
      message: `[${mode}] Research: research-agent-a selected \u2014 sampled quality 0.${Math.floor(750 + Math.random() * 200)}, price $${researchQuote.toFixed(2)}`,
      agentId: 'research-agent-a',
    });
    addLogEntry({
      type: 'selection',
      message: `[${mode}] Writing: ${selectedWriter} selected \u2014 sampled quality 0.${Math.floor(500 + Math.random() * 400)}, price $${selectedWriterPrice.toFixed(2)}`,
      agentId: selectedWriter,
    });
    await delay(300);

    // Step 4: Payment
    const apiCost = 0.10;
    addLogEntry({ type: 'payment', message: `x402 payment $${researchQuote.toFixed(2)} \u2192 research-agent-a`, agentId: 'research-agent-a' });
    setPayments((prev) => [...prev, { from: 'coordinator', to: 'research-agent-a', amount: researchQuote, timestamp: Date.now() }]);
    await delay(2000);

    addLogEntry({ type: 'payment', message: `x402 payment $${selectedWriterPrice.toFixed(2)} \u2192 ${selectedWriter}`, agentId: selectedWriter });
    setPayments((prev) => [...prev, { from: 'coordinator', to: selectedWriter, amount: selectedWriterPrice, timestamp: Date.now() }]);
    await delay(2000);

    addLogEntry({ type: 'payment', message: `x402 payment $${apiCost.toFixed(2)} \u2192 external-api`, agentId: 'external-api' });
    setPayments((prev) => [...prev, { from: 'coordinator', to: 'external-api', amount: apiCost, timestamp: Date.now() }]);
    await delay(1500);

    const totalCost = researchQuote + selectedWriterPrice + apiCost;

    // Step 5: Quality & Attestation
    const qualityScore = 3 + Math.floor(Math.random() * 3); // 3-5
    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    addLogEntry({ type: 'attestation', message: `Quality score: ${qualityScore}/5 \u2014 Attestation created on-chain` });
    addLogEntry({ type: 'attestation', message: `Tx: ${txHash.slice(0, 18)}...${txHash.slice(-8)}` });

    // Update agent stats
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === 'research-agent-a') return { ...a, earnings: a.earnings + researchQuote, completedTasks: a.completedTasks + 1 };
        if (a.id === selectedWriter) return { ...a, earnings: a.earnings + selectedWriterPrice, completedTasks: a.completedTasks + 1 };
        if (a.id === 'external-api') return { ...a, earnings: a.earnings + apiCost, completedTasks: a.completedTasks + 1 };
        return a;
      })
    );

    setSpent((prev) => prev + totalCost);
    setMetrics((prev) => ({
      ...prev,
      totalTransactions: prev.totalTransactions + 3,
      totalVolume: prev.totalVolume + totalCost,
    }));

    const taskId = `task-${Date.now()}`;
    setTaskResult({
      taskId,
      content: `## ${taskDescription}\n\n### Executive Summary\nBased on comprehensive research and analysis, here are the key findings...\n\n### Key Findings\n- Finding 1: Market analysis indicates strong growth potential\n- Finding 2: Competitive landscape shows differentiation opportunities\n- Finding 3: Technical infrastructure supports scalability\n\n### Comparison Table\n| Feature | Kite AI | Competitor A | Competitor B |\n|---------|---------|-------------|-------------|\n| TPS | 10,000+ | 5,000 | 2,000 |\n| Settlement | Instant | 2-5 min | 10+ min |\n| Agent Support | Native | Limited | None |\n\n### SWOT Analysis\n**Strengths:** Native agent economy, x402 protocol, AA SDK\n**Weaknesses:** Early ecosystem, limited agent diversity\n**Opportunities:** Growing AI agent market, cross-chain expansion\n**Threats:** Competing L1s, regulatory uncertainty\n\n### Recommendations\n1. Continue deepening agent infrastructure\n2. Focus on developer experience and documentation\n3. Build strategic partnerships with AI frameworks`,
      qualityScore,
      costBreakdown: [
        { agentId: 'research-agent-a', cost: researchQuote },
        { agentId: selectedWriter, cost: selectedWriterPrice },
        { agentId: 'external-api', cost: apiCost },
      ],
      totalCost,
      attestationTxHash: txHash,
      completedAt: new Date().toISOString(),
    });

    setFeedbackTaskId(taskId);
    setIsRunning(false);
  }, [isRunning, addLogEntry]);

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {/* Left Column: Task Input + Economy Health */}
        <div className="col-span-3 space-y-4">
          <TaskInput
            presets={PRESET_TASKS}
            onSubmit={simulateTask}
            isRunning={isRunning}
            budget={budget}
            spent={spent}
          />
          <EconomyHealth metrics={metrics} />
          <TrustLifecycle events={trustEvents} />
        </div>

        {/* Center Column: Economy Graph */}
        <div className="col-span-6 space-y-4">
          <EconomyGraph agents={agents} payments={payments} spent={spent} budget={budget} />
          <div className="grid grid-cols-2 gap-4">
            <TaskOutput result={taskResult} />
            <AgentLeaderboard agents={agents} />
          </div>
        </div>

        {/* Right Column: Negotiation Log + Feedback */}
        <div className="col-span-3 space-y-4">
          <NegotiationLog entries={negotiationLog} isStreaming={isRunning} />
          {feedbackTaskId && (
            <UserFeedback
              taskId={feedbackTaskId}
              autoScore={taskResult?.qualityScore || 0}
              onRate={(rating) => {
                addLogEntry({
                  type: 'attestation',
                  message: `User rated ${rating}/5 (auto-score was ${taskResult?.qualityScore}/5)`,
                });
                setFeedbackTaskId(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
