import { cohortDetection } from './cohortDetection';
import { createClient } from '../utils/supabase';
import { logAudit } from '../utils/audit';
import { EmailService } from '../services/email';

// Mock the Supabase client
jest.mock('../utils/supabase', () => ({
  createClient: jest.fn(),
}));

// Mock the audit utility
jest.mock('../utils/audit', () => ({
  logAudit: jest.fn(),
}));

// Mock the EmailService
jest.mock('../services/email', () => {
  return {
    EmailService: jest.fn().mockImplementation(() => {
      return {
        sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-email-id' }),
      };
    }),
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

  it('should process cohorts correctly and log audit for new members', async () => {
    // Mock daily metrics data
    const mockMetrics = [
      {
        user_id: 'user1@example.com',
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
    // Cohort 1: Over-prompters (MATCH)
    // 2. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-1' }, error: null });
    // 3. update details (eq)
    queueResponse({ error: null });
    // 4. check existing member (select single) -> Not found (NEW MEMBER)
    queueResponse({ data: null, error: { code: 'PGRST116' } });
    // 5. upsert member (upsert)
    queueResponse({ error: null });
    // logAudit is called here (not awaited via supabase mock, but awaited directly)
    // 6. update member count (eq)
    queueResponse({ error: null });

    // Cohort 2: Context-light (NO MATCH)
    // 7. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-2' }, error: null });
    // 8. update details (eq)
    queueResponse({ error: null });
    // 9. delete member (user1 is not context light) (eq)
    queueResponse({ error: null });
    // 10. update member count (eq)
    queueResponse({ error: null });

    // Cohort 3: Retry loopers (NO MATCH)
    // 11. check exists (single) -> found
    queueResponse({ data: { id: 'cohort-3' }, error: null });
    // 12. update details (eq)
    queueResponse({ error: null });
    // 13. delete member (user1 is not retry looper) (eq)
    queueResponse({ error: null });
    // 14. update member count (eq)
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
    queueResponse({ data: null, error: { code: 'PGRST116' } }); // check existing member (not found)
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
        date: '2023-01-01',
      },
    ];

    // 1. fetch metrics
    queueResponse({ data: mockMetrics, error: null });

    // Cohort 1: Over-prompters (MATCH)
    queueResponse({ data: { id: 'c1' }, error: null }); // check exists
    queueResponse({ error: null }); // update details
    // check existing member -> FOUND (ALREADY MEMBER)
    queueResponse({ data: { joined_at: '2023-01-01' }, error: null });
    // upsert member (still called to ensure consistency)
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

    expect(mockSupabase.upsert).toHaveBeenCalled();
    // logAudit should NOT be called because user was already a member
    expect(logAudit).not.toHaveBeenCalled();
  });
});
