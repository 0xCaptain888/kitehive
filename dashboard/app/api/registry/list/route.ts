import { NextRequest, NextResponse } from 'next/server';
import { readAgents, getStats } from '@/lib/agent-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let agents = readAgents();

    if (status && status !== 'all') {
      agents = agents.filter(a => a.status === status);
    }

    if (type === 'native') agents = agents.filter(a => !a.isExternal);
    if (type === 'external') agents = agents.filter(a => a.isExternal);

    if (search) {
      const q = search.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.capabilities.some(c => c.toLowerCase().includes(q)) ||
        a.description.toLowerCase().includes(q)
      );
    }

    agents.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return b.reputation - a.reputation;
    });

    return NextResponse.json({
      agents,
      stats: getStats(readAgents()),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Registry list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
