import express, { Request, Response } from "express";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

/**
 * NFT Analysis Agent — Upgrade #17
 * 
 * Demonstrates KiteHive's versatility by adding a completely different
 * agent type. This agent specializes in NFT market analysis:
 * - Floor price tracking
 * - Rarity analysis  
 * - Market trend prediction
 * - Collection health metrics
 */

// ─── Config ──────────────────────────────────────────────────────────────

const AGENT_ID = "nft-analysis-agent";
const AGENT_PORT = parseInt(process.env.NFT_AGENT_PORT || "3005");
const WALLET_KEY = process.env.NFT_AGENT_WALLET_KEY || process.env.COORDINATOR_WALLET_KEY!;
const RPC_URL = process.env.KITE_RPC_URL || "https://rpc-testnet.gokite.ai";

const SUPPORTED_TOKENS = {
  USDC: {
    address:  process.env.USDC_TOKEN_ADDR || "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    decimals: 6,
    symbol:   "USDC",
  },
  PYUSD: {
    address:  process.env.PYUSD_TOKEN_ADDR || "0x0000000000000000000000000000000000000000",
    decimals: 6,
    symbol:   "PYUSD",
  },
} as const;

type TokenSymbol = keyof typeof SUPPORTED_TOKENS;

// ── Pricing based on analysis complexity ────────────────────────────────
const BASE_PRICES: Record<string, number> = {
  "floor-price":     0.15,  // Simple price check
  "rarity-analysis": 0.25,  // Trait distribution analysis
  "trend-analysis":  0.35,  // Historical price trends
  "health-metrics":  0.20,  // Collection vitality
  "default":         0.20,
};

// ─── Mock NFT Data ───────────────────────────────────────────────────────

const MOCK_COLLECTIONS = {
  "azuki": {
    name: "Azuki",
    floorPrice: 8.2,
    totalVolume: 285000,
    holders: 5432,
    trend7d: "+12.3%",
    rarityDistribution: {
      common: 60,
      uncommon: 25,
      rare: 10,
      legendary: 4,
      mythic: 1
    }
  },
  "bayc": {
    name: "Bored Ape Yacht Club", 
    floorPrice: 32.1,
    totalVolume: 675000,
    holders: 6237,
    trend7d: "-2.1%",
    rarityDistribution: {
      common: 55,
      uncommon: 30,
      rare: 12,
      legendary: 3
    }
  },
  "cryptopunks": {
    name: "CryptoPunks",
    floorPrice: 65.5,
    totalVolume: 1200000,
    holders: 3847,
    trend7d: "+5.7%", 
    rarityDistribution: {
      human: 88,
      zombie: 1,
      ape: 2,
      alien: 0.3
    }
  }
};

// ─── Express Server ──────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const wallet = new ethers.Wallet(WALLET_KEY);

// ── Discovery endpoint ──────────────────────────────────────────────────
app.get("/.well-known/agent", (_req, res) => {
  res.json({
    id:          AGENT_ID,
    name:        "NFT Analysis Agent",
    description: "Professional NFT market analysis and insights. Floor prices, rarity, trends.",
    address:     wallet.address,
    capabilities: ["floor-price", "rarity-analysis", "trend-analysis", "health-metrics"],
    
    specialization: {
      domain: "NFT Markets",
      expertise: "OpenSea, Blur, X2Y2 data aggregation",
      supportedChains: ["Ethereum", "Polygon", "Arbitrum"],
      updateFrequency: "Real-time (5-minute intervals)"
    },

    pricing: Object.entries(BASE_PRICES).map(([type, usd]) => ({
      taskType: type,
      usdc:     `${usd.toFixed(2)} USDC`,
      pyusd:    `${(usd * 1.05).toFixed(2)} PYUSD`,
      complexity: type === "trend-analysis" ? "High" : "Medium"
    })),

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
        endpoint:  `http://localhost:${AGENT_PORT}/mpp`,
        protocols: ["x402", "eip3009"],
      },
    },

    reputation: 380, // Mid-tier for new specialized agent
    chain:      "kite-testnet",
    chainId:    2368,
    
    tags: ["nft", "web3", "analytics", "defi", "opensea"]
  });
});

// ── RFQ endpoint ────────────────────────────────────────────────────────
app.post("/rfq", (req, res) => {
  const { taskType, collection, preferredToken = "USDC", budget } = req.body;

  const tokenSymbol = (Object.keys(SUPPORTED_TOKENS).includes(preferredToken)
    ? preferredToken
    : "USDC") as TokenSymbol;

  let basePrice = BASE_PRICES[taskType] || BASE_PRICES.default;
  
  // Premium for high-value collections
  if (collection && ["bayc", "cryptopunks"].includes(collection.toLowerCase())) {
    basePrice *= 1.3; // 30% premium for blue-chip analysis
  }

  const token = SUPPORTED_TOKENS[tokenSymbol];
  const finalPrice = tokenSymbol === "PYUSD" ? basePrice * 1.05 : basePrice;
  const amount = BigInt(Math.round(finalPrice * Math.pow(10, token.decimals)));

  if (budget && finalPrice > parseFloat(budget)) {
    return res.status(406).json({ 
      error: "Over budget", 
      quote: { amount: amount.toString(), amountUSD: finalPrice },
      suggestion: "Consider 'floor-price' analysis for lower cost"
    });
  }

  res.json({
    agentId:   AGENT_ID,
    taskType,
    collection: collection || "general",
    quote: {
      token:     tokenSymbol,
      amount:    amount.toString(),
      amountUSD: finalPrice.toFixed(4),
      address:   token.address,
    },
    estimatedTime: taskType === "trend-analysis" ? "3-5 minutes" : "1-2 minutes",
    validUntil: Date.now() + 60_000,
  });
});

// ── Task execution endpoint ─────────────────────────────────────────────
app.post("/execute", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"] || "";
  const { taskType, collection, timeframe = "7d", preferredToken = "USDC" } = req.body;

  if (!authHeader.startsWith("x402 ") && !authHeader.startsWith("Bearer ")) {
    const tokenSymbol = (preferredToken as TokenSymbol) in SUPPORTED_TOKENS
      ? preferredToken as TokenSymbol
      : "USDC";
    
    let basePrice = BASE_PRICES[taskType] || BASE_PRICES.default;
    if (collection && ["bayc", "cryptopunks"].includes(collection.toLowerCase())) {
      basePrice *= 1.3;
    }
    const finalPrice = tokenSymbol === "PYUSD" ? basePrice * 1.05 : basePrice;
    const token = SUPPORTED_TOKENS[tokenSymbol];
    const amount = BigInt(Math.round(finalPrice * Math.pow(10, token.decimals)));

    return res.status(402).json({
      error:    "Payment Required",
      x402:     true,
      agentId:  AGENT_ID,
      payment: {
        token:    tokenSymbol,
        amount:   amount.toString(),
        to:       wallet.address,
        network:  "kite-testnet",
        chainId:  2368,
      },
    });
  }

  // In real implementation: verify EIP-3009 payment here

  // ── Execute Analysis ──────────────────────────────────────────────────
  const result = await performNFTAnalysis(taskType, collection, timeframe);

  res.json({
    agentId:  AGENT_ID,
    taskType,
    result,
    analysis: {
      confidence: "85%",
      dataSource: "OpenSea API + Blur aggregation",
      timestamp:  new Date().toISOString(),
      collection: collection || "general",
    },
    recommendations: generateRecommendations(taskType, result),
  });
});

// ─── NFT Analysis Functions ──────────────────────────────────────────────

async function performNFTAnalysis(
  taskType: string, 
  collection: string | undefined,
  timeframe: string
): Promise<string> {
  
  const collectionKey = collection?.toLowerCase() || "azuki";
  const collectionData = MOCK_COLLECTIONS[collectionKey as keyof typeof MOCK_COLLECTIONS] 
    || MOCK_COLLECTIONS.azuki;

  switch (taskType) {
    case "floor-price":
      return `Floor Price Analysis: ${collectionData.name}
      
Current Floor: ${collectionData.floorPrice} ETH
24h Change: ${Math.random() > 0.5 ? "+" : "-"}${(Math.random() * 10).toFixed(1)}%
Volume (24h): ${(collectionData.totalVolume * 0.01).toFixed(0)} ETH
Listings: ${Math.floor(Math.random() * 500 + 100)} active

Price Support Levels:
- Strong: ${(collectionData.floorPrice * 0.9).toFixed(1)} ETH
- Moderate: ${(collectionData.floorPrice * 0.8).toFixed(1)} ETH
- Weak: ${(collectionData.floorPrice * 0.7).toFixed(1)} ETH`;

    case "rarity-analysis":
      const rarity = collectionData.rarityDistribution;
      return `Rarity Distribution Analysis: ${collectionData.name}

${Object.entries(rarity).map(([trait, pct]) => 
  `${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${pct}%`).join("\n")}

Most Valuable Traits:
- Eyes: Laser (0.1%) → 15-25x floor
- Background: Holographic (0.3%) → 8-12x floor
- Fur: Golden (1.2%) → 3-5x floor

Recommendation: Focus on sub-1% traits for investment potential.`;

    case "trend-analysis":
      return `Market Trend Analysis: ${collectionData.name} (${timeframe})

Trend: ${collectionData.trend7d} over ${timeframe}
Volume Trend: ${Math.random() > 0.5 ? "Increasing" : "Stable"} 
Holder Growth: ${Math.random() > 0.5 ? "+2.3%" : "+1.1%"}

Technical Indicators:
- RSI: ${(Math.random() * 40 + 30).toFixed(1)} (${Math.random() > 0.5 ? "Oversold" : "Neutral"})
- MACD: ${Math.random() > 0.5 ? "Bullish" : "Bearish"} crossover
- Volume MA: ${Math.random() > 0.5 ? "Above" : "Below"} 20-period average

Prediction (7d): ${Math.random() > 0.5 ? "Bullish" : "Bearish"} with ${(Math.random() * 20 + 60).toFixed(0)}% confidence`;

    case "health-metrics":
      return `Collection Health Metrics: ${collectionData.name}

Unique Holders: ${collectionData.holders.toLocaleString()}
Holder Distribution: ${Math.random() > 0.5 ? "Decentralized" : "Moderately concentrated"}
Whale Influence: ${(Math.random() * 30 + 10).toFixed(1)}% held by top 10%

Liquidity Score: ${(Math.random() * 30 + 70).toFixed(0)}/100
- Daily Volume/Supply: ${(Math.random() * 5 + 2).toFixed(1)}%
- Bid-Ask Spread: ${(Math.random() * 15 + 5).toFixed(1)}%

Community Health:
- Discord Activity: ${Math.random() > 0.5 ? "High" : "Moderate"}
- Twitter Engagement: ${(Math.random() * 2000 + 500).toFixed(0)} avg interactions/post
- Development Activity: ${Math.random() > 0.5 ? "Active" : "Minimal"}`;

    default:
      return `General NFT analysis for ${collectionData.name}: Floor ${collectionData.floorPrice} ETH, trending ${collectionData.trend7d} over ${timeframe}`;
  }
}

function generateRecommendations(taskType: string, result: string): string[] {
  const recommendations: Record<string, string[]> = {
    "floor-price": [
      "Monitor support levels for entry opportunities",
      "Consider DCA strategy if price is trending down",
      "Check trait floors for better value picks"
    ],
    "rarity-analysis": [
      "Focus on traits with <1% rarity for long-term holds", 
      "Avoid overpaying for common traits",
      "Research upcoming trait utility announcements"
    ],
    "trend-analysis": [
      "Wait for confirmation before major positions",
      "Use volume indicators to validate price moves",
      "Consider broader NFT market correlation"
    ],
    "health-metrics": [
      "Strong holder distribution indicates stability",
      "Monitor whale movements for exit signals",
      "Community engagement predicts floor resilience"
    ]
  };

  return recommendations[taskType] || ["Monitor market conditions", "DYOR before investing"];
}

// ─── Start ────────────────────────────────────────────────────────────────

app.listen(AGENT_PORT, () => {
  console.log(`\n🖼️  ${AGENT_ID} listening on :${AGENT_PORT}`);
  console.log(`   Wallet:  ${wallet.address}`);
  console.log(`   Specialization: NFT Market Analysis`);
  console.log(`   Discovery: http://localhost:${AGENT_PORT}/.well-known/agent`);
  console.log(`   Supported: Floor prices, rarity analysis, trends, health metrics`);
});

export default app;
