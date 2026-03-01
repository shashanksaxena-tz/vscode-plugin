import { aggregateMetrics } from '../../jobs/aggregateMetrics';
import { ruleBasedScoring } from '../../jobs/ruleBasedScoring';
import { createClient } from '../../utils/supabase';

// Mock Supabase
jest.mock('../../utils/supabase', () => ({
  createClient: jest.fn(),
}));

describe('End-to-End Logic Pipeline', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should run the metrics aggregation and scoring pipeline', async () => {
    // 1. Setup mocks for aggregateMetrics
    mockSupabase.rpc.mockResolvedValue({ error: null });

    // 2. Setup mocks for ruleBasedScoring
    const mockEvents = [{ user_id: 'test-user' }];
    const mockDailyMetrics = [
      {
        user_id: 'test-user',
        total_prompts: 10,
        accepted_count: 8, // 80% acceptance
        retry_count: 1,    // 10% retry
        avg_response_time_ms: 100,
        total_tokens_used: 5000,
      },
    ];

    const eventChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockEvents }),
    };

    const metricChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockDailyMetrics }),
    };

    const scoreChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'events') return eventChain;
        if (table === 'daily_metrics') return metricChain;
        if (table === 'quality_scores') return scoreChain;
        return { select: jest.fn() };
    });

    // --- Execution ---

    // Step 1: Aggregation
    await aggregateMetrics();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('aggregate_daily_metrics', expect.anything());

    // Step 2: Scoring
    await ruleBasedScoring();

    // Verification
    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    expect(mockSupabase.from).toHaveBeenCalledWith('daily_metrics');
    expect(mockSupabase.from).toHaveBeenCalledWith('quality_scores');

    // Check upsert
    expect(scoreChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'test-user',
      overall_score: expect.any(Number),
      effectiveness_score: expect.any(Number),
      efficiency_score: expect.any(Number),
    }));

    // Verify logic:
    // Effectiveness:
    // Acceptance 80% -> 0.8 * 80 = 64
    // Retry 10% -> (1 - 0.1) * 20 = 18
    // Total = 64 + 18 = 82
    const upsertCall = scoreChain.upsert.mock.calls[0][0];
    expect(upsertCall.effectiveness_score).toBe(82);
  });
});
