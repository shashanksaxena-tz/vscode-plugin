export interface LLMAnalysisResult {
  score: number;
  insights: string[];
  suggestions: string[];
}

export interface LLMProvider {
  analyze(prompts: any[]): Promise<LLMAnalysisResult>;
}

export function getLLMProvider(): LLMProvider {
    // Stub implementation for now
    return {
        analyze: async () => ({ score: 0, insights: [], suggestions: [] })
    };
}
