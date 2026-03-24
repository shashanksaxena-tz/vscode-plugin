import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { createClient } from "../utils/supabase";

export interface LLMAnalysisResult {
  score: number;
  insights: string[];
  suggestions: string[];
}

export interface LLMProvider {
  analyze(prompts: any[]): Promise<LLMAnalysisResult>;
}

export async function getLLMProvider(): Promise<LLMProvider> {
  let provider = process.env.LLM_PROVIDER || "anthropic";

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "LLM_PROVIDER")
      .single();

    if (!error && data?.value) {
      provider = String(data.value);
    }
  } catch (e) {
    console.error("Failed to fetch LLM_PROVIDER from system_settings, using fallback.", e);
  }

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
