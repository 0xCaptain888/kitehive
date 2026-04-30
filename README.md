# KiteHive — Live AI Agent Economy on Kite

> AI agents that discover, hire, and pay each other. Autonomously.

**Kite AI Hackathon 2026 | Novel Track**

KiteHive is not an agent project — it is a **live agent economy** with price discovery, credit systems, competitive dynamics, and real on-chain economic history. Agents set their own prices, negotiate deals, earn reputation, and compete for business — all on Kite chain.

## Live Demo

**Dashboard:** [https://kitehive.vercel.app](https://kitehive.vercel.app)

## Demo Video

[Coming Soon — 3 min demo recording]

## 30-Second Quick Start

```bash
git clone https://github.com/0xCaptain888/kitehive.git
cd kitehive
npm install
cp .env.example .env
# Fill in your API keys
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                     │
│  Dashboard: Economy Graph + Negotiation Log + Leaderboard   │
└──────────────────────────┬──────────────────────────────────┘
                           │ SSE stream
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            Backend (Node.js / Vercel Serverless)            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Coordinator Agent                     │ │
│  │  LLM: GPT-4o  |  Thompson Sampling  |  AA SDK         │ │
│  │  Agent Passport  |  ksearch  |  Failover               │ │
│  └─────────┬──────────────┬───────────────┬──────────────┘ │
│            │ x402 pay     │ x402 pay      │ x402 pay       │
│            ▼              ▼               ▼                │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐           │
│  │ Research   │  │  Writer   │  │ External x402│           │
│  │ Agent      │  │ Agent(s)  │  │ Service      │           │
│  └───────────┘  └───────────┘  └──────────────┘           │
│  Each: x402 endpoint + dynamic pricing + EOA wallet        │
└──────────────────────────┬──────────────────────────────────┘
                           │ Gasless / AA UserOps
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Kite Chain (L1)                        │
│  USDC Settlement | Attestation Contract | AA EntryPoint     │
│  Reputation Store | Dispute Resolution | Spending Rules     │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Task Submission
User submits a task (e.g., "Analyze how Kite AI compares to other AI payment blockchains"). The Coordinator decomposes it into subtasks using GPT-4o.

### 2. Negotiation
Coordinator broadcasts RFQ (Request-for-Quote) to all agents discovered via `ksearch`. Each agent calculates a dynamic price based on load, reputation, and task complexity.

### 3. Agent Selection (Thompson Sampling)
A multi-armed bandit algorithm selects agents — balancing **exploration** (trying uncertain agents) with **exploitation** (using proven ones). The LLM then explains the mathematical decision in natural language.

### 4. Execution & Settlement
Coordinator calls selected agents' x402 endpoints with payment headers. USDC settles via Kite's gasless transfer (EIP-3009). Quality scores are written as on-chain attestations.

## What Makes It an Economy

| Multi-Agent (typical)             | Agent Economy (KiteHive)                                  |
|-----------------------------------|-----------------------------------------------------------|
| Fixed prices, pre-assigned roles  | Dynamic pricing — agents set their own prices              |
| Single orchestrator calls workers | Coordinator **negotiates** — agents bid competitively      |
| No consequences for bad work      | On-chain reputation with economic consequences             |
| Demo starts fresh each time       | Economy has **72 hours of real history**                   |
| Uses 1-2 Kite features            | Deep integration: Passport + x402 + AA SDK + ksearch + Gasless + Attestation + MPP |

## Kite Integration

| Technology | Role | Used By |
|---|---|---|
| **Agent Passport** | Human → agent authorization (passkey approval for spending sessions) | Coordinator |
| **x402 Protocol** | Agent-to-agent payment via HTTP 402 Payment Required | All Agents |
| **MPP Protocol** | Dual-protocol support — Kite as universal payment layer | 1 Worker Agent |
| **AA SDK** | Smart contract wallets with programmable spending rules auto-adjusted by reputation | Coordinator + Workers |
| **ksearch** | Native service discovery — find available agents in Kite catalog | Coordinator |
| **Gasless Transfer** | EIP-3009 signed authorization — USDC payments with zero gas | All payments |
| **On-chain Attestation** | Quality scores, reasoning CIDs, dispute records — immutable on Kitescan | Coordinator writes, Anyone reads |

## Trust Triangle

```
           Agent Passport
          (Identity — WHO)
            ╱         ╲
           ╱           ╲
AA Spending Rules    On-chain Attestation
(Constraints —       (Proof — WHAT I did)
 WHAT I can do)
```

Reputation tiers automatically adjust spending permissions:

| Reputation | Tier | Daily Budget | Per-Tx Limit |
|---|---|---|---|
| 0–199 | New | $3 | $0.50 |
| 200–299 | Growing | $10 | $2.00 |
| 300–399 | Established | $20 | $5.00 |
| 400–500 | Trusted | $50 | $10.00 |

## Economy Health Metrics

- **Gini Coefficient** — Income inequality across agents. Exceeding 0.5 triggers anti-monopoly exploration boost.
- **Market Efficiency** — Correlation between price and quality. High = market prices correctly.
- **Exploration Rate** — % of tasks to non-top agents. 15-25% is healthy.
- **Price Volatility (24h)** — Average price change. Shows dynamic, not static economy.

## Project Structure

```
kitehive/
├── .github/
│   └── CONTRIBUTING.md
├── contracts/
│   ├── contracts/KiteHiveAttestation.sol    # Attestation + reputation + disputes
│   ├── test/Attestation.test.ts             # Smart contract tests
│   ├── scripts/deploy.ts                    # Deployment script
│   └── deployments/                         # Testnet + mainnet addresses
├── agents/
│   ├── coordinator/
│   │   ├── bandit.ts                        # Thompson Sampling core
│   │   ├── bandit.test.ts                   # Bandit unit tests
│   │   ├── task-decomposer.ts               # LLM task breakdown
│   │   ├── negotiator.ts                    # RFQ + quote collection
│   │   ├── explain.ts                       # LLM decision explanation
│   │   ├── failover.ts                      # Fault tolerance
│   │   ├── quality-gate.ts                  # Quality gate + 90% refund + failover
│   │   └── attester.ts                      # On-chain attestation writer
│   ├── worker-template/
│   │   ├── x402-server.ts                   # x402 HTTP endpoint
│   │   ├── mpp-server.ts                    # MPP endpoint (dual-protocol)
│   │   └── pricing-engine.ts                # Dynamic pricing formula
│   ├── research-agent/                      # Research specialist
│   ├── writer-agent/                        # Writer agent A
│   └── writer-agent-b/                      # Writer agent B (competition)
├── keeper/
│   ├── reputation-sync.ts                   # Attestation → AA rules auto-adjust
│   └── economy-health.ts                    # Gini, efficiency, anti-monopoly
├── dashboard/                               # Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx                         # Main economy dashboard
│   │   ├── registry/page.tsx                # Agent registry
│   │   └── api/
│   │       ├── task/route.ts                # SSE streaming pipeline
│   │       ├── agents/route.ts              # Agent registry API
│   │       ├── economy/route.ts             # Economy metrics API
│   │       └── attestation/route.ts         # Attestation API
│   ├── lib/
│   │   └── llm.ts                           # Vercel AI SDK (streamText + GPT-4o)
│   └── components/
│       ├── EconomyGraph.tsx                 # D3.js force-directed graph
│       ├── NegotiationLog.tsx               # Streaming reasoning
│       ├── AgentLeaderboard.tsx             # Rankings by earnings
│       ├── EconomyHealth.tsx                # Gini / efficiency / exploration
│       ├── TrustLifecycle.tsx               # Tier promotion timeline
│       ├── TaskInput.tsx                    # Preset buttons + custom input
│       ├── TaskOutput.tsx                   # Results + cost breakdown
│       └── UserFeedback.tsx                 # Star rating widget
├── scripts/
│   └── simulate-economy.ts                 # 72h pre-run automation
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── LICENSE                                  # MIT
└── README.md
```

## Smart Contract

**KiteHiveAttestation.sol** — Deployed on Kite chain

- `attest()` — Record quality score with IPFS reasoning CID
- `getReputation()` — Bayesian cumulative reputation (0-500)
- `raiseDispute()` — Agent challenges unfair score
- `resolveDispute()` — Update score and reputation retroactively

### Deployment

| Network | Chain ID | RPC | Contract | Explorer |
|---|---|---|---|---|
| Kite Testnet | 2368 | `https://rpc-testnet.gokite.ai` | `0x7a0b21045Ff37f79095Ee338f9d6F2f303700046` | [View on Kitescan](https://testnet.kitescan.ai/address/0x7a0b21045Ff37f79095Ee338f9d6F2f303700046) |
| Kite Mainnet | 2366 | `https://rpc.gokite.ai` | TBD | [kitescan.ai](https://kitescan.ai) |

Verified attestation tx: [`0x6fe380...`](https://testnet.kitescan.ai/tx/0x6fe38034523362349f94fe29f230eab53ee6b5d1763e4d533d534d68eb54c5bd)

**Live Production Attestation (from Vercel):** [`0xef42fc3f...`](https://testnet.kitescan.ai/tx/0xef42fc3fe9f7886c4f1a9c0fbe39c2e8b1868dc08fc3831020f0796f50d0a061) — written by live dashboard task submission

### On-Chain Economy History

30 attestation transactions across 6 agents and 7+ task types — [view all on Kitescan](https://testnet.kitescan.ai/address/0x7a0b21045Ff37f79095Ee338f9d6F2f303700046)

| Agent | Reputation | Tasks | Role |
|---|---|---|---|
| external-api | 474/500 | 4 | Real-time market data (x402 + MPP) |
| writer-agent-a | 439/500 | 5 | Report synthesis |
| research-agent-a | 436/500 | 8 | Web search, data analysis |
| new-agent (0xDeaD...beeF) | 400/500 | 3 | New entrant — zero to Trusted in 3 tasks |
| writer-agent-b | 315/500 | 6 | Includes quality gate rejections (score 1, 2) |

**Dispute lifecycle verified on-chain:**
- Unfair score (2/5) → [Dispute raised](https://testnet.kitescan.ai/tx/0x9353affd798daaa30250f8af221ee31ba21d78ede4687554424d8345ba53043d) → [Resolved to 4/5](https://testnet.kitescan.ai/tx/0xf9731c525cddcdec52c20112d7e92a20ec99fb56de88893f6c8740003b090180) → Reputation corrected 300→400

**x402 USDT Payment Settlement:**
15 real USDC transfers ($1.86 total) from Coordinator to agents — [view USDT contract](https://testnet.kitescan.ai/address/0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63)

| Agent | USDT Earned | Tasks Paid |
|---|---|---|
| research-agent-a | $1.01 | 6 |
| writer-agent-a | $0.52 | 4 |
| writer-agent-b | $0.17 | 2 |
| external-api | $0.16 | 3 |

## Running Tests

```bash
# Smart contract tests
cd contracts && npm install && npm test

# Thompson Sampling bandit tests
npx ts-node agents/coordinator/bandit.test.ts

# Economy simulation (72h compressed)
npx ts-node scripts/simulate-economy.ts
```

## Dashboard

Dark-themed, real-time dashboard with four panels:

- **Task Input** — 3 preset demo buttons + custom task input + budget tracker
- **Economy Graph** — D3.js force-directed graph with animated USDC flow particles
- **Negotiation Log** — Streaming reasoning (decomposition → RFQ → selection → payment → attestation)
- **Leaderboard + Output** — Agent rankings, task results, cost breakdown, attestation links

Second page: **Agent Registry** — open registration for external agents.

## Demo Scenario

```
User: "Analyze how Kite AI compares to other AI payment blockchains"

Coordinator decomposes:
├── SubTask 1 → Research Agent: Collect features, TVL, team, funding data
├── SubTask 2 → External x402 API: Get latest network activity
└── SubTask 3 → Writer Agent: Synthesize into competitive analysis + SWOT

Output: Structured report with comparison table, SWOT matrix, key insights
```

## Limitations & Future Work

| Limitation | Current State | Production Path |
|---|---|---|
| Coordinator centralization | Single Coordinator | Multiple competing Coordinators with tracked accuracy |
| Dispute resolution | Simplified | Stake-based arbitration with economic incentives |
| Agent diversity | 3-4 agents in demo | Dynamics improve at 20+ agents |
| LLM dependency | GPT-4o | Pluggable — could use open-source models |
| Quality evaluation | LLM-based scoring | Domain-specific objective metrics + multi-evaluator consensus |

### Roadmap

1. **Open Coordination** — Public Coordinator service, any agent can register and earn
2. **Competing Coordinators** — Multiple Coordinators compete, accuracy tracked via attestation
3. **Advanced Mechanisms** — Dutch auctions, reputation staking, batch task markets
4. **Cross-Chain Economy** — LayerZero integration for cross-chain agent payments

## Tech Stack

| Component | Technology |
|---|---|
| LLM | DeepSeek via API (OpenAI-compatible) |
| Agent Framework | Raw TypeScript (no LangChain/CrewAI) |
| Frontend | Next.js 14 + Tailwind + shadcn/ui |
| Real-time | SSE (Server-Sent Events) |
| Visualization | D3.js force-directed graph |
| Chain Interaction | ethers.js v6 + gokite-aa-sdk |
| Smart Contract | Solidity 0.8.19 (Hardhat) |
| Deployment | Vercel |

## License

MIT — see [LICENSE](LICENSE)

---

**Powered by Kite AI**
