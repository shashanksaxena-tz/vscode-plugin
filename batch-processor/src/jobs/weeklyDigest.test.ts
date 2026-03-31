import { weeklyDigest } from "./weeklyDigest";
import { EmailService } from "../services/email";
import { createClient } from "../utils/supabase";

// Mock Supabase
jest.mock("../utils/supabase", () => ({
  createClient: jest.fn(),
}));

// Mock EmailService
jest.mock("../services/email", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Audit
jest.mock("../utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

describe("Weekly Digest Job", () => {
  let mockSupabase: any;
  let mockEmailServiceInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Get the mocked instance of EmailService
    mockEmailServiceInstance = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };
    (EmailService as jest.Mock).mockImplementation(() => mockEmailServiceInstance);
  });

  it("should skip if no scores are found", async () => {
    // Mock the first query to return no data
    mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });
    // And mock the second query (just to be safe, though code might not reach it)
    mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });

    await weeklyDigest();

    expect(mockSupabase.from).toHaveBeenCalledWith("quality_scores");
    expect(mockEmailServiceInstance.sendEmail).not.toHaveBeenCalled();
  });

  it("should send emails for valid users with current scores", async () => {
    const mockScores = [
      {
        user_id: "user1@example.com",
        week_start_date: "2026-03-24", // mocked to match last week, whatever it is
        overall_score: 85,
        effectiveness_score: 80,
        best_practices_score: 90,
        efficiency_score: 85,
        insights: ["Great prompt clarity.", "Good context usage."],
        suggestions: ["Try breaking down complex tasks more often."],
      },
      {
        user_id: "user2@example.com",
        overall_score: 70,
        // Missing insights/suggestions to test fallback
      },
      {
        user_id: "invalid-email-format", // Should be skipped
        overall_score: 90,
      },
    ];

    // Mock chain calls so that `eq` returns our mock results sequentially
    const mockEq = jest.fn();
    mockEq.mockResolvedValueOnce({ data: mockScores, error: null });
    mockEq.mockResolvedValueOnce({
      data: [
        { user_id: "user1@example.com", overall_score: 80 }, // +5 improvement
        { user_id: "user2@example.com", overall_score: 75 }, // -5 regression
      ],
      error: null,
    });

    mockSupabase.eq = mockEq;

    await weeklyDigest();

    // 2 emails should be sent (user1, user2), 1 skipped (invalid-email-format)
    expect(mockEmailServiceInstance.sendEmail).toHaveBeenCalledTimes(2);

    // Check user1's email details
    expect(mockEmailServiceInstance.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user1@example.com",
        subject: "Weekly Copilot Digest: Score 85",
        html: expect.stringContaining("(+5 from last week) 📈"),
      })
    );
    expect(mockEmailServiceInstance.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Great prompt clarity."), // Check insights inclusion
      })
    );

    // Check user2's email details
    expect(mockEmailServiceInstance.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user2@example.com",
        subject: "Weekly Copilot Digest: Score 70",
        html: expect.stringContaining("(-5 from last week) 📉"),
      })
    );
  });

  it("should handle previous week query errors gracefully", async () => {
    const mockScores = [
      {
        user_id: "user1@example.com",
        overall_score: 85,
      },
    ];

    // Mock chain calls so that `eq` returns our mock results sequentially
    const mockEq = jest.fn();
    mockEq.mockResolvedValueOnce({ data: mockScores, error: null });
    mockEq.mockResolvedValueOnce({
      data: null,
      error: new Error("DB Connection Failed"),
    });

    mockSupabase.eq = mockEq;

    await weeklyDigest();

    // Should still send the email, just without comparison text
    expect(mockEmailServiceInstance.sendEmail).toHaveBeenCalledTimes(1);
    expect(mockEmailServiceInstance.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user1@example.com",
        subject: "Weekly Copilot Digest: Score 85",
      })
    );
  });
});
