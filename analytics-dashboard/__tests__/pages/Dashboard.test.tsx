import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/components/CoachingPlanCard', () => ({
  CoachingPlanCard: ({ cohorts }: { cohorts: any[] }) => (
    <div data-testid="coaching-plan">
      {cohorts && cohorts.length > 0 ? `Plans: ${cohorts.length}` : 'No Plans'}
    </div>
  ),
}));

// Mock other components
jest.mock('@/components/ScoreCard', () => ({ ScoreCard: () => <div>ScoreCard</div> }));
jest.mock('@/components/MetricsChart', () => ({ MetricsChart: () => <div>MetricsChart</div> }));
jest.mock('@/components/SuggestionsList', () => ({ SuggestionsList: () => <div>SuggestionsList</div> }));

describe('DashboardPage', () => {
  const mockCreateClient = createClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with coaching plan', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'dev@example.com' } }
        }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'quality_scores') {
           return {
               select: jest.fn().mockReturnValue({
                   eq: jest.fn().mockReturnValue({
                       order: jest.fn().mockReturnValue({
                           limit: jest.fn().mockReturnValue({
                               single: jest.fn().mockResolvedValue({ data: {}, error: null }),
                               // Since limit(8) is called for history, and it is awaited directly (or via implicit then)
                               // The chain in code is: select().eq().order().limit(8)
                               // which returns a PostgrestFilterBuilder that is awaitable.
                               then: jest.fn().mockImplementation(r => r({ data: [], error: null }))
                           })
                       })
                   })
               })
           };
        }
        if (table === 'daily_metrics') {
            return {
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        gte: jest.fn().mockReturnValue({
                            order: jest.fn().mockResolvedValue({ data: [], error: null })
                        })
                    })
                })
            };
        }
        if (table === 'cohort_members') {
            return {
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({
                        data: [{ cohort_id: '123' }],
                        error: null
                    })
                })
            };
        }
        if (table === 'cohorts') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({
                        data: [{ name: 'C1' }],
                        error: null
                    })
                })
            };
        }
        return { select: jest.fn() };
      }),
    });

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByText('My Copilot Analytics')).toBeInTheDocument();
    expect(screen.getByTestId('coaching-plan')).toHaveTextContent('Plans: 1');
  });
});
