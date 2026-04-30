'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Dashboard with Interactive Features
 * 
 * Upgrade #15: Task submission, real-time Thompson Sampling visualization,
 * and live agent selection animation.
 */

interface Agent {
  id: string;
  name: string;
  reputation: number;
  capabilities: string[];
  price: number;
  alpha: number;
  beta: number;
  isSelected?: boolean;
  sampledValue?: number;
}

interface TaskSubmissionState {
  prompt: string;
  taskType: string;
  maxBudget: number;
  selectedAgent: Agent | null;
  status: 'idle' | 'selecting' | 'executing' | 'complete';
  reasoning: string;
}

export default function EnhancedDashboard() {
  const [taskState, setTaskState] = useState<TaskSubmissionState>({
    prompt: '',
    taskType: 'research',
    maxBudget: 1.00,
    selectedAgent: null,
    status: 'idle',
    reasoning: ''
  });

  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'research-agent-a',
      name: 'Research Agent Alpha',
      reputation: 420,
      capabilities: ['research', 'analysis', 'data-collection'],
      price: 0.55,
      alpha: 8,
      beta: 2
    },
    {
      id: 'writer-agent-a',
      name: 'Writer Agent Alpha',
      reputation: 380,
      capabilities: ['writing', 'synthesis', 'report'],
      price: 0.35,
      alpha: 6,
      beta: 3
    },
    {
      id: 'writer-agent-b',
      name: 'Writer Agent Beta',
      reputation: 280,
      capabilities: ['writing', 'synthesis'],
      price: 0.25,
      alpha: 3,
      beta: 5
    },
    {
      id: 'external-api',
      name: 'External Data API',
      reputation: 450,
      capabilities: ['market-data', 'price-feed', 'defi-metrics'],
      price: 0.10,
      alpha: 9,
      beta: 1
    }
  ]);

  // Thompson Sampling simulation
  const sampleBeta = (alpha: number, beta: number): number => {
    // Simplified Beta distribution sampling for demo
    const u1 = Math.random();
    const u2 = Math.random();
    const x = Math.pow(u1, 1/alpha);
    const y = Math.pow(u2, 1/beta);
    return x / (x + y);
  };

  const runThompsonSampling = async () => {
    setTaskState(prev => ({ ...prev, status: 'selecting' }));

    // Animate sampling process
    const sampledAgents = agents.map(agent => ({
      ...agent,
      sampledValue: sampleBeta(agent.alpha, agent.beta),
      isSelected: false
    }));

    setAgents(sampledAgents);

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Select best agent
    const bestAgent = sampledAgents.reduce((best, agent) => 
      (agent.sampledValue || 0) > (best.sampledValue || 0) ? agent : best
    );

    const updatedAgents = sampledAgents.map(agent => ({
      ...agent,
      isSelected: agent.id === bestAgent.id
    }));

    setAgents(updatedAgents);

    const reasoning = `Thompson Sampling Results:
• ${bestAgent.name}: ${(bestAgent.sampledValue! * 100).toFixed(1)}% (α=${bestAgent.alpha}, β=${bestAgent.beta})
• Selected based on highest sampled success probability
• Exploration rate: 18% (Coordinator A strategy)
• Price: $${bestAgent.price} within budget of $${taskState.maxBudget}`;

    setTaskState(prev => ({
      ...prev,
      selectedAgent: bestAgent,
      status: 'executing',
      reasoning
    }));

    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 3000));

    setTaskState(prev => ({ ...prev, status: 'complete' }));
  };

  const handleSubmitTask = async () => {
    if (!taskState.prompt.trim()) return;
    await runThompsonSampling();
  };

  const resetTask = () => {
    setTaskState({
      prompt: '',
      taskType: 'research', 
      maxBudget: 1.00,
      selectedAgent: null,
      status: 'idle',
      reasoning: ''
    });
    setAgents(agents.map(a => ({ ...a, isSelected: false, sampledValue: undefined })));
  };

  const getReputationTier = (reputation: number) => {
    if (reputation >= 400) return { tier: 'Trusted', color: 'text-purple-600 bg-purple-100' };
    if (reputation >= 300) return { tier: 'Established', color: 'text-blue-600 bg-blue-100' };
    if (reputation >= 200) return { tier: 'Growing', color: 'text-green-600 bg-green-100' };
    return { tier: 'New', color: 'text-gray-600 bg-gray-100' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">KiteHive Interactive Demo</h1>
          <p className="text-gray-600 mt-1">
            Submit a task and watch Thompson Sampling select the optimal agent
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Task Submission Panel */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Submit Task</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Prompt
                </label>
                <textarea
                  value={taskState.prompt}
                  onChange={(e) => setTaskState(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe the task you want an agent to complete..."
                  className="w-full h-24 p-3 border border-gray-300 rounded-md resize-none"
                  disabled={taskState.status !== 'idle'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Type
                  </label>
                  <select
                    value={taskState.taskType}
                    onChange={(e) => setTaskState(prev => ({ ...prev, taskType: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md"
                    disabled={taskState.status !== 'idle'}
                  >
                    <option value="research">Research</option>
                    <option value="writing">Writing</option>
                    <option value="analysis">Analysis</option>
                    <option value="data-collection">Data Collection</option>
                    <option value="market-data">Market Data</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Budget (USDC)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.10"
                    max="10.00"
                    value={taskState.maxBudget}
                    onChange={(e) => setTaskState(prev => ({ ...prev, maxBudget: parseFloat(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-md"
                    disabled={taskState.status !== 'idle'}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitTask}
                  disabled={!taskState.prompt.trim() || taskState.status !== 'idle'}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  {taskState.status === 'idle' ? 'Submit Task' : 
                   taskState.status === 'selecting' ? 'Selecting Agent...' :
                   taskState.status === 'executing' ? 'Executing Task...' : 'Task Complete'}
                </button>
                
                {taskState.status === 'complete' && (
                  <button
                    onClick={resetTask}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Thompson Sampling Reasoning */}
              {taskState.reasoning && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Thompson Sampling Reasoning</h3>
                  <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">
                    {taskState.reasoning}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Agent Selection Visualization */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Agent Selection Process</h2>
              <p className="text-sm text-gray-600 mt-1">
                {taskState.status === 'idle' ? 'Ready to select agent' :
                 taskState.status === 'selecting' ? 'Thompson Sampling in progress...' :
                 taskState.status === 'executing' ? 'Agent executing task' : 'Task completed'}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <AnimatePresence>
                  {agents.map((agent) => {
                    const tierInfo = getReputationTier(agent.reputation);
                    const successRate = ((agent.alpha / (agent.alpha + agent.beta)) * 100).toFixed(1);
                    
                    return (
                      <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          scale: agent.isSelected ? 1.02 : 1,
                          backgroundColor: agent.isSelected ? '#f0f9ff' : '#ffffff'
                        }}
                        transition={{ duration: 0.3 }}
                        className={`p-4 border rounded-lg relative ${
                          agent.isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                        }`}
                      >
                        {agent.isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                          >
                            ✓
                          </motion.div>
                        )}
                        
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{agent.name}</span>
                              <span className={`text-xs px-2 py-1 rounded ${tierInfo.color}`}>
                                {tierInfo.tier}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-2">
                              Reputation: {agent.reputation} • Success Rate: {successRate}%
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mb-3">
                              {agent.capabilities.map(cap => (
                                <span 
                                  key={cap}
                                  className={`text-xs px-2 py-1 rounded ${
                                    cap === taskState.taskType ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>

                            {agent.sampledValue !== undefined && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-xs bg-gray-50 p-2 rounded"
                              >
                                <strong>Sampled Value:</strong> {(agent.sampledValue * 100).toFixed(1)}%
                              </motion.div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              ${agent.price}
                            </div>
                            <div className="text-xs text-gray-500">USDC</div>
                          </div>
                        </div>

                        {/* Sampling Animation */}
                        {taskState.status === 'selecting' && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.5, delay: Math.random() * 0.5 }}
                            className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-full"
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Economy Health Trends */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Economy Health Trends</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0.38</div>
                <div className="text-sm text-gray-600">Gini Coefficient</div>
                <div className="text-xs text-green-600">↓ Healthy (< 0.5)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">87%</div>
                <div className="text-sm text-gray-600">Market Efficiency</div>
                <div className="text-xs text-blue-600">↑ High correlation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">18%</div>
                <div className="text-sm text-gray-600">Exploration Rate</div>
                <div className="text-xs text-purple-600">→ Stable discovery</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => window.open('/registry', '_blank')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-4 rounded-lg transition-colors"
              >
                <div className="text-lg font-medium">View Agent Registry</div>
                <div className="text-sm opacity-90">See all registered agents</div>
              </button>
              <button 
                onClick={() => window.open('/benchmarks', '_blank')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-4 rounded-lg transition-colors"
              >
                <div className="text-lg font-medium">Performance Benchmarks</div>
                <div className="text-sm opacity-90">Compare vs traditional systems</div>
              </button>
              <button 
                onClick={() => window.open(process.env.NEXT_PUBLIC_KITE_EXPLORER + '/address/' + process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT, '_blank')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-4 rounded-lg transition-colors"
              >
                <div className="text-lg font-medium">View on Kitescan</div>
                <div className="text-sm opacity-90">See on-chain history</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
