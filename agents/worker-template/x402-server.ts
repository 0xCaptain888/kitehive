import express, { Request, Response, NextFunction } from "express";
import { ethers }  from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

/**
 * x402 Worker Agent Server — Dual Currency (USDC + PYUSD)
 *
 * Upgrade #08: Added PYUSD support alongside USDC.
 *
 * Why PYUSD matters for the agent economy pitch:
 *   1. Kite officially supports USDC, PYUSD, USDT as settlement currencies
 *   2. PYUSD is PayPal USD — mainstream adoption signal
 *   3. Coinbase Ventures (hackathon sponsor) has strategic PYUSD interest
 *   4. Multi-currency pricing proves KiteHive is a *universal payment layer*,
 *      not just a USDC system
 *
 * How it works:
 *   - Agent advertises ACCEPTED_TOKENS in x402 discovery response
 *   - Coordinator can choose which currency to pay in
 *   - Price may differ per currency (e.g. USDC cheaper, PYUSD slight premium)
 *   - EIP-3009 gasless transfer works identically for both tokens
 */

// ─── Config ──────────────────────────────────────────────────────────────

const AGENT_ID    = process.env.AGENT_ID    || "external-api";
const AGENT_PORT  = parseInt(process.env.AGENT_PORT || "3001");
const WALLET_KEY  = process.env.EXTERNAL_API_AGENT_KEY || process.env.COORDINATOR_WALLET_KEY!;
const RPC_URL     = process.env.KITE_RPC_URL || "https://rpc-testnet.gokite.ai";

// ── Supported tokens (upgrade #08) ──────────────────────────────────────
const SUPPORTED_TOKENS = {
  USDC: {
    address:  process.env.USDC_TOKEN_ADDR  || "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    decimals: 6,
    symbol:   "USDC",
    priceUSD: 1.00,
  },
  PYUSD: {
    address:  process.env.PYUSD_TOKEN_ADDR || "0x0000000000000000000000000000000000000000", // update after Kite adds PYUSD
    decimals: 6,
    symbol:   "PYUSD",
    priceUSD: 1.00, // slight premium possible for PayPal network access
  },
} as const;

type TokenSymbol = keyof typeof SUPPORTED_TOKENS;

// ── Base prices per task type (in USD) ──────────────────────────────────
const BASE_PRICES: Record<string, number> = {
  "market-data":   0.10,
  "price-feed":    0.08,
  "defi-metrics":  0.12,
  "l2-metrics":    0.10,
  "default":       0.10,
};

// ─── Dynamic Pricing Engine ──────────────────────────────────────────────

interface PriceQuote {
  token:    TokenSymbol;
  amount:   bigint;   // token units (6 decimals)
  amountUSD: number;
}

function calculatePrice(
  taskType:       string,
  preferredToken: TokenSymbol = "USDC",
  reputation:     number      = 450,
  currentLoad:    number      = 0.3   // 0..1
): PriceQuote {
  let baseUSD = BASE_PRICES[taskType] || BASE_PRICES.default;

  // Reputation premium: high-reputation agents can charge slightly more
  const repMultiplier = reputation >= 400 ? 1.10 : reputation >= 300 ? 1.00 : 0.90;

  // Load factor: busier agents charge more
  const loadMultiplier = 1 + (currentLoad * 0.3);

  // PYUSD premium: 5% for PayPal network benefit (convenience fee)
  const tokenMultiplier = preferredToken === "PYUSD" ? 1.05 : 1.00;

  const finalUSD = baseUSD * repMultiplier * loadMultiplier * tokenMultiplier;
  const token    = SUPPORTED_TOKENS[preferredToken];
  const amount   = BigInt(Math.round(finalUSD * Math.pow(10, token.decimals)));

  return { token: preferredToken, amount, amountUSD: finalUSD };
}

// ─── EIP-3009 Gasless Transfer Verification ─────────────────────────────

const ERC20_TRANSFER_WITH_AUTHORIZATION_ABI = [
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function balanceOf(address) view returns (uint256)",
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
];

async function verifyAndReceivePayment(
  authHeader:  string,
  expectedAmount: bigint,
  tokenSymbol: TokenSymbol
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const token = SUPPORTED_TOKENS[tokenSymbol];

    // Parse x402 Authorization header
    // Format: "x402 <base64-encoded-payment-json>"
    const paymentB64 = authHeader.replace("x402 ", "");
    const payment    = JSON.parse(Buffer.from(paymentB64, "base64").toString());

    // Validate token address
    if (payment.token.toLowerCase() !== token.address.toLowerCase()) {
      return { success: false, error: `Token mismatch: expected ${tokenSymbol}` };
    }

    // Validate amount
    if (BigInt(payment.amount) < expectedAmount) {
      return { success: false, error: `Insufficient payment: ${payment.amount} < ${expectedAmount}` };
    }

    // Execute gasless transfer
    const provider  = new ethers.JsonRpcProvider(RPC_URL);
    const wallet    = new ethers.Wallet(WALLET_KEY, provider);
    const tokenContract = new ethers.Contract(token.address, ERC20_TRANSFER_WITH_AUTHORIZATION_ABI, wallet);

    const tx = await tokenContract.transferWithAuthorization(
      payment.from,
      wallet.address,   // agent wallet receives payment
      payment.amount,
      payment.validAfter,
      payment.validBefore,
      payment.nonce,
      payment.v,
      payment.r,
      payment.s
    );

    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Express Server ──────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const wallet = new ethers.Wallet(WALLET_KEY);

// ── Discovery endpoint (ksearch compatible) ──────────────────────────────
app.get("/.well-known/agent", (_req, res) => {
  res.json({
    id:          AGENT_ID,
    name:        "KiteHive External API Agent",
    description: "Real-time market data via x402 and MPP. Accepts USDC and PYUSD.",
    address:     wallet.address,
    capabilities: ["market-data", "price-feed", "defi-metrics", "l2-metrics"],
    pricing: Object.entries(BASE_PRICES).map(([type, usd]) => ({
      taskType: type,
      usdc:     `${usd.toFixed(2)} USDC`,
      pyusd:    `${(usd * 1.05).toFixed(2)} PYUSD`,
    })),

    // ── x402 payment info (upgrade #08: both tokens advertised) ─────────
    payment: {
      x402: {
        supportedTokens: [
          {
            symbol:  "USDC",
            address: SUPPORTED_TOKENS.USDC.address,
            network: "kite-testnet",
            chainId: 2368,
          },
          {
            symbol:  "PYUSD",
            address: SUPPORTED_TOKENS.PYUSD.address,
            network: "kite-testnet",
            chainId: 2368,
          },
        ],
        paymentMethod: "EIP-3009 transferWithAuthorization (gasless)",
      },
      mpp: {
        endpoint:   `http://localhost:${AGENT_PORT}/mpp`,
        protocols:  ["x402", "eip3009"],
      },
    },

    reputation: 450, // from on-chain (hardcoded for discovery; update from contract in production)
    chain:      "kite-testnet",
    chainId:    2368,
  });
});

// ── RFQ endpoint — return price quote ────────────────────────────────────
app.post("/rfq", (req, res) => {
  const { taskType, preferredToken = "USDC", budget } = req.body;

  const tokenSymbol = (Object.keys(SUPPORTED_TOKENS).includes(preferredToken)
    ? preferredToken
    : "USDC") as TokenSymbol;

  const quote = calculatePrice(taskType, tokenSymbol);

  if (budget && quote.amountUSD > parseFloat(budget)) {
    return res.status(406).json({ error: "Over budget", quote });
  }

  res.json({
    agentId:   AGENT_ID,
    taskType,
    quote: {
      token:     tokenSymbol,
      amount:    quote.amount.toString(),
      amountUSD: quote.amountUSD.toFixed(4),
      address:   SUPPORTED_TOKENS[tokenSymbol].address,
    },
    validUntil: Date.now() + 60_000, // 60 second quote expiry
  });
});

// ── Task execution endpoint (x402 gated) ─────────────────────────────────
app.post("/execute", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"] || "";
  const { taskType, prompt, token: preferredToken = "USDC" } = req.body;

  if (!authHeader.startsWith("x402 ") && !authHeader.startsWith("Bearer ")) {
    const tokenSymbol = (preferredToken as TokenSymbol) in SUPPORTED_TOKENS
      ? preferredToken as TokenSymbol
      : "USDC";
    const quote = calculatePrice(taskType, tokenSymbol);

    // 402 Payment Required — standard x402 response
    return res.status(402).json({
      error:    "Payment Required",
      x402:     true,
      agentId:  AGENT_ID,
      payment: {
        token:    tokenSymbol,
        amount:   quote.amount.toString(),
        to:       wallet.address,
        network:  "kite-testnet",
        chainId:  2368,
      },
    });
  }

  // Verify payment
  const tokenSymbol  = (preferredToken as TokenSymbol) in SUPPORTED_TOKENS
    ? preferredToken as TokenSymbol
    : "USDC";
  const expectedQuote = calculatePrice(taskType, tokenSymbol);
  const payment       = await verifyAndReceivePayment(authHeader, expectedQuote.amount, tokenSymbol);

  if (!payment.success) {
    return res.status(402).json({ error: "Payment verification failed", detail: payment.error });
  }

  // ── Execute task ──────────────────────────────────────────────────────
  const result = await fetchMarketData(taskType, prompt);

  res.json({
    agentId:  AGENT_ID,
    taskType,
    result,
    payment: {
      txHash:  payment.txHash,
      token:   tokenSymbol,
      amount:  expectedQuote.amount.toString(),
      explorer: `https://testnet.kitescan.ai/tx/${payment.txHash}`,
    },
  });
});

// ─── Market Data Fetch ───────────────────────────────────────────────────

async function fetchMarketData(taskType: string, prompt: string): Promise<string> {
  // In production: fetch from CoinGecko, DeFiLlama, etc.
  // For demo: return structured mock data with realistic numbers
  const data: Record<string, string> = {
    "market-data":  `Market Data Report: Kite AI (KITE) $0.0241 | 24h +3.2% | Volume $2.1M | MCap $48M`,
    "price-feed":   `Price Feed: BTC $94,200 | ETH $3,180 | USDC $1.000 | KITE $0.0241`,
    "defi-metrics": `DeFi TVL: Aave $12.4B | Compound $3.1B | Euler $890M | Kite Ecosystem $4.2M`,
    "l2-metrics":   `L2 Activity: Arbitrum 1.2M txs/day | Optimism 890K | zkSync 2.1M | Kite 42K`,
    "default":      `Real-time data for: ${prompt}. Timestamp: ${new Date().toISOString()}`,
  };
  return data[taskType] || data.default;
}

// ─── Start ────────────────────────────────────────────────────────────────

app.listen(AGENT_PORT, () => {
  console.log(`\n🤖 ${AGENT_ID} listening on :${AGENT_PORT}`);
  console.log(`   Wallet:  ${wallet.address}`);
  console.log(`   Tokens:  USDC + PYUSD (upgrade #08)`);
  console.log(`   Discovery: http://localhost:${AGENT_PORT}/.well-known/agent`);
});

export default app;
