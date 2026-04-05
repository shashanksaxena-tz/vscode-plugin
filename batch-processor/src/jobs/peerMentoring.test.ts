import { peerMentoring } from "./peerMentoring";
import { createClient } from "../utils/supabase";

jest.mock("../utils/supabase");

describe("Peer Mentoring Job", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it("should match top and bottom quartiles in a department and insert notifications", async () => {
    const weekStart = "2026-04-01";

    // A query builder returns `this` until it hits `.single()` or `.eq()` or when awaited (Promise)
    // We can simulate this by returning explicit objects with `.then`

    // We need to implement a fake query builder for this test to avoid the chaining errors
    const mockQueryBuilder = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn(),
      insert: jest.fn(),
    };

    // 1st query: quality_scores latest week
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: { week_start_date: weekStart },
      error: null,
    });

    // 2nd query: quality_scores for that week
    mockQueryBuilder.eq.mockResolvedValueOnce({
      data: [
        { user_id: "user1@test.com", overall_score: 95 }, // Top 1
        { user_id: "user2@test.com", overall_score: 90 }, // Top 2
        { user_id: "user3@test.com", overall_score: 85 }, // Mid
        { user_id: "user4@test.com", overall_score: 80 }, // Mid
        { user_id: "user5@test.com", overall_score: 75 }, // Mid
        { user_id: "user6@test.com", overall_score: 70 }, // Mid
        { user_id: "user7@test.com", overall_score: 65 }, // Bottom 2
        { user_id: "user8@test.com", overall_score: 60 }, // Bottom 1
      ],
      error: null,
    });

    // 3rd query: users
    mockQueryBuilder.select.mockImplementationOnce(() => mockQueryBuilder);
    mockQueryBuilder.select.mockImplementationOnce(() => mockQueryBuilder);

    // Actually `select` is called 3 times.
    // 1. select("week_start_date") -> returns mockQueryBuilder
    // 2. select("user_id, overall_score") -> returns mockQueryBuilder
    // 3. select("email, department") -> this one is AWAITED directly.
    mockQueryBuilder.select.mockImplementation((args) => {
      if (args === "email, department") {
        return Promise.resolve({
          data: [
            { email: "user1@test.com", department: "Engineering" },
            { email: "user2@test.com", department: "Engineering" },
            { email: "user3@test.com", department: "Engineering" },
            { email: "user4@test.com", department: "Engineering" },
            { email: "user5@test.com", department: "Engineering" },
            { email: "user6@test.com", department: "Engineering" },
            { email: "user7@test.com", department: "Engineering" },
            { email: "user8@test.com", department: "Engineering" },
          ],
          error: null,
        });
      }
      return mockQueryBuilder;
    });

    mockSupabase = mockQueryBuilder;
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock inserts
    mockSupabase.insert.mockResolvedValue({ error: null });

    await peerMentoring();

    // With 8 users, top 25% is 2 users, bottom 25% is 2 users
    // Matches should be:
    // Mentee: user8 (score 60) -> Mentor: user1 (score 95)
    // Mentee: user7 (score 65) -> Mentor: user2 (score 90)

    expect(mockSupabase.insert).toHaveBeenCalledTimes(4); // 2 mentees + 2 mentors

    // Check first pair
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user8@test.com",
        type: "mentoring",
        message: expect.stringContaining("user1@test.com"),
      })
    );
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user1@test.com",
        type: "mentoring",
        message: expect.stringContaining("user8@test.com"),
      })
    );

    // Check second pair
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user7@test.com",
        type: "mentoring",
        message: expect.stringContaining("user2@test.com"),
      })
    );
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user2@test.com",
        type: "mentoring",
        message: expect.stringContaining("user7@test.com"),
      })
    );
  });

  it("should do nothing if no recent scores are found", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "No rows found" },
    });

    await peerMentoring();

    expect(mockSupabase.eq).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });
});
