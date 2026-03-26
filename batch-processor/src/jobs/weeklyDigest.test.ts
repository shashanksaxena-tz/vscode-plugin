import { weeklyDigest } from "./weeklyDigest";
import { createClient } from "../utils/supabase";
import { EmailService } from "../services/email";

// Mock dependencies
jest.mock("../utils/supabase");
jest.mock("../services/email");

const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe("Weekly Email Digest", () => {
    let mockEmailService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEmailService = {
            sendEmail: jest.fn().mockResolvedValue(true)
        };
        (EmailService as unknown as jest.Mock).mockImplementation(() => mockEmailService);
    });

    it("should fetch current and previous scores and send an email", async () => {
        // Mock current week scores
        const currentScores = [
            {
                user_id: "test@example.com",
                overall_score: 85,
                insights: JSON.stringify(["Great function decomposition", "Good use of context"]),
                suggestions: JSON.stringify(["Add more error handling", "Optimize loop", "Try using map instead of for", "Consider async/await"])
            }
        ];

        // Mock previous week scores
        const previousScores = [
            {
                user_id: "test@example.com",
                overall_score: 75
            }
        ];

        // We need to simulate the chained calls for current vs previous week
        // We'll mock eq to return different data based on the date passed to it, or just use mockResolvedValueOnce
        mockSupabase.eq
            .mockResolvedValueOnce({ data: currentScores, error: null }) // First call for current week
            .mockResolvedValueOnce({ data: previousScores, error: null }); // Second call for previous week

        await weeklyDigest();

        expect(mockSupabase.from).toHaveBeenCalledWith("quality_scores");
        expect(mockSupabase.select).toHaveBeenCalled();
        expect(mockSupabase.eq).toHaveBeenCalledTimes(2); // Called for current and previous dates

        expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);

        const emailOptions = mockEmailService.sendEmail.mock.calls[0][0];
        expect(emailOptions.to).toBe("test@example.com");
        expect(emailOptions.subject).toBe("Your Weekly Copilot Analytics Digest");

        // Verify HTML content has the score, change, wins, and tips
        expect(emailOptions.html).toContain("85/100");
        expect(emailOptions.html).toContain("+10 points from last week");
        expect(emailOptions.html).toContain("Great function decomposition");
        expect(emailOptions.html).toContain("Add more error handling");
        expect(emailOptions.html).toContain("Try using map instead of for"); // Actionable tip
        expect(emailOptions.html).toContain("View Full Scorecard on Dashboard");
    });

    it("should handle cases where there is no previous data", async () => {
        const currentScores = [
            {
                user_id: "newuser@example.com",
                overall_score: 90,
                insights: ["Good code"],
                suggestions: ["None"]
            }
        ];

        mockSupabase.eq
            .mockResolvedValueOnce({ data: currentScores, error: null })
            .mockResolvedValueOnce({ data: [], error: null }); // No previous data

        await weeklyDigest();

        expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
        const emailOptions = mockEmailService.sendEmail.mock.calls[0][0];

        expect(emailOptions.to).toBe("newuser@example.com");
        expect(emailOptions.html).toContain("No previous data");
    });

    it("should skip invalid emails", async () => {
        const currentScores = [
            {
                user_id: "invalid-email-format",
                overall_score: 90
            }
        ];

        mockSupabase.eq
            .mockResolvedValueOnce({ data: currentScores, error: null })
            .mockResolvedValueOnce({ data: [], error: null });

        await weeklyDigest();

        expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("should handle empty current scores gracefully", async () => {
        mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });

        await weeklyDigest();

        expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        expect(mockSupabase.eq).toHaveBeenCalledTimes(1); // Never gets to fetching previous scores
    });
});
