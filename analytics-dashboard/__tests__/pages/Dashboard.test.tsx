import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));

// Mock components to simplify tests
jest.mock('@/components/ScoreCard', () => ({
  ScoreCard: ({ title, score }: any) => <div data-testid={`score-card-${title}`}>{title}: {score}</div>,
}));

jest.mock('@/components/MetricsChart', () => ({
  MetricsChart: ({ data }: any) => <div data-testid="metrics-chart">Chart Data: {data.length}</div>,
}));

jest.mock('@/components/SuggestionsList', () => ({
  SuggestionsList: ({ suggestions }: any) => <div data-testid="suggestions-list">Suggestions: {suggestions.length}</div>,
}));

describe('DashboardPage', () => {
  const mockCreateClient = createClient as jest.Mock;
  const mockRedirect = redirect as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login if user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('Auth error') }),
      },
    });

    try { await DashboardPage(); } catch (e: any) {
        if (e.message !== 'NEXT_REDIRECT') throw e;
    }
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders dashboard with data for authenticated user', async () => {
    const mockUser = { email: 'user@example.com' };
    const mockLatestScore = {
      overall_score: 85,
      effectiveness_score: 80,
      best_practices_score: 90,
      efficiency_score: 85,
      suggestions: ['Use more context']
    };
    const mockHistory = [
      { week_start_date: '2023-01-01', overall_score: 80 },
      { week_start_date: '2023-01-08', overall_score: 85 }
    ];
    const mockMetrics = [
      { date: '2023-01-01', total_prompts: 10 },
      { date: '2023-01-02', total_prompts: 12 }
    ];

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'quality_scores') {
          // This handles both latest score (single) and history (list) queries based on chain usage
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockImplementation((limitArg) => {
              if (limitArg === 1) {
                // Latest score query
                return {
                  single: jest.fn().mockResolvedValue({ data: mockLatestScore, error: null })
                };
              }
              // History query
              return {
                 then: jest.fn((resolve) => resolve({ data: mockHistory, error: null }))
              };
            })
          };
          return chain;
        }

        if (table === 'daily_metrics') {
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => {
                // Returns a promise-like object
                return {
                    then: jest.fn((resolve) => resolve({ data: mockMetrics, error: null }))
                }
            })
          };
          return chain;
        }

        return { select: jest.fn() };
      }),
    });

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByText('My Copilot Analytics')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, user@example.com')).toBeInTheDocument();

    // Check ScoreCards
    expect(screen.getByTestId('score-card-Overall Score')).toHaveTextContent('Overall Score: 85');
    expect(screen.getByTestId('score-card-Effectiveness')).toHaveTextContent('Effectiveness: 80');

    // Check Charts
    const charts = screen.getAllByTestId('metrics-chart');
    expect(charts).toHaveLength(2); // Score Trend and Daily Activity
    expect(charts[0]).toHaveTextContent('Chart Data: 2'); // History
    expect(charts[1]).toHaveTextContent('Chart Data: 2'); // Metrics

    // Check Suggestions
    expect(screen.getByTestId('suggestions-list')).toHaveTextContent('Suggestions: 1');
  });

  it('handles empty data gracefully', async () => {
    const mockUser = { email: 'user@example.com' };

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'quality_scores') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockImplementation((limitArg) => {
              if (limitArg === 1) {
                return {
                  single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
                };
              }
              return {
                 then: jest.fn((resolve) => resolve({ data: [], error: null }))
              };
            })
          };
        }
        if (table === 'daily_metrics') {
             return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                order: jest.fn().mockImplementation(() => ({
                    then: jest.fn((resolve) => resolve({ data: [], error: null }))
                }))
             };
        }
        return { select: jest.fn() };
      }),
    });

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByText('My Copilot Analytics')).toBeInTheDocument();

    // Should display 0s
    expect(screen.getByTestId('score-card-Overall Score')).toHaveTextContent('Overall Score: 0');

    // Charts should be empty
    const charts = screen.getAllByTestId('metrics-chart');
    expect(charts[0]).toHaveTextContent('Chart Data: 0');
  });
});
