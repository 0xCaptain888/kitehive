// Writer Agent B — alternative writer for competition dynamics and failover
import { PricingEngine } from '../worker-template/pricing-engine';
import { createX402Server } from '../worker-template/x402-server';
import OpenAI from 'openai';

const AGENT_ID = 'writer-agent-b';
const WALLET_ADDRESS = process.env.WRITER_AGENT_B_WALLET || '0x0000000000000000000000000000000000000003';

const pricing = new PricingEngine({
  basePrice: 0.25, // Slightly cheaper — competitive dynamics
  maxPrice: 1.20,
  minPrice: 0.05,
});

let openai: OpenAI;

async function handleQuote(rfq: any) {
  const quote = pricing.generateQuote(rfq.complexity || 3);
  return {
    agentId: AGENT_ID,
    ...quote,
    capabilities: ['report_writing', 'summary', 'bullet_points'],
  };
}

async function handleExecute(task: any) {
  pricing.setLoad(1);
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Writer Agent B — a concise, efficient writer.
Your style is more bullet-point focused and direct compared to verbose report writers.
Prioritize clarity and actionability over length.`,
        },
        { role: 'user', content: task.description },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    return {
      agentId: AGENT_ID,
      taskId: task.taskId,
      type: 'writing',
      content: response.choices[0]?.message?.content || '',
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

export function startWriterAgentB(port: number = 3003, apiKey?: string) {
  openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

  return createX402Server({
    agentId: AGENT_ID,
    walletAddress: WALLET_ADDRESS,
    facilitatorUrl: 'https://facilitator.gokite.ai',
    port,
    executeHandler: handleExecute,
    quoteHandler: handleQuote,
  });
}

if (require.main === module) {
  startWriterAgentB().then((s) => s.start());
}
