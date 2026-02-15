
import { cohortDetection } from '../../jobs/cohortDetection';
import { createClient } from '../../utils/supabase';

// Mock setup
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockDeleteChain = {
    eq: jest.fn().mockReturnThis(),
    then: (resolve: any) => Promise.resolve({ error: null }).then(resolve)
};
const mockDelete = jest.fn().mockReturnValue(mockDeleteChain);
const mockUpdate = jest.fn().mockResolvedValue({ error: null });
const mockInsert = jest.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null });
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockGte = jest.fn().mockReturnThis();

const mockSupabase = {
    from: jest.fn(),
};

jest.mock('../../utils/supabase', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

jest.mock('../../services/email', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../utils/audit', () => ({
  logAudit: jest.fn(),
}));

describe('Cohort Detection Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock behavior
    mockSupabase.from.mockImplementation((table: string) => {
        const chain: any = {
            select: mockSelect,
            eq: mockEq,
            gte: mockGte,
            single: mockSingle,
            upsert: mockUpsert,
            update: mockUpdate,
            insert: mockInsert,
            delete: mockDelete,
        };
        // Allow chaining
        mockSelect.mockReturnValue(chain);
        mockEq.mockReturnValue(chain);
        mockGte.mockReturnValue(chain);
        return chain;
    });
  });

  it('correctly handles multi-platform usage on the same day', async () => {
    const mockMetrics = [
      {
        user_id: 'multi-platform',
        date: '2024-01-01',
        platform: 'vscode',
        total_prompts: 30,
        accepted_count: 5,
        retry_count: 5,
        context_avg_files: 2,
      },
      {
        user_id: 'multi-platform',
        date: '2024-01-01',
        platform: 'intellij',
        total_prompts: 30,
        accepted_count: 5,
        retry_count: 5,
        context_avg_files: 2,
      }
    ];

    // Override specific calls
    mockGte.mockResolvedValueOnce({ data: mockMetrics, error: null });

    // Mock cohorts lookup to return specific IDs
    // We need to differentiate based on the `eq` call which happens BEFORE `single`
    // But `mockEq` returns `chain`, and `chain.single` is `mockSingle`.
    // This simple mock structure makes it hard to differentiate return values based on previous calls.

    // Let's make `mockSingle` smart enough to check calls? No, `single` doesn't know context.
    // We need separate chains for separate tables/queries.

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_metrics') {
            return {
                select: jest.fn().mockReturnThis(),
                gte: jest.fn().mockResolvedValue({ data: mockMetrics, error: null })
            };
        }
        if (table === 'cohorts') {
            return {
                select: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(), // Add update here for chaining
                eq: jest.fn().mockImplementation((col, val) => {
                    // If called after update(), val is the ID
                    if (col === 'id') {
                        return { error: null };
                    }

                    const id = val === 'Over-prompters' ? 'c_over' :
                               val === 'Context-light users' ? 'c_light' :
                               'c_retry';
                    return {
                        single: jest.fn().mockResolvedValue({ data: { id }, error: null }),
                        update: jest.fn().mockResolvedValue({ error: null }),
                    };
                }),
                insert: jest.fn().mockResolvedValue({ data: { id: 'new' }, error: null })
            };
        }
        if (table === 'cohort_members') {
             return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), // Not a member
                upsert: mockUpsert, // Capture upserts
                delete: mockDelete  // Capture deletes
            };
        }
        return { select: jest.fn() };
    });

    await cohortDetection();

    // Check if 'Over-prompters' (c_over) upsert happened
    // The user 'multi-platform' has 60 total prompts.
    // If logic counts days=2, avg=30 -> No upsert.
    // If logic counts days=1, avg=60 -> Upsert.

    // We expect the user to be added to Over-prompters if logic is correct.
    const upsertCalls = mockUpsert.mock.calls;
    const addedToOverPrompters = upsertCalls.some(call =>
        call[0].cohort_id === 'c_over' && call[0].user_id === 'multi-platform'
    );

    // Check 'Context-light': avg files = 2. Criteria < 2. Should NOT be added.
    const addedToContextLight = upsertCalls.some(call =>
        call[0].cohort_id === 'c_light' && call[0].user_id === 'multi-platform'
    );

    // If addedToOverPrompters is false, it means the bug exists.
    // If it is true, the bug is fixed or doesn't exist.

    // We assert based on expected behavior (correct logic).
    // If the test fails, we fix the code.
    expect(addedToOverPrompters).toBe(true);
    expect(addedToContextLight).toBe(false);
  });
});
