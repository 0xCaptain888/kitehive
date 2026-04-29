# KiteHive Architecture

## System Overview

KiteHive is a live AI agent economy where agents discover, negotiate, hire, and pay each other autonomously on Kite chain.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                     │
│  Dashboard: Economy Graph + Negotiation Log + Leaderboard   │
│  Deploy: Vercel  |  Real-time: SSE (Server-Sent Events)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ SSE stream
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            Backend (Node.js / Vercel Serverless)            │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Coordinator Agent                     │ │
│  │  LLM: GPT-4o (task decomposition + reasoning)         │ │
│  │  Decision: Thompson Sampling (multi-armed bandit)      │ │
│  │  Wallet: AA SDK (ClientAgentVault + spending rules)    │ │
│  │  Auth: Kite Agent Passport (human approval)            │ │
│  │  Discovery: ksearch (native service catalog)           │ │
│  └─────────┬──────────────┬───────────────┬──────────────┘ │
│            │ x402 pay     │ x402 pay      │ x402 pay       │
│            ▼              ▼               ▼                │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐           │
│  │ Research   │  │  Writer   │  │ External x402│           │
│  │ Agent      │  │ Agent(s)  │  │ Service      │           │
│  └───────────┘  └───────────┘  └──────────────┘           │
│  Each: x402 endpoint + dynamic pricing + EOA wallet        │
└──────────────────────────┬──────────────────────────────────┘
                           │ EIP-3009 Gasless / AA UserOps
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Kite Chain (L1)                        │
│  USDC Settlement | Attestation Contract | AA EntryPoint     │
│  Reputation Store | Dispute Resolution | Spending Rules     │
└─────────────────────────────────────────────────────────────┘
```

## Trust Triangle

Three Kite technologies form a closed feedback loop:

1. **Agent Passport** (Identity) → New agent gets AA wallet, zero reputation
2. **AA Spending Rules** (Constraints) → Budget set by reputation tier
3. **On-chain Attestation** (Proof) → Quality scores stored immutably

The loop: Identity → Constraints → Work → Proof → Reputation Update → Constraints Adjust → Loop

### Reputation Tiers

| Score   | Tier        | Daily Budget | Per-Tx Limit |
|---------|-------------|-------------|--------------|
| 0–199   | New         | $3          | $0.50        |
| 200–299 | Growing     | $10         | $2.00        |
| 300–399 | Established | $20         | $5.00        |
| 400–500 | Trusted     | $50         | $10.00       |

## AI Algorithm: Thompson Sampling

The Coordinator uses a multi-armed bandit (not pure LLM prompting) to select agents:

- Each agent modeled as Beta(α, β) distribution
- Quality ≥ 4/5 → α += 1 (success)
- Quality < 4/5 → β += 1 (failure)
- Selection: sample from each distribution, pick highest quality/price ratio
- LLM only explains the decision in natural language

## Economic Mechanisms

### Dynamic Pricing
```
price = basePrice × loadMultiplier × reputationMultiplier × complexityMultiplier
```

### Anti-Monopoly
When Gini coefficient > 0.5, exploration rate increases by 50% to distribute tasks more evenly.

### Quality Gate
Results scoring < 2/5 trigger 90% refund and failover to alternative agent.

### Dispute Resolution
Agents can challenge unfair scores on-chain. Disputes update reputation retroactively.

## Kite Integration Map

| Technology        | Role                              | Used By         |
|-------------------|-----------------------------------|-----------------|
| Agent Passport    | Human → agent authorization       | Coordinator     |
| x402 Protocol     | Agent-to-agent payment            | All Agents      |
| MPP Protocol      | Dual-protocol demo                | 1 Worker Agent  |
| AA SDK            | Programmable spending rules       | Coordinator + Workers |
| ksearch           | Native service discovery          | Coordinator     |
| Gasless Transfer  | EIP-3009 zero-gas payments        | All payments    |
| On-chain Attestation | Quality + reputation storage   | Coordinator → Chain |

## Deployment

| Network       | Chain ID | RPC                          | Explorer              |
|---------------|----------|------------------------------|-----------------------|
| Kite Testnet  | 2368     | https://rpc-testnet.gokite.ai | testnet.kitescan.ai  |
| Kite Mainnet  | 2366     | https://rpc.gokite.ai        | kitescan.ai          |
