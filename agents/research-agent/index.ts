// Research Agent — searches web, gathers data, analyzes information
// x402 endpoint with dynamic pricing

import { PricingEngine } from '../worker-template/pricing-engine';
import { createX402Server } from '../worker-template/x402-server';
import OpenAI from 'openai';

const AGENT_ID = 'research-agent-a';
const WALLET_ADDRESS = process.env.RESEARCH_AGENT_WALLET || '0x0000000000000000000000000000000000000001';

const pricing = new PricingEngine({
  basePrice: 0.40,
  maxPrice: 2.00,
  minPrice: 0.10,
});

let openai: OpenAI;

async function handleQuote(rfq: any) {
  const quote = pricing.generateQuote(rfq.complexity || 3);
  return {
    agentId: AGENT_ID,
    ...quote,
    capabilities: ['web_search', 'data_analysis', 'competitive_research'],
  };
}

async function handleExecute(task: any) {
  pricing.setLoad(1); // Simulate being busy

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a research agent specialized in gathering and analyzing data.
Provide thorough, factual research with sources when possible.
Format your output as structured data with clear sections.`,
        },
        { role: 'user', content: task.description },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || 'Research completed but no content generated.';

    return {
      agentId: AGENT_ID,
      taskId: task.taskId,
      type: 'research',
      content,
      metadata: {
        model: 'gpt-4o',
        tokensUsed: response.usage?.total_tokens || 0,
        completedAt: new Date().toISOString(),
      },
    };
  } finally {
    pricing.setLoad(0);
  }
}

export function startResearchAgent(port: number = 3001, apiKey?: string) {
  openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

  const server = createX402Server({
    agentId: AGENT_ID,
    walletAddress: WALLET_ADDRESS,
    facilitatorUrl: 'https://facilitator.gokite.ai',
    port,
    executeHandler: handleExecute,
    quoteHandler: handleQuote,
  });

  return server;
}

// Direct execution
if (require.main === module) {
  startResearchAgent().then((s) => s.start());
}
