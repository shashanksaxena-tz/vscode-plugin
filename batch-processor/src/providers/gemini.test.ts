import { GeminiProvider } from "./gemini";
import { GoogleGenAI } from "@google/genai";

// Mock the GoogleGenAI module
jest.mock("@google/genai");

describe("GeminiProvider", () => {
  let provider: GeminiProvider;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup the mock structure
    mockGenerateContent = jest.fn();
    (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));

    // Initialize provider
    process.env.GEMINI_API_KEY = "test-key";
    provider = new GeminiProvider();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("should parse valid JSON response correctly", async () => {
    const mockResponse = {
      score: 90,
      insights: ["Good task decomposition"],
      suggestions: ["Add comments"],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResponse),
    });

    const prompts = [{ id: 1, text: "test prompt" }];
    const result = await provider.analyze(prompts);

    expect(result).toEqual(mockResponse);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-1.5-pro",
        contents: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            parts: expect.any(Array),
          }),
        ]),
        config: {
          responseMimeType: "application/json",
        },
      })
    );
  });

  it("should extract JSON even if there is surrounding text", async () => {
    const mockResponse = {
      score: 75,
      insights: ["Insight 1"],
      suggestions: ["Suggestion 1"],
    };

    // Simulate an LLM that didn't strictly follow the JSON-only instruction
    mockGenerateContent.mockResolvedValue({
      text: `Here is the analysis:\n${JSON.stringify(mockResponse)}\nHope this helps!`,
    });

    const result = await provider.analyze([]);
    expect(result).toEqual(mockResponse);
  });

  it("should return default values when parsing fails", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "This is not valid JSON.",
    });

    const result = await provider.analyze([]);
    expect(result).toEqual({ score: 50, insights: [], suggestions: [] });
  });

  it("should handle empty API responses", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "",
    });

    const result = await provider.analyze([]);
    expect(result).toEqual({ score: 50, insights: [], suggestions: [] });
  });
});
