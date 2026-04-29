import { NextRequest } from 'next/server';

// Attestation records (in production, read from Kite chain)
const attestations = [
  { taskId: 'task-demo-001', agent: '0xRA1', qualityScore: 5, reasoningCID: 'QmDemo001CID', txHash: '0xabc123...', timestamp: Date.now() - 72 * 3600000, attestedBy: '0xCoord' },
  { taskId: 'task-demo-002', agent: '0xWA1', qualityScore: 4, reasoningCID: 'QmDemo002CID', txHash: '0xdef456...', timestamp: Date.now() - 71 * 3600000, attestedBy: '0xCoord' },
  { taskId: 'task-demo-003', agent: '0xWB1', qualityScore: 3, reasoningCID: 'QmDemo003CID', txHash: '0xghi789...', timestamp: Date.now() - 70 * 3600000, attestedBy: '0xCoord' },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agent = searchParams.get('agent');
  const taskId = searchParams.get('taskId');

  let filtered = attestations;
  if (agent) filtered = filtered.filter(a => a.agent === agent);
  if (taskId) filtered = filtered.filter(a => a.taskId === taskId);

  return Response.json({
    attestations: filtered,
    total: filtered.length,
    contract: process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT || '0x0000000000000000000000000000000000000000',
    explorer: process.env.NEXT_PUBLIC_KITE_EXPLORER || 'https://testnet.kitescan.ai',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 2368),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, agent, qualityScore, reasoningCID } = body;

    if (!taskId || !agent || !qualityScore) {
      return Response.json({ error: 'taskId, agent, and qualityScore are required' }, { status: 400 });
    }

    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const attestation = {
      taskId,
      agent,
      qualityScore,
      reasoningCID: reasoningCID || '',
      txHash,
      timestamp: Date.now(),
      attestedBy: 'coordinator',
    };

    attestations.push(attestation);

    return Response.json({
      success: true,
      attestation,
      explorerUrl: `${process.env.NEXT_PUBLIC_KITE_EXPLORER || 'https://testnet.kitescan.ai'}/tx/${txHash}`,
    }, { status: 201 });
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
