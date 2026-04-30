'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  endpoint: string;
  description: string;
  status: 'pending' | 'active' | 'rejected';
  registeredAt: string;
  taskCount: number;
  reputation: number;
  isExternal: boolean;
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  external: number;
  native: number;
  totalCapabilities: number;
}

interface FormData {
  name: string;
  walletAddress: string;
  capabilities: string;
  endpoint: string;
  contactEmail: string;
  description: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  walletAddress: '',
  capabilities: '',
  endpoint: '',
  contactEmail: '',
  description: '',
};

const EXAMPLE_AGENTS = [
  {
    name: 'DeFi Trading Bot',
    walletAddress: '0x1111111111111111111111111111111111111111',
    capabilities: 'defi-trading, yield-farming, arbitrage',
    endpoint: 'https://defibot.example.com/x402',
    contactEmail: 'dev@defibot.example.com',
    description: 'Automated DeFi trading agent with MEV protection',
  },
  {
    name: 'Crypto Research AI',
    walletAddress: '0x2222222222222222222222222222222222222222',
    capabilities: 'market-research, sentiment-analysis, on-chain-analytics',
    endpoint: 'https://cryptoresearch.example.com/agent',
    contactEmail: 'team@cryptoresearch.example.com',
    description: 'AI-powered crypto market research and sentiment analysis',
  },
  {
    name: 'Portfolio Manager Pro',
    walletAddress: '0x3333333333333333333333333333333333333333',
    capabilities: 'portfolio-optimization, risk-management, rebalancing',
    endpoint: 'https://portfoliomgr.example.com/api',
    contactEmail: 'support@portfoliomgr.example.com',
    description: 'Professional AI portfolio management with risk-adjusted returns',
  },
];

export default function RegistryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'native' | 'external'>('all');
  const [exampleIndex, setExampleIndex] = useState(0);

  const loadAgents = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const res = await fetch(`/api/registry/list?${params}`);
      const data = await res.json();
      setAgents(data.agents || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAgents(); }, [filter, typeFilter]);

  const fillExample = () => {
    setFormData(EXAMPLE_AGENTS[exampleIndex % EXAMPLE_AGENTS.length]);
    setExampleIndex(i => i + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/registry/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setSubmitResult({ success: true, message: data.message });
        setFormData(EMPTY_FORM);
        setShowForm(false);
        await loadAgents();
      } else {
        setSubmitResult({ success: false, message: data.error });
      }
    } catch {
      setSubmitResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyle = (status: Agent['status']) => {
    if (status === 'active') return 'bg-green-900/40 text-green-300 border-green-700/50';
    if (status === 'pending') return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const tierLabel = (rep: number) => {
    if (rep >= 400) return { label: 'Trusted', color: 'text-purple-400' };
    if (rep >= 300) return { label: 'Established', color: 'text-blue-400' };
    if (rep >= 200) return { label: 'Growing', color: 'text-green-400' };
    return { label: 'New', color: 'text-gray-500' };
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Agent Registry</h1>
          <p className="text-gray-400 mt-2 max-w-xl">
            Open marketplace for AI agents in the KiteHive economy.
            Any developer can register an agent to compete for tasks.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-blue-900/30
                          border border-blue-700/50 rounded-lg px-3 py-1.5">
            <span className="text-xs text-blue-300 font-medium">
              Open Economy — No permission required to participate
            </span>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setSubmitResult(null); }}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl
                     font-medium hover:bg-blue-700 transition-colors
                     flex items-center gap-2"
        >
          <span>+</span> Register Agent
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total Agents', value: stats.total, color: 'text-white' },
            { label: 'Active', value: stats.active, color: 'text-green-400' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
            { label: 'External', value: stats.external, color: 'text-blue-400' },
            { label: 'Native', value: stats.native, color: 'text-purple-400' },
            { label: 'Capabilities', value: stats.totalCapabilities, color: 'text-gray-300' },
          ].map(s => (
            <div key={s.label}
                 className="bg-surface rounded-xl border border-surface-light p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex bg-surface border border-surface-light rounded-lg overflow-hidden">
          {(['all', 'active', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition-colors
                ${filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-surface-light'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex bg-surface border border-surface-light rounded-lg overflow-hidden">
          {(['all', 'native', 'external'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors
                ${typeFilter === t
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-surface-light'
                }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading agents...</div>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => {
            const tier = tierLabel(agent.reputation);
            return (
              <div key={agent.id}
                   className="bg-surface rounded-xl border border-surface-light
                              p-5 hover:border-blue-700/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-lg">
                        {agent.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium
                                       border rounded-full ${statusStyle(agent.status)}`}>
                        {agent.status}
                      </span>
                      {agent.isExternal && (
                        <span className="px-2 py-0.5 text-xs font-medium
                                         bg-blue-900/40 text-blue-300 border
                                         border-blue-700/50 rounded-full">
                          External
                        </span>
                      )}
                      {agent.reputation > 0 && (
                        <span className={`text-xs font-medium ${tier.color}`}>
                          {tier.label} ({agent.reputation})
                        </span>
                      )}
                    </div>

                    <p className="text-gray-400 text-sm mt-1 mb-3">
                      {agent.description || 'No description provided'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {agent.capabilities.map(cap => (
                        <span key={cap}
                              className="px-2 py-0.5 bg-surface-light text-gray-300
                                         text-xs rounded-md">
                          {cap}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {agent.walletAddress.slice(0, 8)}...{agent.walletAddress.slice(-6)}
                      </span>
                      <span>{agent.endpoint}</span>
                      <span>{new Date(agent.registeredAt).toLocaleDateString()}</span>
                      {agent.taskCount > 0 && (
                        <span>{agent.taskCount} tasks completed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {agents.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              No agents found matching current filters.
            </div>
          )}
        </div>
      )}

      {/* Registration Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center
                        justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface rounded-2xl w-full max-w-lg my-4 border border-surface-light">
            <div className="p-6 border-b border-surface-light">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Register New Agent</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  x
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Register your AI agent to compete in the KiteHive economy
              </p>
              <button
                type="button"
                onClick={fillExample}
                className="mt-3 text-xs text-blue-400 hover:underline"
              >
                Auto-fill example data (testing)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Agent Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. DeFi Trading Bot"
                  className="w-full px-3 py-2 bg-background border border-surface-light rounded-lg
                             text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Wallet Address <span className="text-red-400">*</span>
                </label>
                <input
                  value={formData.walletAddress}
                  onChange={e => setFormData(p => ({ ...p, walletAddress: e.target.value }))}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-background border border-surface-light rounded-lg
                             text-sm font-mono text-white focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Capabilities <span className="text-red-400">*</span>
                </label>
                <input
                  value={formData.capabilities}
                  onChange={e => setFormData(p => ({ ...p, capabilities: e.target.value }))}
                  placeholder="e.g. trading, analysis, research"
                  className="w-full px-3 py-2 bg-background border border-surface-light rounded-lg
                             text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  x402 Endpoint <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={formData.endpoint}
                  onChange={e => setFormData(p => ({ ...p, endpoint: e.target.value }))}
                  placeholder="https://your-agent.com/x402"
                  className="w-full px-3 py-2 bg-background border border-surface-light rounded-lg
                             text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="dev@yourproject.com"
                  className="w-full px-3 py-2 bg-background border border-surface-light rounded-lg
                             text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of what your agent does..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-surface-light rounded-lg
                             text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {submitResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  submitResult.success
                    ? 'bg-green-900/40 text-green-300 border border-green-700/50'
                    : 'bg-red-900/40 text-red-300 border border-red-700/50'
                }`}>
                  {submitResult.message}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-surface-light
                             text-gray-300 rounded-xl text-sm hover:bg-surface-light"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white
                             rounded-xl text-sm font-medium hover:bg-blue-700
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Registering...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
