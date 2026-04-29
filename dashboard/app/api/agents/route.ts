import { NextRequest } from 'next/server';

// Shared agent state (mirrors task route)
const registeredAgents = [
  {
    id: 'research-agent-a',
    type: 'research',
    endpoint: 'https://agents.kitehive.ai/research-a',
    walletAddress: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef01',
    reputation: 420,
    tier: 'Trusted',
    totalEarnings: 12.50,
    completedTasks: 47,
    currentPrice: 0.55,
    status: 'online' as const,
    registeredAt: '2026-04-26T08:00:00Z',
    capabilities: ['web_search', 'data_analysis', 'competitive_research'],
    protocols: ['x402'],
  },
  {
    id: 'writer-agent-a',
    type: 'writing',
    endpoint: 'https://agents.kitehive.ai/writer-a',
    walletAddress: '0x2b3c4d5e6f7890abcdef1234567890abcdef0102',
    reputation: 380,
    tier: 'Established',
    totalEarnings: 8.30,
    completedTasks: 35,
    currentPrice: 0.35,
    status: 'online' as const,
    registeredAt: '2026-04-26T08:00:00Z',
    capabilities: ['report_writing', 'data_synthesis', 'competitive_analysis'],
    protocols: ['x402'],
  },
  {
    id: 'writer-agent-b',
    type: 'writing',
    endpoint: 'https://agents.kitehive.ai/writer-b',
    walletAddress: '0x3c4d5e6f7890abcdef1234567890abcdef010203',
    reputation: 290,
    tier: 'Growing',
    totalEarnings: 3.10,
    completedTasks: 18,
    currentPrice: 0.25,
    status: 'online' as const,
    registeredAt: '2026-04-26T10:00:00Z',
    capabilities: ['report_writing', 'summary', 'bullet_points'],
    protocols: ['x402'],
  },
  {
    id: 'external-api',
    type: 'external_api',
    endpoint: 'https://agents.kitehive.ai/external',
    walletAddress: '0x4d5e6f7890abcdef1234567890abcdef01020304',
    reputation: 450,
    tier: 'Trusted',
    totalEarnings: 1.80,
    completedTasks: 22,
    currentPrice: 0.10,
    status: 'online' as const,
    registeredAt: '2026-04-26T08:00:00Z',
    capabilities: ['market_data', 'network_stats', 'pricing_data'],
    protocols: ['x402', 'mpp'],
  },
];

export async function GET() {
  return Response.json({
    agents: registeredAgents,
    total: registeredAgents.length,
    discoveryMethod: 'ksearch',
    catalogUrl: 'https://ksearch.gokite.ai/v1/services',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, type, capabilities } = body;

    if (!endpoint || !type) {
      return Response.json({ error: 'endpoint and type are required' }, { status: 400 });
    }

    const newAgent = {
      id: `agent-${Date.now().toString(36)}`,
      type,
      endpoint,
      walletAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      reputation: 0,
      tier: 'New',
      totalEarnings: 0,
      completedTasks: 0,
      currentPrice: type === 'research' ? 0.40 : type === 'writing' ? 0.30 : 0.10,
      status: 'online' as const,
      registeredAt: new Date().toISOString(),
      capabilities: capabilities || [],
      protocols: ['x402'],
    };

    registeredAgents.push(newAgent);

    return Response.json({
      success: true,
      agent: newAgent,
      message: `Agent registered successfully. Discovery via ksearch enabled. Initial tier: New (daily budget: $3, per-tx: $0.50)`,
    }, { status: 201 });
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
