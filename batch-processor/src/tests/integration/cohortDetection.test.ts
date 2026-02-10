
import { cohortDetection } from '../../jobs/cohortDetection';
import { createClient } from '../../utils/supabase';
import { EmailService } from '../../services/email';
import { logAudit } from '../../utils/audit';

jest.mock('../../utils/supabase');
jest.mock('../../services/email');
jest.mock('../../utils/audit');

describe('cohortDetection', () => {
  let mockSupabase: any;
  let mockEmailService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock EmailService
    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };
    (EmailService as jest.Mock).mockImplementation(() => mockEmailService);

    // Mock logAudit
    (logAudit as jest.Mock).mockResolvedValue(true);
  });

  it('should identify Over-prompters and send emails', async () => {
    const mockMetrics = [
      {
        user_id: 'overprompter@example.com',
        total_prompts: 600,
        accepted_count: 100,
        retry_count: 50,
        context_avg_files: 3,
        date: '2023-01-01',
      }
    ];

    // Setup detailed mock for Supabase
    const dailyMetricsBuilder = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: mockMetrics, error: null }),
    };

    const cohortsBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // First check (Over-prompters): not found
        .mockResolvedValueOnce({ data: { id: 'cohort-123' }, error: null }) // After insert: return id
        .mockResolvedValue({ data: { id: 'cohort-other' }, error: null }), // Other cohorts
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    };

    const cohortMembersBuilder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), // Not a member
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
    };
    // Make cohortMembersBuilder awaitable for delete case
    cohortMembersBuilder.then = (resolve: any) => resolve({ error: null });

    mockSupabase = {
      from: jest.fn((table) => {
        if (table === 'daily_metrics') return dailyMetricsBuilder;
        if (table === 'cohorts') return cohortsBuilder;
        if (table === 'cohort_members') return cohortMembersBuilder;
        return { select: jest.fn().mockReturnThis() };
      }),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    await cohortDetection();

    // Verify daily_metrics fetch
    expect(mockSupabase.from).toHaveBeenCalledWith('daily_metrics');
    expect(dailyMetricsBuilder.gte).toHaveBeenCalled();

    // Verify cohort creation for Over-prompters
    expect(cohortsBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Over-prompters'
    }));

    // Verify member addition
    expect(cohortMembersBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'overprompter@example.com'
    }), expect.anything());

    // Verify email sent
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'overprompter@example.com',
      subject: expect.stringContaining('Over-prompters')
    }));

    // Verify audit log
    expect(logAudit).toHaveBeenCalled();
  });

  it('should remove user from cohort if they no longer match', async () => {
    const mockMetrics = [
        {
          user_id: 'improved@example.com',
          total_prompts: 10,
          accepted_count: 9, // High acceptance
          retry_count: 0,
          context_avg_files: 5,
          date: '2023-01-01',
        }
      ];

      const dailyMetricsBuilder = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      };

      const cohortsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'cohort-123' }, error: null }), // Cohort exists
        update: jest.fn().mockReturnThis(),
      };

      const cohortMembersBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { joined_at: '2023-01-01' }, error: null }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockReturnThis(),
      };
      cohortMembersBuilder.then = (resolve: any) => resolve({ error: null });

      mockSupabase = {
        from: jest.fn((table) => {
          if (table === 'daily_metrics') return dailyMetricsBuilder;
          if (table === 'cohorts') return cohortsBuilder;
          if (table === 'cohort_members') return cohortMembersBuilder;
          return { select: jest.fn().mockReturnThis() };
        }),
      };

      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await cohortDetection();

      // Should call delete for 'Over-prompters' (and others if they don't match)
      // Since user doesn't match Over-prompters, it should try to delete from that cohort.
      expect(cohortMembersBuilder.delete).toHaveBeenCalled();
      // We can't easily verify the exact arguments due to chained calls with same builder mock,
      // but we know delete was called.
  });
});
