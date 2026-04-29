// LLM-based task decomposition
// Breaks user tasks into subtasks assigned to specialized agents

import OpenAI from 'openai';

export interface SubTask {
  id: string;
  type: 'research' | 'writing' | 'external_api';
  description: string;
  dependencies: string[];
  estimatedComplexity: number; // 1-5
  requiredCapabilities: string[];
}

export interface DecompositionResult {
  originalTask: string;
  subtasks: SubTask[];
  reasoning: string;
  estimatedTotalCost: number;
}

const DECOMPOSITION_PROMPT = `You are the Coordinator of KiteHive, an AI agent economy.
Your job is to decompose a user task into subtasks that can be assigned to specialized agents.

Available agent types:
- research: Can search the web, gather data, analyze information
- writing: Can synthesize information into reports, summaries, analysis documents
- external_api: External x402 services for real-time data (market prices, network stats)

Rules:
1. Each subtask must have a clear, actionable description
2. Identify dependencies between subtasks (e.g., writing depends on research)
3. Estimate complexity 1-5 for each subtask
4. Minimize the number of subtasks while ensuring quality

Respond in JSON format:
{
  "subtasks": [
    {
      "id": "subtask-1",
      "type": "research|writing|external_api",
      "description": "...",
      "dependencies": [],
      "estimatedComplexity": 3,
      "requiredCapabilities": ["web_search", "data_analysis"]
    }
  ],
  "reasoning": "Brief explanation of decomposition strategy"
}`;

export class TaskDecomposer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async decompose(task: string): Promise<DecompositionResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: DECOMPOSITION_PROMPT },
          { role: 'user', content: task },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty LLM response');

      const parsed = JSON.parse(content);

      return {
        originalTask: task,
        subtasks: parsed.subtasks.map((st: any, i: number) => ({
          id: st.id || `subtask-${i + 1}`,
          type: st.type,
          description: st.description,
          dependencies: st.dependencies || [],
          estimatedComplexity: st.estimatedComplexity || 3,
          requiredCapabilities: st.requiredCapabilities || [],
        })),
        reasoning: parsed.reasoning || '',
        estimatedTotalCost: parsed.subtasks.reduce(
          (sum: number, st: any) => sum + (st.estimatedComplexity || 3) * 0.15,
          0
        ),
      };
    } catch (error) {
      // Fallback decomposition for resilience
      return this.fallbackDecomposition(task);
    }
  }

  private fallbackDecomposition(task: string): DecompositionResult {
    return {
      originalTask: task,
      subtasks: [
        {
          id: 'subtask-1',
          type: 'research',
          description: `Research and gather data for: ${task}`,
          dependencies: [],
          estimatedComplexity: 3,
          requiredCapabilities: ['web_search', 'data_analysis'],
        },
        {
          id: 'subtask-2',
          type: 'writing',
          description: `Synthesize research into a structured report for: ${task}`,
          dependencies: ['subtask-1'],
          estimatedComplexity: 3,
          requiredCapabilities: ['report_writing', 'data_synthesis'],
        },
      ],
      reasoning: 'Fallback decomposition: research → synthesis pipeline',
      estimatedTotalCost: 0.90,
    };
  }

  async *decomposeStreaming(task: string): AsyncGenerator<string> {
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: DECOMPOSITION_PROMPT },
        { role: 'user', content: task },
      ],
      stream: true,
      temperature: 0.3,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
