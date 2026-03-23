import { OpenAIProvider } from "./openai";
import OpenAI from "openai";

// Mock the OpenAI module
jest.mock("openai");

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup the mock structure
    mockCreate = jest.fn();
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    // Initialize provider
    process.env.OPENAI_API_KEY = "test-key";
    provider = new OpenAIProvider();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("should parse valid JSON response correctly", async () => {
    const mockResponse = {
      score: 85,
      insights: ["Good context usage"],
      suggestions: ["Add more specific prompts"],
    };

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockResponse),
          },
        },
      ],
    });

    const prompts = [{ id: 1, text: "test prompt" }];
    const result = await provider.analyze(prompts);

    expect(result).toEqual(mockResponse);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user" }),
        ]),
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
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: `Here is the analysis:\n${JSON.stringify(mockResponse)}\nHope this helps!`,
          },
        },
      ],
    });

    const result = await provider.analyze([]);
    expect(result).toEqual(mockResponse);
  });

  it("should return default values when parsing fails", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "This is not valid JSON.",
          },
        },
      ],
    });

    const result = await provider.analyze([]);
    expect(result).toEqual({ score: 50, insights: [], suggestions: [] });
  });

  it("should handle empty or malformed API responses", async () => {
    // Missing choices array
    mockCreate.mockResolvedValue({});

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const result = await provider.analyze([]);

    expect(result).toEqual({ score: 50, insights: [], suggestions: [] });

    consoleSpy.mockRestore();
  });
});
