// LLM decision explanation — explains bandit's mathematical decision in natural language
import OpenAI from 'openai';

export interface DecisionContext {
  selectedAgentId: string;
  qualitySample: number;
  explorationBonus: number;
  isExploration: boolean;
  selectedPrice: number;
  allCandidates: {
    id: string;
    price: number;
    completedTasks: number;
    sample: number;
    score: number;
  }[];
}

export class DecisionExplainer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });
  }

  async explain(context: DecisionContext): Promise<string> {
    const candidateList = context.allCandidates
      .map(
        (c) =>
          `${c.id}: price=$${c.price.toFixed(2)}, ${c.completedTasks} tasks, sampled quality=${c.sample.toFixed(3)}, score=${c.score.toFixed(3)}`
      )
      .join('\n');

    const prompt = `A Thompson Sampling algorithm selected ${context.selectedAgentId}.

Context:
- Sampled quality estimate: ${context.qualitySample.toFixed(3)}
- Price: $${context.selectedPrice.toFixed(2)}
- Exploration bonus: ${context.explorationBonus.toFixed(3)} (${context.isExploration ? 'HIGH uncertainty — exploring' : 'LOW uncertainty — exploiting'})

All candidates:
${candidateList}

Write 2 sentences explaining why this agent was selected, noting whether this was exploration or exploitation. Be specific about numbers.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 200,
      });
      return response.choices[0]?.message?.content || this.fallbackExplanation(context);
    } catch {
      return this.fallbackExplanation(context);
    }
  }

  async *explainStreaming(context: DecisionContext): AsyncGenerator<string> {
    const candidateList = context.allCandidates
      .map(
        (c) =>
          `${c.id}: price=$${c.price.toFixed(2)}, ${c.completedTasks} tasks, sampled quality=${c.sample.toFixed(3)}`
      )
      .join('\n');

    const prompt = `A Thompson Sampling algorithm selected ${context.selectedAgentId}.
Context: quality=${context.qualitySample.toFixed(3)}, price=$${context.selectedPrice.toFixed(2)}, exploration=${context.isExploration}
Candidates:\n${candidateList}
Write 2 sentences explaining the selection decision.`;

    const stream = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.5,
      max_tokens: 200,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  private fallbackExplanation(context: DecisionContext): string {
    const mode = context.isExploration ? 'EXPLORATION' : 'EXPLOITATION';
    return `[${mode}] Selected ${context.selectedAgentId} with sampled quality ${context.qualitySample.toFixed(3)} at $${context.selectedPrice.toFixed(2)}. ${context.isExploration ? `High uncertainty (bonus ${context.explorationBonus.toFixed(3)}) — giving this agent a trial run to reduce uncertainty.` : `Low uncertainty — this agent has a proven track record justifying the price.`}`;
  }
}
