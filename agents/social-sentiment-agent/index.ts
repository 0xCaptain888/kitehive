import express, { Request, Response } from "express";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

/**
 * Social Sentiment Agent — Upgrade #17
 * 
 * Another agent type demonstrating KiteHive versatility:
 * - Twitter sentiment analysis for crypto projects
 * - Discord community health monitoring  
 * - Influencer impact tracking
 * - Social volume correlation with price
 */

const AGENT_ID = "social-sentiment-agent";
const AGENT_PORT = parseInt(process.env.SOCIAL_AGENT_PORT || "3006");
const WALLET_KEY = process.env.SOCIAL_AGENT_WALLET_KEY || process.env.COORDINATOR_WALLET_KEY!;

const BASE_PRICES: Record<string, number> = {
  "twitter-sentiment":  0.12,
  "discord-health":     0.18,
  "influencer-impact":  0.22,
  "social-volume":      0.15,
  "sentiment-report":   0.30, // Full comprehensive report
  "default":            0.15,
};

// Mock social data
const SOCIAL_DATA = {
  "ethereum": {
    twitter: { followers: 3200000, mentions24h: 15420, sentiment: 0.72 },
    discord: { members: 25000, activeDaily: 8500, healthScore: 0.85 },
    influencers: ["VitalikButerin", "EthereumJoe", "sassal0x"]
  },
  "bitcoin": {
    twitter: { followers: 5800000, mentions24h: 28350, sentiment: 0.68 },
    discord: { members: 45000, activeDaily: 12000, healthScore: 0.78 },
    influencers: ["saylor", "aantonop", "lopp"]
  },
  "solana": {
    twitter: { followers: 1200000, mentions24h: 9840, sentiment: 0.81 },
    discord: { members: 180000, activeDaily: 45000, healthScore: 0.92 },
    influencers: ["aeyakovenko", "rajgokal", "mertmumtaz"]
  }
};

const app = express();
app.use(express.json());
const wallet = new ethers.Wallet(WALLET_KEY);

// ── Discovery endpoint ──────────────────────────────────────────────────
app.get("/.well-known/agent", (_req, res) => {
  res.json({
    id:          AGENT_ID,
    name:        "Social Sentiment Agent",
    description: "Crypto social sentiment analysis across Twitter, Discord, Telegram, Reddit.",
    address:     wallet.address,
    capabilities: ["twitter-sentiment", "discord-health", "influencer-impact", "social-volume", "sentiment-report"],
    
    specialization: {
      domain: "Social Intelligence",
      expertise: "NLP, sentiment analysis, social graph mapping",
      dataSources: ["Twitter API", "Discord metrics", "Reddit API", "Telegram analytics"],
      updateFrequency: "Real-time streaming"
    },

    pricing: Object.entries(BASE_PRICES).map(([type, usd]) => ({
      taskType: type,
      usdc:     `${usd.toFixed(2)} USDC`,
      description: getTaskDescription(type)
    })),

    payment: {
      x402: {
        supportedTokens: [{
          symbol:  "USDC",
          address: process.env.USDC_TOKEN_ADDR || "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
          network: "kite-testnet",
          chainId: 2368,
        }],
      },
    },

    reputation: 340,
    tags: ["social", "sentiment", "twitter", "discord", "crypto"]
  });
});

function getTaskDescription(taskType: string): string {
  const descriptions = {
    "twitter-sentiment": "Analyze Twitter mentions and sentiment for crypto projects",
    "discord-health": "Monitor Discord community engagement and health metrics",
    "influencer-impact": "Track crypto influencer mentions and impact analysis", 
    "social-volume": "Correlate social media volume with price movements",
    "sentiment-report": "Comprehensive social sentiment across all platforms",
    "default": "General social sentiment analysis"
  };
  return descriptions[taskType] || descriptions.default;
}

// ── RFQ + Execution endpoints (simplified for demo) ─────────────────────
app.post("/rfq", (req, res) => {
  const { taskType, project, timeframe = "24h" } = req.body;
  const price = BASE_PRICES[taskType] || BASE_PRICES.default;
  const amount = BigInt(Math.round(price * 1_000_000));

  res.json({
    agentId: AGENT_ID,
    taskType,
    quote: {
      token: "USDC",
      amount: amount.toString(), 
      amountUSD: price.toFixed(3),
    },
    estimatedTime: "2-4 minutes",
    validUntil: Date.now() + 60_000,
  });
});

app.post("/execute", async (req: Request, res: Response) => {
  const { taskType, project = "ethereum", timeframe = "24h" } = req.body;

  // Mock payment check...
  if (!req.headers["authorization"]) {
    return res.status(402).json({ error: "Payment Required" });
  }

  const result = await performSentimentAnalysis(taskType, project, timeframe);

  res.json({
    agentId: AGENT_ID,
    taskType,
    result,
    metadata: {
      project,
      timeframe,
      confidence: "82%",
      dataPoints: Math.floor(Math.random() * 5000 + 1000),
      timestamp: new Date().toISOString()
    }
  });
});

async function performSentimentAnalysis(taskType: string, project: string, timeframe: string): Promise<string> {
  const data = SOCIAL_DATA[project.toLowerCase() as keyof typeof SOCIAL_DATA] || SOCIAL_DATA.ethereum;

  switch (taskType) {
    case "twitter-sentiment":
      return `Twitter Sentiment Analysis: ${project.toUpperCase()} (${timeframe})

Overall Sentiment: ${(data.twitter.sentiment * 100).toFixed(1)}% Positive
Mentions: ${data.twitter.mentions24h.toLocaleString()} (${timeframe})
Followers: ${(data.twitter.followers / 1000000).toFixed(1)}M

Sentiment Breakdown:
- Positive: ${(data.twitter.sentiment * 100).toFixed(1)}%
- Neutral: ${((1 - data.twitter.sentiment) * 60).toFixed(1)}%  
- Negative: ${((1 - data.twitter.sentiment) * 40).toFixed(1)}%

Trending Topics: #${project.toLowerCase()}, price, development, partnerships
Engagement Rate: ${(Math.random() * 3 + 2).toFixed(1)}%`;

    case "discord-health":
      return `Discord Community Health: ${project.toUpperCase()}

Total Members: ${data.discord.members.toLocaleString()}
Daily Active: ${data.discord.activeDaily.toLocaleString()} (${(data.discord.activeDaily/data.discord.members*100).toFixed(1)}%)
Health Score: ${(data.discord.healthScore * 100).toFixed(0)}/100

Community Metrics:
- Message Velocity: ${Math.floor(Math.random() * 500 + 200)} msgs/hour
- New Joins (24h): ${Math.floor(Math.random() * 100 + 50)}
- Retention Rate: ${(Math.random() * 20 + 75).toFixed(1)}%
- Moderator Ratio: ${(Math.random() * 2 + 1).toFixed(1)}%

Activity Hotspots: #general, #price-discussion, #development`;

    case "influencer-impact":
      return `Influencer Impact Analysis: ${project.toUpperCase()}

Top Influencers (by reach):
${data.influencers.map((inf, i) => `${i+1}. @${inf} - ${Math.floor(Math.random() * 500 + 100)}k followers`).join("\n")}

Impact Metrics (${timeframe}):
- Combined Reach: ${(Math.random() * 2 + 1).toFixed(1)}M impressions
- Engagement Rate: ${(Math.random() * 5 + 3).toFixed(1)}%
- Sentiment Tone: ${Math.random() > 0.6 ? "Bullish" : "Neutral"}

Correlation with Price: ${(Math.random() * 0.4 + 0.3).toFixed(2)} (moderate)`;

    case "social-volume":
      return `Social Volume Analysis: ${project.toUpperCase()}

Volume Metrics (${timeframe}):
- Twitter: ${data.twitter.mentions24h.toLocaleString()} mentions
- Discord: ${Math.floor(Math.random() * 2000 + 500)} messages  
- Reddit: ${Math.floor(Math.random() * 300 + 100)} posts/comments
- Telegram: ${Math.floor(Math.random() * 800 + 200)} messages

Volume vs Price Correlation: ${(Math.random() * 0.5 + 0.4).toFixed(2)}
Trend: ${Math.random() > 0.5 ? "Increasing" : "Stable"} volume
Peak Activity: ${Math.floor(Math.random() * 12 + 1)}:00-${Math.floor(Math.random() * 12 + 13)}:00 UTC`;

    case "sentiment-report":
      return `Comprehensive Sentiment Report: ${project.toUpperCase()}

Executive Summary:
Overall sentiment is ${data.twitter.sentiment > 0.7 ? "BULLISH" : "NEUTRAL"} across all platforms.

Platform Breakdown:
- Twitter: ${(data.twitter.sentiment * 100).toFixed(1)}% positive (${data.twitter.mentions24h.toLocaleString()} mentions)
- Discord: ${(data.discord.healthScore * 100).toFixed(0)}% health score (${data.discord.activeDaily.toLocaleString()} active)
- Reddit: ${(Math.random() * 40 + 50).toFixed(1)}% positive (${Math.floor(Math.random() * 200 + 50)} posts)

Key Insights:
- Community engagement is ${data.discord.healthScore > 0.8 ? "strong" : "moderate"}
- Price correlation: ${(Math.random() * 0.6 + 0.2).toFixed(2)}
- Influencer sentiment: ${Math.random() > 0.6 ? "Positive" : "Mixed"}

Recommendation: ${data.twitter.sentiment > 0.7 ? "Monitor for continuation" : "Watch for sentiment reversal"}`;

    default:
      return `General sentiment for ${project}: ${(data.twitter.sentiment * 100).toFixed(1)}% positive sentiment across ${data.twitter.mentions24h} mentions`;
  }
}

app.listen(AGENT_PORT, () => {
  console.log(`\n📱 ${AGENT_ID} listening on :${AGENT_PORT}`);
  console.log(`   Specialization: Social Sentiment Analysis`);
  console.log(`   Platforms: Twitter, Discord, Reddit, Telegram`);
});

export default app;
