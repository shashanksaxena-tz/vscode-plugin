import { render, screen, waitFor } from '@testing-library/react';
import CohortsPage from '@/app/dashboard/cohorts/page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    // Next.js redirect actually throws an error to halt execution
    const error = new Error('NEXT_REDIRECT');
    (error as any).digest = 'NEXT_REDIRECT;replace;' + url;
    throw error;
  }),
}));

jest.mock('@/components/CohortTable', () => ({
  CohortTable: ({ cohorts }: { cohorts: any[] }) => (
    <div data-testid="cohort-table">
      {cohorts ? `Cohorts: ${cohorts.length}` : 'No Cohorts'}
    </div>
  ),
}));

describe('CohortsPage', () => {
  const mockCreateClient = createClient as jest.Mock;
  const mockRedirect = redirect as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login if user is not authenticated', async () => {
    // Mock Supabase client for unauthenticated user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    try {
      await CohortsPage();
    } catch (e) {
      // ignore redirect error
    }

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to dashboard if user is developer (not manager or admin)', async () => {
    // Mock Supabase client for authenticated developer user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com' } }
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

    try {
      await CohortsPage();
    } catch (e) {
      // ignore redirect error
    }

    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('renders dashboard with cohorts for manager user', async () => {
    const mockCohorts = [
      { id: '1', name: 'Cohort A' },
      { id: '2', name: 'Cohort B' },
    ];

    // Mock Supabase client for manager user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'manager@example.com' } }
        }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'manager' },
                  error: null
                }),
              }),
            }),
          };
        }
        if (table === 'cohorts') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                data: mockCohorts,
                error: null
              }),
            }),
          };
        }
        return { select: jest.fn() };
      }),
    });

    const jsx = await CohortsPage();
    render(jsx);

    expect(screen.getByText('Cohort Management')).toBeInTheDocument();
    expect(screen.getByTestId('cohort-table')).toHaveTextContent('Cohorts: 2');
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
