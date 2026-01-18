import { AnthropicProvider } from "./anthropic";

export interface LLMAnalysisResult {
  score: number;
  insights: string[];
  suggestions: string[];
}

export interface LLMProvider {
  analyze(prompts: any[]): Promise<LLMAnalysisResult>;
}

export function getLLMProvider(): LLMProvider {
  // Default to Anthropic for now
  return new AnthropicProvider();
}
