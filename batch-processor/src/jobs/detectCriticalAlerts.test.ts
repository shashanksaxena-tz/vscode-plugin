import { detectCriticalAlerts } from "./detectCriticalAlerts";
import { createClient } from "../utils/supabase";

jest.mock("../utils/supabase", () => ({
  createClient: jest.fn(),
}));

describe("Detect Critical Alerts Job", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      gte: jest.fn(),
      insert: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it("should create notifications for users with 5 or more retries", async () => {
    const mockEvents = [
      { user_id: "user1@example.com", metadata: { retry_count: 5 } },
      { user_id: "user2@example.com", metadata: { retry_count: 3 } },
      { user_id: "user1@example.com", metadata: { retry_count: 6 } }, // Should not trigger second alert
      { user_id: "user3@example.com", metadata: { retry_count: 10 } },
    ];

    mockSupabase.gte.mockResolvedValueOnce({ data: mockEvents, error: null });
    mockSupabase.insert.mockResolvedValue({ error: null });

    await detectCriticalAlerts();

    expect(mockSupabase.insert).toHaveBeenCalledTimes(2); // user1 and user3
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user1@example.com",
        type: "critical_alert",
        message: expect.stringContaining("5 retries"),
      })
    );
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user3@example.com",
        type: "critical_alert",
        message: expect.stringContaining("10 retries"),
      })
    );
  });

  it("should not create notifications if no events meet criteria", async () => {
    const mockEvents = [
      { user_id: "user1@example.com", metadata: { retry_count: 4 } },
      { user_id: "user2@example.com", metadata: { retry_count: 0 } },
    ];

    mockSupabase.gte.mockResolvedValueOnce({ data: mockEvents, error: null });

    await detectCriticalAlerts();

    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });
});
