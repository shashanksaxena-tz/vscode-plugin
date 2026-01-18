import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMAnalysisResult } from "./llm";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyze(prompts: any[]): Promise<LLMAnalysisResult> {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are an expert coding assistant coach. Analyze these developer interactions with AI coding assistants.

For the interactions below, evaluate:
1. Prompt clarity (0-100): Are prompts specific and well-formed?
2. Context usage (0-100): Do they include relevant file context?
3. Task decomposition (0-100): Are complex tasks broken down?

Then provide:
- An overall best practices score (0-100)
- 3-5 specific insights about patterns you notice
- 3-5 actionable coaching suggestions with before/after examples

Interactions to analyze:
${JSON.stringify(prompts, null, 2)}

Respond in JSON format:
{
  "score": <number>,
  "insights": ["<insight1>", "<insight2>", ...],
  "suggestions": ["<suggestion1>", "<suggestion2>", ...]
}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse LLM response:", e);
    }

    return { score: 50, insights: [], suggestions: [] };
  }
}
