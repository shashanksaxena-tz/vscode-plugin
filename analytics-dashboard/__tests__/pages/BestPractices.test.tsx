import { render, screen } from '@testing-library/react';
import BestPracticesPage from '@/app/dashboard/best-practices/page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/components/SuggestionsList', () => ({
  SuggestionsList: ({ suggestions }: { suggestions: string[] }) => (
    <div data-testid="suggestions-list">
      {suggestions.map((s, i) => <div key={i}>{s}</div>)}
    </div>
  ),
}));

describe('BestPracticesPage', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Default mock for 'from'
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    mockSupabase.from.mockReturnValue(mockQueryBuilder);
  });

  it('redirects to login if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    // Next.js redirect throws an error, so we need to catch it in testing
    const mockRedirect = redirect as unknown as jest.Mock;
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(async () => {
      await BestPracticesPage();
    }).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('renders Best Practices page with insights and suggestions', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: 'test@example.com' } } });

    const mockTopScores = [
      {
        overall_score: 95,
        insights: ['Use specific context files'],
        suggestions: ['Always include relevant interfaces'],
        week_start_date: '2026-01-01',
      },
      {
        overall_score: 85,
        insights: ['Break down complex tasks'],
        suggestions: ['Write tests first'],
        week_start_date: '2026-01-08',
      }
    ];

    const mockLimit = jest.fn().mockResolvedValue({
      data: mockTopScores,
      error: null
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: mockLimit,
    });

    const page = await BestPracticesPage();
    render(page);

    expect(screen.getByText('Best Practice Library')).toBeInTheDocument();

    // Check if insights and suggestions are rendered
    expect(screen.getByText('Top Insights')).toBeInTheDocument();
    expect(screen.getByText('Actionable Suggestions')).toBeInTheDocument();

    expect(screen.getByText('Use specific context files')).toBeInTheDocument();
    expect(screen.getByText('Break down complex tasks')).toBeInTheDocument();
    expect(screen.getByText('Always include relevant interfaces')).toBeInTheDocument();
    expect(screen.getByText('Write tests first')).toBeInTheDocument();
  });
});
