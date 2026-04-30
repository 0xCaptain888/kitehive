import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

/**
 * LLM Configuration — KiteHive
 *
 * Primary:  DeepSeek (deepseek-chat / deepseek-reasoner)
 *   - OpenAI-compatible API at https://api.deepseek.com
 *   - ~15x cheaper than GPT-4o for the same capability class
 *   - Critical for an "Agentic Economy" — agent calls cost real money,
 *     so minimising LLM cost per task directly improves profit margins
 *   - Ideal for high-volume coordinator reasoning (Thompson Sampling
 *     explanations, task decomposition, quality evaluation)
 *
 * Fallback: OpenAI GPT-4o (if DEEPSEEK_API_KEY is not set)
 *   - Used automatically if only OPENAI_API_KEY is present
 *
 * NOTE: All references to "GPT-4o" in the architecture diagram and README
 * have been corrected to "DeepSeek" to match this file. (#06 fix)
 */

// ─── Model Config ─────────────────────────────────────────────────────────

export const LLM_PROVIDER = process.env.DEEPSEEK_API_KEY ? "deepseek" : "openai";

export const MODEL_ID = process.env.DEEPSEEK_API_KEY
  ? (process.env.DEEPSEEK_MODEL || "deepseek-chat")  // or "deepseek-reasoner" for CoT
  : (process.env.OPENAI_MODEL   || "gpt-4o");

export const MODEL_LABEL = LLM_PROVIDER === "deepseek"
  ? `DeepSeek (${MODEL_ID})`
  : `OpenAI (${MODEL_ID})`;

// ─── OpenAI-compatible client ─────────────────────────────────────────────

/**
 * Raw OpenAI client — used for non-streaming calls (quality scoring, decomposition)
 * Accepts both DeepSeek and OpenAI endpoints transparently.
 */
export const llmClient = new OpenAI(
  process.env.DEEPSEEK_API_KEY
    ? {
        apiKey:  process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com",
      }
    : {
        apiKey: process.env.OPENAI_API_KEY,
      }
);

/**
 * Vercel AI SDK provider — used for streaming responses (Negotiation Log)
 */
const aiProvider = process.env.DEEPSEEK_API_KEY
  ? createOpenAI({
      apiKey:  process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    })
  : createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const streamingModel = aiProvider(MODEL_ID);

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Non-streaming completion — for structured JSON responses (task decomposition,
 * quality evaluation, Thompson Sampling explanation).
 */
export async function complete(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens:    number = 1000
): Promise<string> {
  const resp = await llmClient.chat.completions.create({
    model:       MODEL_ID,
    max_tokens:  maxTokens,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
  });
  return resp.choices[0]?.message?.content || "";
}

/**
 * Streaming completion — for Negotiation Log SSE panel.
 * Returns a ReadableStream compatible with Next.js SSE route handlers.
 */
export async function streamComplete(
  systemPrompt: string,
  userPrompt:   string
) {
  return streamText({
    model: streamingModel,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
  });
}

/**
 * JSON completion — parses LLM output as JSON automatically.
 * Falls back to {} on parse error (never throws).
 */
export async function completeJSON<T = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens:    number = 800
): Promise<T> {
  const raw = await complete(
    systemPrompt + "\n\nRespond ONLY with valid JSON. No markdown, no backticks, no preamble.",
    userPrompt,
    maxTokens
  );
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
  } catch {
    console.error("[llm] JSON parse error:", raw.slice(0, 200));
    return {} as T;
  }
}

// Log on startup so it's visible in Vercel function logs
console.log(`[llm] Using ${MODEL_LABEL} (provider: ${LLM_PROVIDER})`);
