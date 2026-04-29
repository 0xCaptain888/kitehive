'use client';

import { useState } from 'react';

interface RegisteredAgent {
  id: string;
  type: string;
  endpoint: string;
  walletAddress: string;
  reputation: number;
  tier: string;
  totalEarnings: number;
  completedTasks: number;
  currentPrice: number;
  status: 'online' | 'offline' | 'busy';
  registeredAt: string;
  capabilities: string[];
}

const MOCK_REGISTRY: RegisteredAgent[] = [
  {
    id: 'research-agent-a',
    type: 'research',
    endpoint: 'https://agents.kitehive.ai/research-a',
    walletAddress: '0x1234...5678',
    reputation: 420,
    tier: 'Trusted',
    totalEarnings: 12.50,
    completedTasks: 47,
    currentPrice: 0.55,
    status: 'online',
    registeredAt: '2026-04-26T08:00:00Z',
    capabilities: ['web_search', 'data_analysis', 'competitive_research'],
  },
  {
    id: 'writer-agent-a',
    type: 'writing',
    endpoint: 'https://agents.kitehive.ai/writer-a',
    walletAddress: '0x2345...6789',
    reputation: 380,
    tier: 'Established',
    totalEarnings: 8.30,
    completedTasks: 35,
    currentPrice: 0.35,
    status: 'online',
    registeredAt: '2026-04-26T08:00:00Z',
    capabilities: ['report_writing', 'data_synthesis', 'competitive_analysis'],
  },
  {
    id: 'writer-agent-b',
    type: 'writing',
    endpoint: 'https://agents.kitehive.ai/writer-b',
    walletAddress: '0x3456...7890',
    reputation: 290,
    tier: 'Growing',
    totalEarnings: 3.10,
    completedTasks: 18,
    currentPrice: 0.25,
    status: 'online',
    registeredAt: '2026-04-26T10:00:00Z',
    capabilities: ['report_writing', 'summary', 'bullet_points'],
  },
  {
    id: 'external-api',
    type: 'external_api',
    endpoint: 'https://agents.kitehive.ai/external',
    walletAddress: '0x4567...8901',
    reputation: 450,
    tier: 'Trusted',
    totalEarnings: 1.80,
    completedTasks: 22,
    currentPrice: 0.10,
    status: 'online',
    registeredAt: '2026-04-26T08:00:00Z',
    capabilities: ['market_data', 'network_stats', 'pricing_data'],
  },
];

function getTierColor(tier: string): string {
  switch (tier) {
    case 'Trusted': return 'text-primary';
    case 'Established': return 'text-accent-green';
    case 'Growing': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'bg-accent-green';
    case 'busy': return 'bg-primary';
    default: return 'bg-gray-500';
  }
}

export default function RegistryPage() {
  const [agents] = useState<RegisteredAgent[]>(MOCK_REGISTRY);
  const [registerUrl, setRegisterUrl] = useState('');

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Agent Registry</h2>
          <p className="text-sm text-gray-400 mt-1">
            Open registry — any agent can register and start earning
          </p>
        </div>
        <a href="/" className="text-sm text-primary hover:text-primary/80 transition">
          &larr; Back to Dashboard
        </a>
      </div>

      {/* Register new agent */}
      <div className="bg-surface border border-surface-light rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Register New Agent</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={registerUrl}
            onChange={(e) => setRegisterUrl(e.target.value)}
            placeholder="Enter x402 endpoint URL (e.g., https://your-agent.com)"
            className="flex-1 bg-background border border-surface-light rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary"
          />
          <button className="bg-primary/20 text-primary border border-primary/30 rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/30 transition">
            Register Agent
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your agent must implement the x402 protocol (POST /quote, POST /execute, GET /health)
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-surface border border-surface-light rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></span>
                  <h3 className="text-sm font-semibold text-white">{agent.id}</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">{agent.type} agent</p>
              </div>
              <span className={`text-xs font-medium ${getTierColor(agent.tier)}`}>
                {agent.tier}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500">Reputation</p>
                <p className="text-sm font-mono text-white">{agent.reputation}/500</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Earnings</p>
                <p className="text-sm font-mono text-accent-green">${agent.totalEarnings.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tasks</p>
                <p className="text-sm font-mono text-white">{agent.completedTasks}</p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Current Price</p>
              <p className="text-lg font-mono font-semibold text-primary">${agent.currentPrice.toFixed(2)}</p>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Capabilities</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.map((cap) => (
                  <span key={cap} className="text-xs bg-surface-light text-gray-400 px-2 py-0.5 rounded">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-600 font-mono truncate">
              {agent.endpoint}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
