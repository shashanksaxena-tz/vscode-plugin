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

// Mock the Email Service
jest.mock('../services/email', () => {
    return {
        EmailService: jest.fn().mockImplementation(() => {
            return {
                sendEmail: jest.fn().mockResolvedValue(true)
            };
        })
    };
});

describe('cohortDetection', () => {
  let mockSupabase: any;
  let mockSupabaseChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a chainable mock object
    mockSupabaseChain = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    // The client returns the chainable object for .from()
    mockSupabase = {
      from: jest.fn().mockReturnValue(mockSupabaseChain),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should process cohorts correctly and log audit for new members', async () => {
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

    const mockUsers = [
        { email: 'user1@example.com', id: 'uuid-1' }
    ];

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_metrics') {
            return {
                ...mockSupabaseChain,
                select: jest.fn().mockReturnThis(),
                gte: jest.fn().mockResolvedValue({ data: mockMetrics, error: null })
            };
        }
        if (table === 'users') {
            return {
                ...mockSupabaseChain,
                select: jest.fn().mockResolvedValue({ data: mockUsers, error: null })
            };
        }
        if (table === 'cohorts') {
             return {
                 ...mockSupabaseChain,
                 select: jest.fn().mockReturnThis(),
                 eq: jest.fn().mockReturnThis(),
                 single: jest.fn().mockResolvedValue({ data: { id: 'cohort-1' }, error: null }),
                 update: jest.fn().mockReturnThis()
             }
        }
        if (table === 'cohort_members') {
            return {
                ...mockSupabaseChain,
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                upsert: jest.fn().mockResolvedValue({ error: null }),
                // Ensure delete returns a builder that supports chaining, even if not used in this test path
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnThis() // The fix: delete() returns chainable for filters
                })
            };
        }
        return mockSupabaseChain;
    });

    await cohortDetection();

    // Verify Audit Log
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        user_email: 'user1@example.com',
        action: 'cohort_assignment',
        target_resource: 'Over-prompters',
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

    const mockUsers = [
        { email: 'user2@example.com', id: 'uuid-2' }
    ];

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_metrics') {
            return {
                ...mockSupabaseChain,
                select: jest.fn().mockReturnThis(),
                gte: jest.fn().mockResolvedValue({ data: mockMetrics, error: null })
            };
        }
        if (table === 'users') {
             return {
                 ...mockSupabaseChain,
                 select: jest.fn().mockResolvedValue({ data: mockUsers, error: null })
             };
         }
        if (table === 'cohorts') {
             return {
                 ...mockSupabaseChain,
                 select: jest.fn().mockReturnThis(),
                 eq: jest.fn().mockReturnThis(),
                 single: jest.fn().mockResolvedValue({ data: { id: 'cohort-id' }, error: null }),
                 update: jest.fn().mockReturnThis()
             }
        }
        if (table === 'cohort_members') {
            return {
                ...mockSupabaseChain,
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                upsert: jest.fn().mockResolvedValue({ error: null }),
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnThis()
                })
            };
        }
        return mockSupabaseChain;
    });

    await cohortDetection();

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

    const mockUsers = [
        { email: 'user3@example.com', id: 'uuid-3' }
    ];

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_metrics') {
            return {
                ...mockSupabaseChain,
                select: jest.fn().mockReturnThis(),
                gte: jest.fn().mockResolvedValue({ data: mockMetrics, error: null })
            };
        }
        if (table === 'users') {
             return {
                 ...mockSupabaseChain,
                 select: jest.fn().mockResolvedValue({ data: mockUsers, error: null })
             };
         }
        if (table === 'cohorts') {
             return {
                 ...mockSupabaseChain,
                 select: jest.fn().mockReturnThis(),
                 eq: jest.fn().mockReturnThis(),
                 single: jest.fn().mockResolvedValue({ data: { id: 'cohort-id' }, error: null }),
                 update: jest.fn().mockReturnThis()
             }
        }
        if (table === 'cohort_members') {
            return {
                ...mockSupabaseChain,
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { joined_at: '2023-01-01' }, error: null }),
                upsert: jest.fn().mockResolvedValue({ error: null }),
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnThis()
                })
            };
        }
        return mockSupabaseChain;
    });

    await cohortDetection();

    expect(logAudit).not.toHaveBeenCalled();
  });
});
