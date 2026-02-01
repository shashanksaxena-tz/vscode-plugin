import { render, screen } from '@testing-library/react';
import TeamDashboardPage from '@/app/dashboard/team/page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/components/TeamTable', () => ({
  TeamTable: ({ members }: { members: any[] }) => (
    <div data-testid="team-table">
      {members ? `Members: ${members.length}` : 'No Members'}
    </div>
  ),
}));

describe('TeamDashboardPage', () => {
  const mockCreateClient = createClient as jest.Mock;
  const mockRedirect = redirect as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login if user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    try { await TeamDashboardPage(); } catch (e) {}
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to dashboard if user is not manager or admin', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'dev@example.com' } }
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'developer' },
              error: null
            }),
          }),
        }),
      }),
    });

    try { await TeamDashboardPage(); } catch (e) {}
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('renders team members for manager', async () => {
    const mockUsers = [
      { email: 'alice@example.com', department: 'Engineering' },
      { email: 'bob@example.com', department: 'Engineering' },
    ];

    const mockScores = [
      { user_id: 'alice@example.com', overall_score: 80 }
    ];

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'manager@example.com' } }
        }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'users') {
          // We need to support two chains:
          // 1. select().eq().single() -> user profile
          // 2. select().eq() -> team list (awaited directly)

          const chain = {
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'manager', department: 'Engineering' },
              error: null
            }),
            returns: jest.fn().mockResolvedValue({
              data: mockUsers,
              error: null
            })
          };

          return {
            select: jest.fn().mockReturnValue(chain)
          };
        }

        if (table === 'quality_scores') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  returns: jest.fn().mockResolvedValue({
                    data: mockScores,
                    error: null
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      }),
    });

    const jsx = await TeamDashboardPage();
    render(jsx);

    expect(screen.getByText('Team Analytics')).toBeInTheDocument();
    expect(screen.getByText('Department: Engineering')).toBeInTheDocument();
    expect(screen.getByTestId('team-table')).toHaveTextContent('Members: 2');
  });
});
