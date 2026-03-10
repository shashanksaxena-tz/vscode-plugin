import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";

export interface LLMAnalysisResult {
  score: number;
  insights: string[];
  suggestions: string[];
}

export interface LLMProvider {
  analyze(prompts: any[]): Promise<LLMAnalysisResult>;
}

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "anthropic";

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      return new AnthropicProvider();
  }
}
