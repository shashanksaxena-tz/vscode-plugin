import { ruleBasedScoring } from './ruleBasedScoring';
import { createClient } from '../utils/supabase';

// Mock the Supabase client
jest.mock('../utils/supabase', () => ({
  createClient: jest.fn(),
}));

describe('ruleBasedScoring', () => {
  let mockSupabase: any;
  let responseQueue: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    responseQueue = [];

    // Create a mock client that returns itself for chaining
    // and implements a thenable interface for awaiting
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),

      // The magic to make it thenable
      then: function(resolve: any, reject: any) {
         const response = responseQueue.shift() || { data: null, error: null };
         return Promise.resolve(response).then(resolve, reject);
      }
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  const queueResponse = (response: any) => {
      responseQueue.push(response);
  };

  it('should calculate scores and upsert them correctly', async () => {
    const mockUsers = [{ user_id: 'user1' }];
    const mockMetrics = [
      {
        total_prompts: 100,
        accepted_count: 80, // 80% acceptance -> 64 pts
        retry_count: 5,     // 5% retry -> 19 pts => 83 pts effectiveness
        avg_response_time_ms: 200, // 98 pts latency
        total_tokens_used: 5000,   // 100 pts tokens => 99 pts efficiency
        date: '2023-01-01',
      }
    ];
    // Expected effectiveness: 80/100 * 80 + (1 - 5/100) * 20 = 64 + 19 = 83
    // Expected efficiency: (100 - 200/100) + (5000 < 10000 ? 100) / 2 = (98 + 100) / 2 = 99
    // Expected overall: 83 * 0.4 + 50 * 0.35 + 99 * 0.25 = 33.2 + 17.5 + 24.75 = 75.45 -> 75

    // 1. Get users
    queueResponse({ data: mockUsers, error: null });

    // Loop for user1
    // 2. Fetch daily metrics
    queueResponse({ data: mockMetrics, error: null });
    // 3. Check existing score (returns null/error, default best_practices=50)
    queueResponse({ data: null, error: { code: 'PGRST116' } });
    // 4. Upsert
    queueResponse({ error: null });

    await ruleBasedScoring();

    // Verify fetches
    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    expect(mockSupabase.from).toHaveBeenCalledWith('daily_metrics');

    // Verify upsert
    expect(mockSupabase.from).toHaveBeenCalledWith('quality_scores');
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user1',
        effectiveness_score: 83,
        efficiency_score: 99,
        best_practices_score: 50,
        overall_score: 75,
      })
    );
  });

  it('should preserve existing best_practices_score', async () => {
    const mockUsers = [{ user_id: 'user1' }];
    const mockMetrics = [
      {
        total_prompts: 100,
        accepted_count: 50, // 50% -> 40 pts
        retry_count: 10,    // 10% -> 18 pts => 58 pts effectiveness
        avg_response_time_ms: 1000, // 90 pts latency
        total_tokens_used: 20000,   // (100 - (20000-10000)/1000) = 90 pts tokens => 90 pts efficiency
        date: '2023-01-01',
      }
    ];
    // Expected effectiveness: 58
    // Expected efficiency: 90
    // Existing best_practices: 80
    // Expected overall: 58 * 0.4 + 80 * 0.35 + 90 * 0.25 = 23.2 + 28 + 22.5 = 73.7 -> 74

    // 1. Get users
    queueResponse({ data: mockUsers, error: null });

    // Loop for user1
    // 2. Fetch daily metrics
    queueResponse({ data: mockMetrics, error: null });
    // 3. Check existing score (returns 80)
    queueResponse({ data: { best_practices_score: 80 }, error: null });
    // 4. Upsert
    queueResponse({ error: null });

    await ruleBasedScoring();

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user1',
        effectiveness_score: 58,
        efficiency_score: 90,
        best_practices_score: 80,
        overall_score: 74,
      })
    );
  });

  it('should handle no users', async () => {
    // 1. Get users (empty)
    queueResponse({ data: [], error: null });

    await ruleBasedScoring();

    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    // metrics fetch should not happen
    expect(mockSupabase.from).not.toHaveBeenCalledWith('daily_metrics');
  });

    it('should handle users with no metrics', async () => {
    const mockUsers = [{ user_id: 'user1' }];

    // 1. Get users
    queueResponse({ data: mockUsers, error: null });
    // 2. Fetch daily metrics (empty)
    queueResponse({ data: [], error: null });

    await ruleBasedScoring();

    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    expect(mockSupabase.from).toHaveBeenCalledWith('daily_metrics');
    // upsert should not happen
    expect(mockSupabase.upsert).not.toHaveBeenCalled();
  });
});
