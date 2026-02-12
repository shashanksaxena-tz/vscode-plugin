import { render, screen } from '@testing-library/react';
import TeamDashboardPage from '@/app/dashboard/team/page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation(() => { throw new Error('NEXT_REDIRECT'); }),
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
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } }),
      },
    });

    try {
        await TeamDashboardPage();
    } catch (e: any) {
        if (e.message !== 'NEXT_REDIRECT') throw e;
    }
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to dashboard if user is not manager or admin', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'dev@example.com' } },
          error: null
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue({
              then: (resolve: any) => resolve({
                 data: { role: 'developer', email: 'dev@example.com' },
                 error: null
              }),
            }),
          }),
        }),
      }),
    });

    try {
        await TeamDashboardPage();
    } catch (e: any) {
        if (e.message !== 'NEXT_REDIRECT') throw e;
    }
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

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'manager@example.com' } },
          error: null
        }),
      },
      from: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
            return {
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockImplementation((field, value) => {
                        // Profile fetch
                        if (field === 'email' && value === 'manager@example.com') {
                            return {
                                single: jest.fn().mockReturnValue({
                                    then: (resolve: any) => resolve({
                                        data: { role: 'manager', department: 'Engineering', email: 'manager@example.com' },
                                        error: null
                                    }),
                                })
                            };
                        }
                        // Team fetch (with dept)
                        if (field === 'department' && value === 'Engineering') {
                             return {
                                 returns: jest.fn().mockReturnValue({
                                     then: (resolve: any) => resolve({ data: mockUsers, error: null })
                                 })
                             };
                        }
                        return { single: jest.fn(), returns: jest.fn() };
                    }),
                    // Fallback for .is() if dept is null
                    is: jest.fn().mockReturnValue({
                         returns: jest.fn().mockReturnValue({
                             then: (resolve: any) => resolve({ data: mockUsers, error: null })
                         })
                    }),
                    returns: jest.fn()
                })
            };
        }

        if (table === 'quality_scores') {
             return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockReturnValue({
                        order: jest.fn().mockReturnValue({
                            returns: jest.fn().mockReturnValue({
                                then: (resolve: any) => resolve({ data: mockScores, error: null })
                            })
                        })
                    })
                })
             };
        }

        return { select: jest.fn() };
    });

    const jsx = await TeamDashboardPage();
    render(jsx);

    expect(screen.getByText('Team Analytics')).toBeInTheDocument();
    expect(screen.getByText('Department: Engineering')).toBeInTheDocument();
    expect(screen.getByTestId('team-table')).toHaveTextContent('Members: 2');
  });
});
