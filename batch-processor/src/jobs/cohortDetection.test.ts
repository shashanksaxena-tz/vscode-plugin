import { cohortDetection } from './cohortDetection';
import { createClient } from '../utils/supabase';
import { logAudit } from '../utils/audit';

// Mock the Supabase client
jest.mock('../utils/supabase', () => ({
  createClient: jest.fn(),
}));

// Mock the audit utility
jest.mock('../utils/audit', () => ({
  logAudit: jest.fn(),
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

  it('should process cohorts correctly and log audit for new members', async () => {
    // Mock daily metrics data
    const mockMetrics = [
      {
        user_id: 'user1@example.com',
        total_prompts: 60,
        accepted_count: 10,
        retry_count: 5,
        context_avg_files: 3,
        total_tokens_used: 1000,
        date: '2023-01-01',
      },
    ];

    // Sequence of awaited calls:
    // 1. fetch metrics (gte)
    queueResponse({ data: mockMetrics, error: null });
    // 2. fetch quality_scores for score improvement (optional, can fail)
    queueResponse({ data: null, error: null });

    // Loop over cohorts (6 cohorts now)
    // Cohort 1: Over-prompters (MATCH)
    queueResponse({ data: { id: 'cohort-1' }, error: null });
    queueResponse({ error: null });
    queueResponse({ data: null, error: { code: 'PGRST116' } });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 2: Context-light (NO MATCH)
    queueResponse({ data: { id: 'cohort-2' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 3: Retry loopers (NO MATCH)
    queueResponse({ data: { id: 'cohort-3' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 4: Expensive model users (NO MATCH - not enough tokens per prompt)
    queueResponse({ data: { id: 'cohort-4' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 5: Copy-paste acceptors (NO MATCH)
    queueResponse({ data: { id: 'cohort-5' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 6: Quick learners (NO MATCH - no score improvement data)
    queueResponse({ data: { id: 'cohort-6' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
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
        user_id: 'user1@example.com',
      }),
      expect.anything()
    );

    // Verify Audit Log
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        user_email: 'user1@example.com',
        action: 'cohort_assignment',
        target_resource: 'Over-prompters',
        details: expect.objectContaining({
            cohort_id: 'cohort-1',
            reason: 'Met criteria'
        })
    }));
  });

  it('should identify Context-light users', async () => {
    const mockMetrics = [
      {
        user_id: 'user2@example.com',
        total_prompts: 10,
        accepted_count: 8,
        retry_count: 0,
        context_avg_files: 1.0, // < 2
        total_tokens_used: 500,
        date: '2023-01-01',
      },
    ];

    // 1. fetch metrics
    queueResponse({ data: mockMetrics, error: null });
    // 2. fetch quality_scores (optional)
    queueResponse({ data: null, error: null });

    // Cohort 1: Over-prompters (user2 does not match)
    queueResponse({ data: { id: 'c1' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 2: Context-light (user2 MATCHES)
    queueResponse({ data: { id: 'c2' }, error: null });
    queueResponse({ error: null });
    queueResponse({ data: null, error: { code: 'PGRST116' } });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 3: Retry loopers (no match)
    queueResponse({ data: { id: 'c3' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 4: Expensive model users (no match)
    queueResponse({ data: { id: 'c4' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 5: Copy-paste acceptors (no match)
    queueResponse({ data: { id: 'c5' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 6: Quick learners (no match)
    queueResponse({ data: { id: 'c6' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    await cohortDetection();

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
            cohort_id: 'c2',
            user_id: 'user2@example.com'
        }),
        expect.anything()
    );

    // Audit log should be called for user2
     expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        user_email: 'user2@example.com',
        target_resource: 'Context-light users'
    }));
  });

  it('should NOT log audit if user is already a member', async () => {
       const mockMetrics = [
      {
        user_id: 'user3@example.com',
        total_prompts: 100,
        accepted_count: 10,
        retry_count: 0,
        context_avg_files: 5,
        total_tokens_used: 1000,
        date: '2023-01-01',
      },
    ];

    // 1. fetch metrics
    queueResponse({ data: mockMetrics, error: null });
    // 2. fetch quality_scores (optional)
    queueResponse({ data: null, error: null });

    // Cohort 1: Over-prompters (MATCH)
    queueResponse({ data: { id: 'c1' }, error: null });
    queueResponse({ error: null });
    queueResponse({ data: { joined_at: '2023-01-01' }, error: null });
    queueResponse({ error: null });
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

    // Cohort 4: Expensive model users (no match)
    queueResponse({ data: { id: 'c4' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 5: Copy-paste acceptors (no match)
    queueResponse({ data: { id: 'c5' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    // Cohort 6: Quick learners (no match)
    queueResponse({ data: { id: 'c6' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });

    await cohortDetection();

    expect(mockSupabase.upsert).toHaveBeenCalled();
    // logAudit should NOT be called because user was already a member
    expect(logAudit).not.toHaveBeenCalled();
  });
});
