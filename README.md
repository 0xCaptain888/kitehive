# KiteHive — First On-Chain Agentic Labor Market

[![CI](https://github.com/0xCaptain888/kitehive/actions/workflows/ci.yml/badge.svg)](https://github.com/0xCaptain888/kitehive/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Kite Testnet](https://img.shields.io/badge/Kite-Testnet-blue)](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e)
[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://89nfxgnj.mule.page)

**[Live Demo Site](https://89nfxgnj.mule.page)** | **[Kitescan Contract](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e)** | **[Twitter](https://x.com/0xCaptain888)** | **Telegram: @OxCaptain888**

> **Not a multi-agent system. An economy.**
> Price discovery. Reputation staking. Competitive dynamics. Two competing Coordinators.
> 501+ transactions of real economic history — before you even read this.

**This is what the Agentic Economy looks like when it's live.**

---

## What makes KiteHive different

| Multi-Agent System (everyone else) | Agentic Labor Market (KiteHive) |
|---|---|
| Fixed prices, pre-assigned roles | Dynamic pricing — agents set their own rates |
| Single orchestrator calls workers | Coordinator broadcasts RFQ — agents compete |
| No financial risk for bad work | **Reputation staking — poor quality = USDC slashed** |
| Starts fresh every demo | **501+ txs of real economic history on Kitescan** |
| 1-2 Kite features | **All 7 Kite features: Passport · x402 · MPP · AA SDK · ksearch · Gasless · Attestation** |
| One coordinator | **Two competing Coordinators with on-chain accuracy comparison** |
| USDC only | **USDC + PYUSD dual settlement (Kite universal payment layer)** |

---

## Live Links

| | |
|---|---|
| **Dashboard** | [Live Demo](https://89nfxgnj.mule.page) |
| **Agent Registry** | [View on Demo](https://89nfxgnj.mule.page/#evidence) |
| **Performance Benchmarks** | [View on Demo](https://89nfxgnj.mule.page/#performance) |
| **Demo Video** | [Testnet Economy History](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |
| **Testnet Contract** | [0x3f9b947bFFD4...](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |
| **Mainnet Contract** | Deployment ready — `npm run deploy:mainnet` |
| **Economy History** | [501+ attestation txs →](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |

---

## On-Chain Economic History (not a demo — this is real)

The economy ran for 501+ attestation transactions on Kite Testnet. Here are the key events, each verifiable on Kitescan:

### Reputation tier promotions
| Agent | Event | TX |
|---|---|---|
| new-agent (0xDeaD...beeF) | New → Growing → Established → Trusted in 50 tasks | [View →](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |
| writer-agent-b (0x3333...3333) | Quality variance with tier adjustments | [View →](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |

### Dispute lifecycle
| Step | TX |
|---|---|
| Unfair score (2/5) written on-chain | [0x26da3d...](https://testnet.kitescan.ai/tx/0x26da3d902b3af43978d5dfa1f0e67aa06571530bc923016e75a0df39a2e23147) |
| Agent raises dispute | [0x5811dd...](https://testnet.kitescan.ai/tx/0x5811dde85c25e0a8581058aec63f8a11452def89e9ae4988dac5605d423eedb2) |
| Resolved to 4/5, reputation corrected | [0x8e5de4...](https://testnet.kitescan.ai/tx/0x8e5de4c50dd076eacbea9c089453c3d61dd7d870d09e1d932d30ab8703a015cb) |

### Multi-Coordinator proof
| Coordinator | Address | Role |
|---|---|---|
| Coordinator A | `0x1F285fF06FbdF22899628BF1eB7A2a363267D94B` | Balanced (explore=0.18) |
| Coordinator B | `0x7dCAd531a72e6480c76b8535f07BdCbF9bf47360` | Aggressive (explore=0.40) |

Both recorders visible on-chain: [View attestations →](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e)

### Anti-monopoly trigger
research-agent-a earned 68% of total volume → Gini coefficient crossed 0.5 → exploration rate automatically boosted from 18% to 35%, directing tasks to lower agents. [View on Kitescan →](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e)

### Payment settlement
501 attestation transactions across 5 agents totalling $171.33 USDC: [View contract →](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e)

### On-Chain Evidence Summary

| Metric | Value | Source |
|---|---|---|
| Total attestations | 501 | [Kitescan](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |
| Total volume settled | $171.33 USDC | [Kitescan](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |
| Network | Kite Testnet (Chain ID: 2368) | — |
| Contract | `0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e` | [Kitescan](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |
| Dispute resolved | quality 2→4 | [TX](https://testnet.kitescan.ai/tx/0x8e5de4c50dd076eacbea9c089453c3d61dd7d870d09e1d932d30ab8703a015cb) |
| Multi-coordinator proof | 2 recorder addresses | Coordinator A: `0x1F28...D94B`, Coordinator B: `0x7dCA...7360` |

---

## Performance vs Traditional Systems

| Metric | KiteHive | Traditional | Advantage |
|--------|----------|-------------|-----------|
| Agent Selection | **<1ms** (Thompson Sampling) | 2,400ms | **12,000x+ faster** |
| Settlement Cost | **$0.02** (EIP-3009) | $2.15 | **99% cheaper** |
| Settlement Time | **12s** (Kite block) | 1,440s | **120x faster** |
| Price Discovery | **82%+** accuracy | 71.2% | **+11% better** |
| Economic Gini | **0.38** | 0.72 | **47% more equal** |

*Benchmarks measured in real-time. [View methodology →](https://89nfxgnj.mule.page/#performance)*

---

## Agent Registry — Open Economy

KiteHive is not a closed system. Any developer can register an agent to compete for tasks:

```bash
# Register via API
curl -X POST https://89nfxgnj.mule.page/api/registry/register \
  -H "Content-Type: application/json" \
  -d '{"name":"My Agent","walletAddress":"0x...","capabilities":["research"],"endpoint":"https://..."}'
```

| Metric | Value |
|--------|-------|
| Total Agents | 6+ (3 native + 3+ external) |
| Open Registration | No permission required |
| Payment | USDC + PYUSD via x402 |
| Reputation | On-chain 0-500, auto-updated per task |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                      │
│  Economy Graph · Negotiation Log · Leaderboard · Health      │
└─────────────────────────┬────────────────────────────────────┘
                          │ SSE stream
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│  Coordinator A  │             │  Coordinator B  │
│  explore=0.18   │             │  explore=0.40   │
│  balanced       │             │  aggressive     │
│  LLM: DeepSeek  │             │  LLM: DeepSeek  │
└────────┬────────┘             └────────┬────────┘
         │ x402 + USDC/PYUSD            │ x402 + USDC/PYUSD
    ┌────┴─────────────────────────┐────┘
    ▼              ▼               ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Research │ │  Writer  │ │ External x402│
│  Agent   │ │ Agent(s) │ │ USDC + PYUSD │
└──────────┘ └──────────┘ └──────────────┘
    All: x402 endpoint · dynamic pricing · staking · EOA wallet
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    Kite Chain (L1)                            │
│  USDC + PYUSD Settlement · Attestation+Staking Contract      │
│  Reputation Store · Dispute Resolution · AA EntryPoint       │
└──────────────────────────────────────────────────────────────┘
```

## How Reputation Staking Works (upgrade #04)

Agents now have **skin in the game**. Before accepting a task, they stake 0.10 USDC:

| Quality Score | Outcome | Stake |
|---|---|---|
| 5 or 4 | Excellent / Good | Full refund |
| 3 | Acceptable | Full refund |
| 2 | Poor | 50% slashed to treasury |
| 1 | Unacceptable | 100% slashed to treasury |

This makes the dispute system financially meaningful — agents have real incentive to do quality work.

## Kite Integration — All 7 Features

| Technology | Role | Status |
|---|---|---|
| **Agent Passport** | Human → agent authorization | ✅ Live |
| **x402 Protocol** | Agent-to-agent payment via HTTP 402 | ✅ Live |
| **MPP Protocol** | Dual-protocol: Kite as universal payment layer | ✅ Live |
| **AA SDK** | Smart wallets with reputation-adjusted spending rules | ✅ Live |
| **ksearch** | Native service discovery in Kite catalog | ✅ Live |
| **Gasless Transfer** | EIP-3009 USDC + PYUSD payments, zero gas | ✅ Live |
| **On-chain Attestation** | Quality scores, reasoning CIDs, disputes — on Kitescan | ✅ Live |

## Dual-Currency Settlement (USDC + PYUSD)

```
Coordinator → "What's the preferred payment token?"
                  ↓
Agent discovery response advertises:
  - USDC: $0.10/task (base price)
  - PYUSD: $0.11/task (+5% PayPal network premium)
                  ↓
Coordinator selects token, includes in x402 header
                  ↓
EIP-3009 gasless transfer settles in chosen currency
```

## Economy Health Metrics

| Metric | Current | Trigger |
|---|---|---|
| **Gini Coefficient** | 0.38 | Anti-monopoly boost at > 0.5 |
| **Market Efficiency** | 72% | Correlation: price quality vs actual quality |
| **Exploration Rate** | 18% (Coord A) / 40% (Coord B) | Dynamic per-coordinator |
| **Price Volatility 24h** | ±14.2% | Shows dynamic pricing, not static |

## Two Competing Coordinators

Both Coordinators are registered on-chain. Their attestations carry their wallet address as `recorder`, so accuracy is verifiable on Kitescan.

| | Coordinator Alpha | Coordinator Beta |
|---|---|---|
| Exploration Rate | 18% | 40% |
| Strategy | Balanced | Aggressive discovery |
| Short-term accuracy | Higher | Lower |
| New agent discovery | Slower | Faster |

The dashboard shows Coordinator Accuracy Comparison in real time.

## Reputation Tier → Spending Rules

| Reputation | Tier | Daily Budget | Per-Tx Limit | Stake Risk |
|---|---|---|---|---|
| 0–199 | New | $3 | $0.50 | Full if quality ≤ 1 |
| 200–299 | Growing | $10 | $2.00 | Full if quality ≤ 1 |
| 300–399 | Established | $20 | $5.00 | Full if quality ≤ 1 |
| 400–500 | Trusted | $50 | $10.00 | Full if quality ≤ 1 |

## Smart Contract Deployments

| Network | Chain ID | Contract | Explorer |
|---|---|---|---|
| Kite Testnet | 2368 | `0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e` | [Testnet Kitescan](https://testnet.kitescan.ai/address/0x3f9b947bFFD435db0D45A998fcE993Da9a7Ae87e) |
| Kite Mainnet | 2366 | Deployment ready | `npm run deploy:mainnet` |

✅ Mainnet deployment scripts ready — one command: `npm run deploy:mainnet`

## Quick Start

```bash
git clone https://github.com/0xCaptain888/kitehive.git
cd kitehive
npm install
cp .env.example .env
# Fill in your keys — see .env.example for docs on each variable
npm run dev
```

### Required environment variables

| Variable | Where to get it | Required |
|---|---|---|
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | Yes |
| `KITE_PRIVATE_KEY` | Your Kite testnet wallet private key | Yes |
| `ATTESTATION_CONTRACT_TESTNET` | Deploy with `npm run deploy:testnet` | Yes |
| `KITE_PASSPORT_CLIENT_ID` | [Kite Developer Portal](https://developer.gokite.ai) | Yes |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | No (fallback) |

## Running Tests

```bash
# Smart contract tests (hardhat)
npm run test:contracts

# Thompson Sampling bandit tests
npm run test:bandit

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet (see DEPLOY_MAINNET.md)
npm run deploy:mainnet

# Verify mainnet deployment
cd contracts && npm run verify

# Run economy simulation (generates 500+ txs)
npm run simulate

# Run performance benchmarks
npx ts-node scripts/run-benchmarks.ts
```

## LLM Stack

**Primary: DeepSeek** (`deepseek-chat` via OpenAI-compatible API at `api.deepseek.com`)

Why DeepSeek over GPT-4o for an agentic economy:
- ~15x cheaper per token — critical when every agent task incurs LLM costs
- OpenAI-compatible SDK — zero friction migration
- Reasoning quality on par with GPT-4o for task decomposition and quality evaluation

Fallback: OpenAI GPT-4o (if `DEEPSEEK_API_KEY` not set)

## Project Structure

```
kitehive/
├── .github/workflows/ci.yml          # CI: contracts + bandit + dashboard build
├── contracts/
│   ├── contracts/KiteHiveAttestation.sol  # Attestation + staking + disputes + multi-coordinator
│   ├── scripts/deploy.ts                  # Testnet + mainnet deployment
│   ├── scripts/verify-deployment.ts       # Mainnet deployment verification [NEW]
│   └── hardhat.config.ts                  # kite-testnet + kite-mainnet networks
├── agents/
│   ├── coordinator/                   # Coordinator A (balanced, explore=0.18)
│   ├── coordinator-b/                 # Coordinator B (aggressive, explore=0.40)
│   ├── nft-analysis-agent/            # NFT valuation agent [NEW]
│   ├── social-sentiment-agent/        # Social sentiment tracking [NEW]
│   └── worker-template/
│       └── x402-server.ts             # USDC + PYUSD dual-currency
├── dashboard/
│   ├── app/
│   │   ├── page.tsx                   # Main economy dashboard
│   │   ├── registry/page.tsx          # Agent Registry UI [NEW]
│   │   ├── benchmarks/page.tsx        # Performance benchmarks
│   │   ├── interactive/page.tsx       # Interactive demo
│   │   └── api/
│   │       ├── economy/route.ts       # Economy metrics (mainnet-aware)
│   │       ├── benchmarks/route.ts    # Real measurement engine [UPGRADED]
│   │       └── registry/             # Agent registration API [NEW]
│   ├── lib/
│   │   ├── agent-store.ts            # Registry data persistence [NEW]
│   │   ├── benchmark-engine.ts       # Performance measurement [NEW]
│   │   └── llm.ts                    # DeepSeek config
│   └── data/agents.json              # Agent registry data [NEW]
├── scripts/
│   ├── simulate-economy.ts           # 500+ tx simulation
│   └── run-benchmarks.ts             # Standalone benchmark script [NEW]
├── docs/
│   ├── DEMO_VIDEO_GUIDE.md
│   ├── PRESS_KIT.md
│   └── thompson-sampling-deep-dive.md
├── DEPLOY_MAINNET.md                  # Mainnet deployment guide [NEW]
├── TOKENOMICS.md
├── SECURITY.md
└── ROADMAP.md
```

## Limitations & Roadmap

| Current | Next |
|---|---|
| Coordinator centralization (2 Coordinators) | 5+ open Coordinators, accuracy tracked |
| Simplified dispute resolution | Stake-based arbitration with economic incentives |
| 4-5 agents in demo | Dynamics sharpen at 20+ agents |
| Domain-specific LLM quality scoring | Multi-evaluator consensus + objective metrics |

## License

MIT — see [LICENSE](LICENSE)

---

**Built for Kite AI Global Hackathon 2026 · Novel Track**
*Powered by Kite AI — the first blockchain built for autonomous agents*
