import { llmAnalysis } from "./llmAnalysis";
import { createClient } from "../utils/supabase";
import { getLLMProvider } from "../providers/llm";
import { EncryptionService } from "../utils/encryption";
import { logAudit } from "../utils/audit";

// Mock dependencies
jest.mock("../utils/supabase");
jest.mock("../providers/llm");
jest.mock("../utils/encryption");
jest.mock("../utils/audit");

describe("llmAnalysis", () => {
  let mockSupabase: any;
  let mockLLM: any;
  let mockEncryption: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn()
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    mockLLM = {
      analyze: jest.fn().mockResolvedValue({
        score: 85,
        insights: ["Good job"],
        suggestions: ["Do better"],
      }),
    };
    (getLLMProvider as jest.Mock).mockReturnValue(mockLLM);

    mockEncryption = {
      decrypt: jest.fn((text) => text.replace("encrypted_", "")),
    };
    (EncryptionService as jest.Mock).mockImplementation(() => mockEncryption);
  });

  it("should do nothing if no users found", async () => {
    // Mock for getting users: returns empty list
    const mockOrder = jest.fn().mockResolvedValue({ data: [] });
    const mockGte = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === "events") {
            return { select: mockSelect };
        }
        return {};
    });

    await llmAnalysis();

    expect(mockSupabase.from).toHaveBeenCalledWith("events");
    expect(mockSelect).toHaveBeenCalledWith("user_id");
    expect(mockOrder).toHaveBeenCalled();
  });

  it("should analyze users with events and valid metrics", async () => {
      const users = [{ user_id: "user1" }];
      const events = [
          { id: 1, event_type: "completion", prompt_encrypted: "encrypted_prompt1", metadata: {} },
          { id: 2, event_type: "completion", prompt_encrypted: "encrypted_prompt2", metadata: {} }
      ];
      const metrics = [
          { total_prompts: 10, accepted_count: 8, retry_count: 1, avg_response_time_ms: 200, total_tokens_used: 5000 }
      ];

      // Setup complex mock for supabase.from to handle different tables and chains
      mockSupabase.from.mockImplementation((table: string) => {
          if (table === "events") {
             // We need to differentiate the two select calls on "events"
             // 1. select("user_id").gte(...).order(...)
             // 2. select("*").eq(...).gte(...).limit(...)

             // We can return a chain object that supports both paths or inspect arguments
             const chain = {
                 select: jest.fn().mockImplementation((cols) => {
                     if (cols === "user_id") {
                         return {
                             gte: jest.fn().mockReturnThis(),
                             order: jest.fn().mockResolvedValue({ data: users })
                         };
                     } else {
                         return {
                             eq: jest.fn().mockReturnThis(),
                             gte: jest.fn().mockReturnThis(),
                             limit: jest.fn().mockResolvedValue({ data: events })
                         };
                     }
                 })
             };
             return chain;
          }
          if (table === "daily_metrics") {
               return {
                   select: jest.fn().mockReturnThis(),
                   eq: jest.fn().mockReturnThis(),
                   gte: jest.fn().mockResolvedValue({ data: metrics })
               };
          }
          if (table === "quality_scores") {
              return {
                  upsert: jest.fn().mockResolvedValue({ error: null })
              };
          }
          return {};
      });

      await llmAnalysis();

      // Verify Decryption
      expect(mockEncryption.decrypt).toHaveBeenCalledTimes(2);
      expect(mockEncryption.decrypt).toHaveBeenCalledWith("encrypted_prompt1");

      // Verify LLM call
      expect(mockLLM.analyze).toHaveBeenCalled();
      const promptSamples = mockLLM.analyze.mock.calls[0][0];
      expect(promptSamples).toHaveLength(2);
      expect(promptSamples[0].prompt_content).toBe("prompt1");

      // Verify Audit Log
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
          user_email: "user1",
          action: "LLM_ANALYSIS_COMPLETED",
          target_resource: "quality_scores"
      }));

      // Verify Upsert
      expect(mockSupabase.from).toHaveBeenCalledWith("quality_scores");
  });

  it("should handle encryption errors gracefully", async () => {
      const users = [{ user_id: "user1" }];
      const events = [
          { id: 1, event_type: "completion", prompt_encrypted: "bad_data", metadata: {} }
      ];

      mockEncryption.decrypt.mockImplementation(() => { throw new Error("Decrypt fail"); });

      mockSupabase.from.mockImplementation((table: string) => {
          if (table === "events") {
             return {
                 select: jest.fn((cols) => {
                     if (cols === "user_id") {
                         return {
                             gte: jest.fn().mockReturnThis(),
                             order: jest.fn().mockResolvedValue({ data: users })
                         };
                     } else {
                         return {
                             eq: jest.fn().mockReturnThis(),
                             gte: jest.fn().mockReturnThis(),
                             limit: jest.fn().mockResolvedValue({ data: events })
                         };
                     }
                 })
             };
          }
           if (table === "daily_metrics") {
               return {
                   select: jest.fn().mockReturnThis(),
                   eq: jest.fn().mockReturnThis(),
                   gte: jest.fn().mockResolvedValue({ data: [] })
               };
          }
          if (table === "quality_scores") {
               return {
                  upsert: jest.fn().mockResolvedValue({ error: null })
              };
          }
          return {};
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await llmAnalysis();

      expect(mockLLM.analyze).toHaveBeenCalled();
      const calls = mockLLM.analyze.mock.calls[0][0];
      expect(calls[0].prompt_content).toBe("Encrypted Content");

      consoleSpy.mockRestore();
  });
});
