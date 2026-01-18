import { cohortDetection } from './cohortDetection';
import { createClient } from '../utils/supabase';

// Mock the Supabase client
jest.mock('../utils/supabase', () => ({
  createClient: jest.fn(),
}));

describe('cohortDetection', () => {
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
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),

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

  it('should process cohorts correctly for matching users', async () => {
    // Mock daily metrics data
    const mockMetrics = [
      {
        user_id: 'user1',
        total_prompts: 60,
        accepted_count: 10,
        retry_count: 5,
        context_avg_files: 3,
        date: '2023-01-01',
      },
    ];

    // Sequence of awaited calls:
    // 1. fetch metrics (gte)
    queueResponse({ data: mockMetrics, error: null });

    // Loop over cohorts (3 cohorts)
    // Cohort 1: Over-prompters
    // 2. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-1' }, error: null });
    // 3. update details (eq)
    queueResponse({ error: null });
    // 4. upsert member (upsert)
    queueResponse({ error: null });
    // 5. update member count (eq)
    queueResponse({ error: null });

    // Cohort 2: Context-light
    // 6. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-2' }, error: null });
    // 7. update details (eq)
    queueResponse({ error: null });
    // 8. delete member (user1 is not context light) (eq)
    queueResponse({ error: null });
    // 9. update member count (eq)
    queueResponse({ error: null });

    // Cohort 3: Retry loopers
    // 10. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-3' }, error: null });
    // 11. update details (eq)
    queueResponse({ error: null });
    // 12. delete member (user1 is not retry looper) (eq)
    queueResponse({ error: null });
    // 13. update member count (eq)
    queueResponse({ error: null });

    await cohortDetection();

    // Verify fetching metrics
    expect(mockSupabase.from).toHaveBeenCalledWith('daily_metrics');

    // Verify cohort processing for Over-prompters
    expect(mockSupabase.from).toHaveBeenCalledWith('cohorts');
    expect(mockSupabase.eq).toHaveBeenCalledWith('name', 'Over-prompters');

    // Verify upsert was called for user1 in cohort-1
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cohort_id: 'cohort-1',
        user_id: 'user1',
      }),
      expect.anything()
    );
  });

  it('should identify Context-light users', async () => {
    const mockMetrics = [
      {
        user_id: 'user2',
        total_prompts: 10,
        accepted_count: 8,
        retry_count: 0,
        context_avg_files: 1.0, // < 2
        date: '2023-01-01',
      },
    ];

    // 1. fetch metrics
    queueResponse({ data: mockMetrics, error: null });

    // Cohort 1: Over-prompters (user2 does not match)
    queueResponse({ data: { id: 'c1' }, error: null }); // check exists
    queueResponse({ error: null }); // update details
    queueResponse({ error: null }); // delete member
    queueResponse({ error: null }); // update count

    // Cohort 2: Context-light (user2 MATCHES)
    queueResponse({ data: { id: 'c2' }, error: null }); // check exists
    queueResponse({ error: null }); // update details
    queueResponse({ error: null }); // upsert member (MATCH)
    queueResponse({ error: null }); // update count

    // Cohort 3: Retry loopers (no match)
    queueResponse({ data: { id: 'c3' }, error: null }); // check exists
    queueResponse({ error: null }); // update details
    queueResponse({ error: null }); // delete member
    queueResponse({ error: null }); // update count

    await cohortDetection();

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
            cohort_id: 'c2',
            user_id: 'user2'
        }),
        expect.anything()
    );
  });

  it('should handle missing cohort and create it', async () => {
       const mockMetrics = [
      {
        user_id: 'user3',
        total_prompts: 100,
        accepted_count: 10,
        retry_count: 0,
        context_avg_files: 5,
        date: '2023-01-01',
      },
    ];

    // 1. fetch metrics
    queueResponse({ data: mockMetrics, error: null });

    // Cohort 1: Over-prompters (MATCH)
    // check exists -> null (PGRST116)
    queueResponse({ data: null, error: { code: 'PGRST116' } });
    // insert new -> returns id
    queueResponse({ data: { id: 'new-c1' }, error: null });
    // upsert member
    queueResponse({ error: null });
    // update count
    queueResponse({ error: null });

    // Cohort 2: Context-light (no match)
    queueResponse({ data: { id: 'c2' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 3: Retry loopers (no match)
    queueResponse({ data: { id: 'c3' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    await cohortDetection();

    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Over-prompters'
    }));

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
            cohort_id: 'new-c1',
            user_id: 'user3'
        }),
        expect.anything()
    );
  });
});
