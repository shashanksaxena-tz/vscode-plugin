import { calculateEffectivenessScore, calculateEfficiencyScore } from "./ruleBasedScoring";

describe("Rule-Based Scoring Logic", () => {
  describe("Effectiveness Score", () => {
    it("should handle empty metrics", () => {
      expect(calculateEffectivenessScore([])).toBe(50);
    });

    it("should handle zero prompts", () => {
      expect(calculateEffectivenessScore([{ total_prompts: 0, accepted_count: 0, retry_count: 0 }])).toBe(50);
    });

    it("should bound score to 100 maximum", () => {
      // 100% acceptance, no retries
      expect(calculateEffectivenessScore([{ total_prompts: 10, accepted_count: 10, retry_count: 0 }])).toBe(100);
    });

    it("should bound score to 0 minimum", () => {
        // 0% acceptance, 10 retries per prompt (retry rate > 1) -> 0 * 80 + (1 - 10) * 20 = -180. Should be 0.
        expect(calculateEffectivenessScore([{ total_prompts: 10, accepted_count: 0, retry_count: 100 }])).toBe(0);
    });
  });

  describe("Efficiency Score", () => {
    it("should handle empty metrics", () => {
      expect(calculateEfficiencyScore([])).toBe(50);
    });

    it("should handle zero total prompts", () => {
      expect(calculateEfficiencyScore([{ total_prompts: 0, avg_response_time_ms: 100, total_tokens_used: 100 }])).toBe(50);
    });

    it("should calculate correctly for normal bounds with weighted averages", () => {
        // Day 1: 10 prompts, 2000ms latency, 15000 tokens total (1500/prompt)
        // Day 2: 5 prompts, 3000ms latency, 15000 tokens total (3000/prompt)
        // Total prompts = 15
        // Avg latency = (10*2000 + 5*3000)/15 = 35000/15 = 2333.33ms -> score = 100 - 23.33 = 76.67
        // Total tokens = 30000 -> Avg tokens/prompt = 2000
        // tokenScore = 100
        // Total = (76.67 + 100)/2 = 88.33 => 88
        expect(calculateEfficiencyScore([
            { total_prompts: 10, avg_response_time_ms: 2000, total_tokens_used: 15000 },
            { total_prompts: 5, avg_response_time_ms: 3000, total_tokens_used: 15000 }
        ])).toBe(88);
    });

    it("should calculate correctly for out of bounds latency", () => {
        // Latency: 15000ms -> latency score = 100 - 15000/100 = -50 => should be max(0, -50) = 0
        // Tokens: 5000 total / 10 prompts = 500/prompt -> token score = 100
        // Total = 50
        expect(calculateEfficiencyScore([{ total_prompts: 10, avg_response_time_ms: 15000, total_tokens_used: 5000 }])).toBe(50);
    });

    it("should calculate correctly for out of bounds tokens", () => {
        // Latency: 1000ms -> score 90
        // Tokens: 140000 total / 10 prompts = 14000/prompt
        // token score = 100 - (14000-2000)/100 = 100 - 120 = -20 => should be max(0, -20) = 0
        // Total = 45
        expect(calculateEfficiencyScore([{ total_prompts: 10, avg_response_time_ms: 1000, total_tokens_used: 140000 }])).toBe(45);
    });

    it("should handle extremely poor metrics without going below 0", () => {
        // Latency: 15000 (score 0), Tokens: 150000 / 10 = 15000 (score 0)
        expect(calculateEfficiencyScore([{ total_prompts: 10, avg_response_time_ms: 15000, total_tokens_used: 150000 }])).toBe(0);
    });
  });

  describe("Out of bounds / edge cases", () => {
    it("should not exceed 100 even if inputs are weird", () => {
        expect(calculateEffectivenessScore([{ total_prompts: 1, accepted_count: 5, retry_count: -1 }])).toBe(100);
    });

    it("latency score should not exceed 100 if average latency is negative", () => {
        expect(calculateEfficiencyScore([{ total_prompts: 10, avg_response_time_ms: -5000, total_tokens_used: 5000 }])).toBe(100);
    });
  });
});
