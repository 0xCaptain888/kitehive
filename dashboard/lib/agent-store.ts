import fs from 'fs';
import path from 'path';

export interface RegisteredAgent {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  endpoint: string;
  contactEmail: string;
  description: string;
  status: 'pending' | 'active' | 'rejected';
  registeredAt: string;
  approvedAt?: string;
  taskCount: number;
  reputation: number;
  isExternal: boolean;
}

// Vercel serverless has a read-only filesystem; use in-memory store as fallback
const IS_VERCEL = process.env.VERCEL === '1';
const DATA_FILE = path.join(process.cwd(), 'data', 'agents.json');

// In-memory cache for serverless environments
let memoryStore: RegisteredAgent[] | null = null;

function ensureDataDir() {
  if (IS_VERCEL) return;
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readAgents(): RegisteredAgent[] {
  // On Vercel, use in-memory store (seeded from bundled JSON or defaults)
  if (IS_VERCEL) {
    if (!memoryStore) {
      try {
        // Try to read the bundled data file (included in deployment)
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        memoryStore = JSON.parse(raw);
      } catch {
        memoryStore = getDefaultAgents();
      }
    }
    return memoryStore;
  }

  // Local/self-hosted: use filesystem
  ensureDataDir();

  if (!fs.existsSync(DATA_FILE)) {
    const defaultAgents = getDefaultAgents();
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultAgents, null, 2));
    return defaultAgents;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return getDefaultAgents();
  }
}

export function writeAgents(agents: RegisteredAgent[]): void {
  if (IS_VERCEL) {
    // On Vercel, persist in memory only (resets on cold start)
    memoryStore = agents;
    return;
  }
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(agents, null, 2));
}

export function registerAgent(
  input: Omit<RegisteredAgent, 'id' | 'registeredAt' | 'status' | 'taskCount' | 'reputation' | 'isExternal'>
): RegisteredAgent {
  const agents = readAgents();

  const existing = agents.find(
    a => a.walletAddress.toLowerCase() === input.walletAddress.toLowerCase()
  );
  if (existing) {
    throw new Error('Wallet address already registered');
  }

  const newAgent: RegisteredAgent = {
    ...input,
    id: `ext-agent-${Date.now()}`,
    status: 'pending',
    registeredAt: new Date().toISOString(),
    taskCount: 0,
    reputation: 0,
    isExternal: true,
  };

  agents.push(newAgent);
  writeAgents(agents);
  return newAgent;
}

export function getStats(agents: RegisteredAgent[]) {
  return {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    pending: agents.filter(a => a.status === 'pending').length,
    external: agents.filter(a => a.isExternal).length,
    native: agents.filter(a => !a.isExternal).length,
    totalCapabilities: [...new Set(agents.flatMap(a => a.capabilities))].length,
  };
}

function getDefaultAgents(): RegisteredAgent[] {
  return [
    {
      id: 'native-research-a',
      name: 'Research Agent Alpha',
      walletAddress: process.env.RESEARCH_AGENT_WALLET || '0x0000000000000000000000000000000000000001',
      capabilities: ['research', 'analysis', 'data-collection', 'summarization'],
      endpoint: 'http://localhost:3001/execute',
      contactEmail: 'team@kitehive.com',
      description: 'Native research agent powered by DeepSeek. Specializes in web3 research and market analysis.',
      status: 'active',
      registeredAt: '2026-04-25T10:00:00Z',
      approvedAt: '2026-04-25T10:00:00Z',
      taskCount: 183,
      reputation: 420,
      isExternal: false,
    },
    {
      id: 'native-writer-a',
      name: 'Writer Agent Alpha',
      walletAddress: process.env.WRITER_AGENT_WALLET || '0x0000000000000000000000000000000000000002',
      capabilities: ['writing', 'synthesis', 'report-generation', 'copywriting'],
      endpoint: 'http://localhost:3002/execute',
      contactEmail: 'team@kitehive.com',
      description: 'Native writing agent. Produces high-quality technical and marketing content.',
      status: 'active',
      registeredAt: '2026-04-25T10:15:00Z',
      approvedAt: '2026-04-25T10:15:00Z',
      taskCount: 142,
      reputation: 380,
      isExternal: false,
    },
    {
      id: 'native-api-agent',
      name: 'External Data API Agent',
      walletAddress: process.env.EXTERNAL_API_AGENT_WALLET || '0x0000000000000000000000000000000000000003',
      capabilities: ['market-data', 'price-feed', 'defi-metrics', 'l2-analytics'],
      endpoint: 'http://localhost:3003/execute',
      contactEmail: 'team@kitehive.com',
      description: 'Real-time market data agent. Accepts USDC and PYUSD via x402 protocol.',
      status: 'active',
      registeredAt: '2026-04-25T10:30:00Z',
      approvedAt: '2026-04-25T10:30:00Z',
      taskCount: 97,
      reputation: 455,
      isExternal: false,
    },
  ];
}
