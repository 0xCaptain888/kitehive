// Writer Agent — synthesizes research into reports, summaries, analysis documents
import { PricingEngine } from '../worker-template/pricing-engine';
import { createX402Server } from '../worker-template/x402-server';
import OpenAI from 'openai';

const AGENT_ID = 'writer-agent-a';
const WALLET_ADDRESS = process.env.WRITER_AGENT_WALLET || '0x0000000000000000000000000000000000000002';

const pricing = new PricingEngine({
  basePrice: 0.30,
  maxPrice: 1.50,
  minPrice: 0.08,
});

let openai: OpenAI;

async function handleQuote(rfq: any) {
  const quote = pricing.generateQuote(rfq.complexity || 3);
  return {
    agentId: AGENT_ID,
    ...quote,
    capabilities: ['report_writing', 'data_synthesis', 'competitive_analysis'],
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
          content: `You are a professional writer agent. Synthesize provided research into well-structured reports.
Include: executive summary, key findings, comparison tables (markdown), and actionable insights.
Be concise but thorough. Use markdown formatting.`,
        },
        { role: 'user', content: `Research data:\n${JSON.stringify(task.data || task.description)}\n\nTask: ${task.description}` },
      ],
      temperature: 0.4,
      max_tokens: 3000,
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

export function startWriterAgent(port: number = 3002, apiKey?: string) {
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
  startWriterAgent().then((s) => s.start());
}
