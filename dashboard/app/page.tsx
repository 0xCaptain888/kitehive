'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { EconomyGraph } from '@/components/EconomyGraph';
import { NegotiationLog } from '@/components/NegotiationLog';
import { AgentLeaderboard } from '@/components/AgentLeaderboard';
import { EconomyHealth } from '@/components/EconomyHealth';
import { TrustLifecycle } from '@/components/TrustLifecycle';
import { TaskInput } from '@/components/TaskInput';
import { TaskOutput } from '@/components/TaskOutput';
import { UserFeedback } from '@/components/UserFeedback';

// Types
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

const INITIAL_METRICS: EconomyMetrics = {
  giniCoefficient: 0,
  marketEfficiency: 0,
  explorationRate: 0,
  priceVolatility24h: 0,
  totalTransactions: 0,
  totalVolume: 0,
  activeAgents: 0,
};

const PRESET_TASKS = [
  { label: 'Kite AI vs Competitors', description: 'Analyze how Kite AI compares to other AI payment blockchains', icon: '\u2694\uFE0F' },
  { label: 'DeFi Yield Comparison', description: 'Cross-protocol yield analysis across top DeFi platforms', icon: '\uD83D\uDCCA' },
  { label: 'L2 Chain Analysis', description: 'Layer 2 performance comparison and scaling analysis', icon: '\uD83D\uDD17' },
];

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<EconomyMetrics>(INITIAL_METRICS);
  const [negotiationLog, setNegotiationLog] = useState<NegotiationEntry[]>([]);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [trustEvents, setTrustEvents] = useState<TrustEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [budget] = useState(10.0);
  const [spent, setSpent] = useState(0);
  const [feedbackTaskId, setFeedbackTaskId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load agent registry on mount
  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.agents) {
        setAgents(
          data.agents.map((a: any) => ({
            id: a.id,
            type: a.type,
            earnings: a.totalEarnings ?? a.earnings ?? 0,
            reputation: a.reputation ?? 0,
            tier: a.tier ?? 'New',
            completedTasks: a.completedTasks ?? 0,
            currentPrice: a.currentPrice ?? 0,
          })),
        );
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  }, []);

  // Fetch economy metrics
  const fetchEconomy = useCallback(async () => {
    try {
      const res = await fetch('/api/economy');
      const data = await res.json();
      if (data.metrics) {
        setMetrics(data.metrics);
        setSpent(data.metrics.totalVolume ?? 0);
      }
    } catch (err) {
      console.error('Failed to load economy:', err);
    }
  }, []);

  // Load initial data on mount
  useEffect(() => {
    loadAgents();
    fetchEconomy();
  }, [loadAgents, fetchEconomy]);

  const addLogEntry = useCallback((entry: Omit<NegotiationEntry, 'id' | 'timestamp'>) => {
    setNegotiationLog((prev) => [
      ...prev,
      { ...entry, id: `log-${Date.now()}-${Math.random()}`, timestamp: Date.now() },
    ]);
  }, []);

  // Handle individual SSE events
  const handleSSEEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'log':
        setNegotiationLog((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            type: data.type || 'decomposition',
            message: data.message || '',
            agentId: data.agentId,
          },
        ]);
        break;

      case 'payment':
        setPayments((prev) => [
          ...prev,
          {
            from: data.from,
            to: data.to,
            amount: data.amount,
            timestamp: Date.now(),
          },
        ]);
        break;

      case 'result':
        setTaskResult({
          taskId: data.taskId,
          content: data.content,
          qualityScore: data.qualityScore,
          costBreakdown: data.costBreakdown,
          totalCost: data.totalCost,
          attestationTxHash: data.attestationTxHash,
          completedAt: data.completedAt,
        });
        setFeedbackTaskId(data.taskId);
        break;

      case 'state_update':
        if (data.agents) {
          setAgents(
            data.agents.map((a: any) => ({
              id: a.id,
              type: a.type,
              earnings: a.earnings ?? 0,
              reputation: a.reputation ?? 0,
              tier: a.tier ?? 'New',
              completedTasks: a.completedTasks ?? 0,
              currentPrice: a.currentPrice ?? 0,
            })),
          );
        }
        if (data.metrics) {
          setMetrics(data.metrics);
          setSpent(data.metrics.totalVolume ?? 0);
        }
        if (data.trustEvents) {
          setTrustEvents(data.trustEvents);
        }
        break;

      case 'trust_lifecycle':
        setTrustEvents((prev) => [...prev, data]);
        break;

      case 'done':
        // Stream completed -- isRunning will be set to false in finally block
        break;

      case 'error':
        setNegotiationLog((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            timestamp: Date.now(),
            type: 'error',
            message: data.message || 'Unknown error',
          },
        ]);
        break;
    }
  }, []);

  // Run task via SSE stream from POST /api/task
  const runTask = useCallback(async (taskDescription: string) => {
    if (isRunning) return;

    // Abort any previous stream
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setTaskResult(null);
    setNegotiationLog([]);

    try {
      const res = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskDescription }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        addLogEntry({ type: 'error', message: `API error: ${res.status} ${res.statusText}` });
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(currentEvent, data);
            } catch {
              // skip malformed JSON
            }
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addLogEntry({ type: 'error', message: `Stream error: ${err.message}` });
      }
    } finally {
      setIsRunning(false);
      // Refresh economy data after task completes
      fetchEconomy();
      loadAgents();
    }
  }, [isRunning, addLogEntry, fetchEconomy, loadAgents, handleSSEEvent]);

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {/* Left Column: Task Input + Economy Health */}
        <div className="col-span-3 space-y-4">
          <TaskInput
            presets={PRESET_TASKS}
            onSubmit={runTask}
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
