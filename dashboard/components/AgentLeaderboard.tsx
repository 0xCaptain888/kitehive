'use client';

interface Agent {
  id: string;
  type: string;
  earnings: number;
  reputation: number;
  tier: string;
  completedTasks: number;
  currentPrice: number;
}

interface Props {
  agents: Agent[];
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'Trusted': return 'text-primary';
    case 'Established': return 'text-accent-green';
    case 'Growing': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

export function AgentLeaderboard({ agents }: Props) {
  const sorted = [...agents].sort((a, b) => b.earnings - a.earnings);

  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Agent Leaderboard</h3>
      <div className="space-y-2">
        {sorted.map((agent, i) => (
          <div key={agent.id} className="flex items-center gap-3 py-1.5 px-2 rounded bg-surface-light/50">
            <span className="text-xs font-mono text-gray-500 w-5">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white truncate">{agent.id}</span>
                <span className={`text-xs ${getTierColor(agent.tier)}`}>{agent.tier}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>{agent.completedTasks} tasks</span>
                <span>rep {agent.reputation}</span>
                <span>${agent.currentPrice.toFixed(2)}/task</span>
              </div>
            </div>
            <span className="text-sm font-mono text-accent-green">${agent.earnings.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
