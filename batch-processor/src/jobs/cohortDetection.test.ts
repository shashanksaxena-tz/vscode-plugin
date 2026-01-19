import { cohortDetection } from './cohortDetection';
import { createClient } from '../utils/supabase';
import { logAudit } from '../utils/audit';

// Mock dependencies
jest.mock('../utils/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../services/email', () => {
    return {
        EmailService: jest.fn().mockImplementation(() => {
            return {
                sendEmail: jest.fn().mockResolvedValue({})
            };
        })
    };
});

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
    // 4. check existing member (single) -> found (don't send email)
    queueResponse({ data: { joined_at: '2023-01-01' }, error: null });
    // 5. upsert member (upsert)
    queueResponse({ error: null });
    // 6. update member count (eq)
    queueResponse({ error: null });
    // 7. log audit
    // (Audit log is awaited now, so we don't need to queue a response for it specifically if it's external, but wait, logAudit uses createClient too inside it?
    // Ah, we mocked logAudit function entirely, so it won't call supabase. Good.)

    // Cohort 2: Context-light
    // 8. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-2' }, error: null });
    // 9. update details (eq)
    queueResponse({ error: null });
    // 10. delete member (user1 is not context light) (eq)
    queueResponse({ error: null });
    // 11. update member count (eq)
    queueResponse({ error: null });
    // 12. log audit

    // Cohort 3: Retry loopers
    // 13. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-3' }, error: null });
    // 14. update details (eq)
    queueResponse({ error: null });
    // 15. delete member (user1 is not retry looper) (eq)
    queueResponse({ error: null });
    // 16. update member count (eq)
    queueResponse({ error: null });
    // 17. log audit

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

    // Verify audit logs were called
    expect(logAudit).toHaveBeenCalledTimes(3);
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
    // (logAudit)

    // Cohort 2: Context-light (user2 MATCHES)
    queueResponse({ data: { id: 'c2' }, error: null }); // check exists
    queueResponse({ error: null }); // update details
    queueResponse({ data: null, error: {code: 'PGRST116'} }); // check existing member -> null (send email)
    queueResponse({ error: null }); // upsert member (MATCH)
    queueResponse({ error: null }); // update count
    // (logAudit)

    // Cohort 3: Retry loopers (no match)
    queueResponse({ data: { id: 'c3' }, error: null }); // check exists
    queueResponse({ error: null }); // update details
    queueResponse({ error: null }); // delete member
    queueResponse({ error: null }); // update count
    // (logAudit)

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
    // check existing member -> found
    queueResponse({ data: { joined_at: '2023-01-01' }, error: null });
    // upsert member
    queueResponse({ error: null });
    // update count
    queueResponse({ error: null });
    // (logAudit)

    // Cohort 2: Context-light (no match)
    queueResponse({ data: { id: 'c2' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    // (logAudit)

    // Cohort 3: Retry loopers (no match)
    queueResponse({ data: { id: 'c3' }, error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    queueResponse({ error: null });
    // (logAudit)

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
