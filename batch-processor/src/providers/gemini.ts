import { GoogleGenAI } from "@google/genai";
import { LLMProvider, LLMAnalysisResult } from "./llm";

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async analyze(prompts: any[]): Promise<LLMAnalysisResult> {
    const response = await this.client.models.generateContent({
      model: "gemini-1.5-pro",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an expert coding assistant coach. Analyze these developer interactions with AI coding assistants.

For the interactions below, evaluate:
1. Prompt clarity (0-100): Are prompts specific and well-formed?
2. Context usage (0-100): Do they include relevant file context?
3. Task decomposition (0-100): Are complex tasks broken down?

Then provide:
- An overall best practices score (0-100)
- 3-5 specific insights about patterns you notice
- 3-5 actionable coaching suggestions with before/after examples. Focus on how to improve context management and prompt structure.

Interactions to analyze:
${JSON.stringify(prompts, null, 2)}

Respond ONLY in valid JSON format (no markdown code blocks), adhering to this schema:
{
  "score": <number>,
  "insights": ["<insight1>", "<insight2>", ...],
  "suggestions": ["<suggestion1>", "<suggestion2>", ...]
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";

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
