import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import { ethers }    from "ethers";
import { complete, completeJSON } from "../../dashboard/lib/llm";

/**
 * Coordinator B — Aggressive Exploration Variant
 *
 * Upgrade #05: Second competing Coordinator to prove KiteHive is an open economy,
 * not a centralized system.
 *
 * Key differences from Coordinator A:
 *   explorationRate: 0.40  (vs 0.18 in Coordinator A)
 *   strategy: "Prioritises untested agents — discovers new talent faster,
 *              higher variance, lower short-term accuracy"
 *
 * On-chain: both Coordinators write attestations with their own EOA as `recorder`.
 * Dashboard shows Coordinator Accuracy Comparison between A and B.
 *
 * Run:
 *   COORDINATOR_ID=B npx ts-node agents/coordinator-b/index.ts
 */

// ─── Config ──────────────────────────────────────────────────────────────

const COORDINATOR_ID     = "coordinator-b";
const EXPLORATION_RATE   = parseFloat(process.env.COORDINATOR_B_EXPLORATION || "0.40");
const WALLET_KEY         = process.env.COORDINATOR_B_WALLET_KEY || process.env.COORDINATOR_WALLET_KEY!;
const RPC_URL            = process.env.KITE_RPC_URL || "https://rpc-testnet.gokite.ai";
const CONTRACT_ADDR      = process.env.ATTESTATION_CONTRACT_TESTNET!;

const ATTESTATION_ABI = [
  "function attest(address agent, uint8 quality, uint256 price, string taskType, string reasoningCid, address token) returns (uint256)",
  "function getReputation(address agent) view returns (uint256)",
];

const USDC_ADDR = process.env.USDC_TOKEN_ADDR || "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";

// ─── Thompson Sampling (higher exploration) ───────────────────────────────

interface AgentRecord {
  id:         string;
  address:    string;
  alpha:      number; // successes (quality >= 4)
  beta:       number; // failures  (quality < 4)
  price:      number; // last quoted price (USDC)
}

const agentRegistry: AgentRecord[] = [
  { id: "research-agent-a", address: process.env.RESEARCH_AGENT_WALLET!,     alpha: 4, beta: 1, price: 0.55 },
  { id: "writer-agent-a",   address: process.env.WRITER_AGENT_WALLET!,       alpha: 3, beta: 1, price: 0.35 },
  { id: "writer-agent-b",   address: process.env.WRITER_AGENT_B_WALLET!,     alpha: 2, beta: 3, price: 0.25 },
  { id: "external-api",     address: process.env.EXTERNAL_API_AGENT_WALLET!, alpha: 5, beta: 1, price: 0.10 },
];

/**
 * Thompson Sampling with inflated exploration:
 * At explorationRate=0.40, 40% of tasks go to non-top agents.
 */
function selectAgent(agents: AgentRecord[], taskPriceUSD: number): AgentRecord {
  // Force exploration more aggressively
  if (Math.random() < EXPLORATION_RATE) {
    // Pick any non-leader agent
    const sorted = [...agents].sort((a, b) => (b.alpha / (b.alpha + b.beta)) - (a.alpha / (a.alpha + a.beta)));
    const nonLeaders = sorted.slice(1); // exclude current best
    return nonLeaders[Math.floor(Math.random() * nonLeaders.length)] || agents[0];
  }

  // Thompson Sampling: sample Beta(alpha, beta) for each agent
  const samples = agents.map((a) => ({
    agent:  a,
    sample: sampleBeta(a.alpha, a.beta),
  }));
  samples.sort((a, b) => b.sample - a.sample);
  return samples[0].agent;
}

// Beta distribution sampling via Johnk's method
function sampleBeta(alpha: number, beta: number): number {
  let x: number, y: number;
  do {
    x = Math.pow(Math.random(), 1 / alpha);
    y = Math.pow(Math.random(), 1 / beta);
  } while (x + y > 1);
  return x / (x + y);
}

// ─── Task Execution ───────────────────────────────────────────────────────

interface Task {
  id:       string;
  type:     string;
  prompt:   string;
  maxPrice: number; // USD
}

async function executeTask(task: Task): Promise<void> {
  console.log(`\n[${COORDINATOR_ID}] Task: ${task.id} — ${task.type}`);

  const provider    = new ethers.JsonRpcProvider(RPC_URL);
  const wallet      = new ethers.Wallet(WALLET_KEY, provider);
  const contract    = new ethers.Contract(CONTRACT_ADDR, ATTESTATION_ABI, wallet);

  // ── Agent selection ────────────────────────────────────────────────────
  const selected = selectAgent(agentRegistry, task.maxPrice);
  console.log(`   Selected: ${selected.id} (exploration_rate=${EXPLORATION_RATE})`);
  console.log(`   Price:    $${selected.price.toFixed(2)} USDC`);

  // ── Simulate agent execution ───────────────────────────────────────────
  const result = await complete(
    `You are ${selected.id}, an AI agent earning USDC for quality work. Complete the task.`,
    task.prompt,
    800
  );

  // ── Quality evaluation ────────────────────────────────────────────────
  const evaluation = await completeJSON<{ quality: number; reasoning: string }>(
    "You are a quality evaluator. Score the work 1-5. Return JSON: { quality, reasoning }",
    `Task: ${task.prompt}\nResult: ${result.slice(0, 500)}`
  );

  const quality = Math.max(1, Math.min(5, evaluation.quality || 3)) as 1|2|3|4|5;
  const reasoningCid = `ipfs://coordinator-b-${Date.now()}`; // replace with real IPFS upload

  // ── Update bandit stats ───────────────────────────────────────────────
  const agentIndex = agentRegistry.findIndex((a) => a.id === selected.id);
  if (agentIndex >= 0) {
    if (quality >= 4) agentRegistry[agentIndex].alpha++;
    else              agentRegistry[agentIndex].beta++;
  }

  // ── On-chain attestation ───────────────────────────────────────────────
  const priceWei = BigInt(Math.round(selected.price * 1_000_000)); // USDC 6 dec

  try {
    const tx = await contract.attest(
      selected.address,
      quality,
      priceWei,
      task.type,
      reasoningCid,
      USDC_ADDR
    );
    const receipt = await tx.wait();
    console.log(`   ✅ Attested on-chain: ${receipt.hash} (quality=${quality})`);
    console.log(`   🔍 View: https://testnet.kitescan.ai/tx/${receipt.hash}`);
  } catch (err) {
    console.error(`   ❌ Attestation failed:`, err);
  }

  // ── Explain decision ──────────────────────────────────────────────────
  const explanation = await complete(
    "Briefly explain the agent selection decision in 2 sentences. Be specific about the exploration rate used.",
    `Coordinator: ${COORDINATOR_ID}, ExplorationRate: ${EXPLORATION_RATE}, ` +
    `Selected: ${selected.id}, Quality: ${quality}, ` +
    `AgentStats: alpha=${selected.alpha} beta=${selected.beta}`
  );
  console.log(`   Reasoning: ${explanation}`);
}

// ─── Sample Tasks ─────────────────────────────────────────────────────────

const SAMPLE_TASKS: Task[] = [
  {
    id:       "task-b-001",
    type:     "research",
    prompt:   "Summarize the key features of Kite AI's x402 payment protocol",
    maxPrice: 0.60,
  },
  {
    id:       "task-b-002",
    type:     "analysis",
    prompt:   "Compare Layer 2 scaling solutions: Optimism vs Arbitrum vs zkSync",
    maxPrice: 0.45,
  },
  {
    id:       "task-b-003",
    type:     "writing",
    prompt:   "Write a technical blog post about autonomous agent payment systems",
    maxPrice: 0.40,
  },
  {
    id:       "task-b-004",
    type:     "research",
    prompt:   "Analyse Kite AI's Thompson Sampling approach to agent selection",
    maxPrice: 0.55,
  },
  {
    id:       "task-b-005",
    type:     "analysis",
    prompt:   "Compare DeFi yield protocols: Aave vs Compound vs Euler",
    maxPrice: 0.35,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🤖 Starting ${COORDINATOR_ID}`);
  console.log(`   Exploration Rate: ${EXPLORATION_RATE} (vs 0.18 in Coordinator A)`);
  console.log(`   Strategy: Aggressive discovery — finds new talent faster`);
  console.log(`   Wallet:  ${new ethers.Wallet(WALLET_KEY).address}`);

  for (const task of SAMPLE_TASKS) {
    await executeTask(task);
    await new Promise((r) => setTimeout(r, 3000)); // 3s between tasks
  }

  console.log(`\n✅ Coordinator B run complete. Check on-chain attestations.`);
  console.log(`   Compare accuracy with Coordinator A in the dashboard.`);
}

main().catch(console.error);
