import { render, screen, waitFor } from '@testing-library/react';
import AdminDashboardPage from '@/app/dashboard/admin/page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation(() => {
    const error = new Error('NEXT_REDIRECT');
    (error as any).digest = 'NEXT_REDIRECT';
    throw error;
  }),
}));

jest.mock('@/components/AuditLogTable', () => ({
  AuditLogTable: ({ logs }: { logs: any[] }) => (
    <div data-testid="audit-log-table">
      {logs ? `Logs: ${logs.length}` : 'No Logs'}
    </div>
  ),
}));

describe('AdminDashboardPage', () => {
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
      from: jest.fn(), // Prevent TypeError if redirect fails
    });

    try {
      await AdminDashboardPage();
    } catch (e) {
      // ignore redirect error
    }

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to dashboard if user is not admin', async () => {
    // Mock Supabase client for authenticated non-admin user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com' } }
        }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'developer' },
                  error: null
                }),
              }),
            }),
          };
        }
        if (table === 'cohorts') {
          return {
            select: jest.fn().mockResolvedValue({ count: 5, error: null }),
          };
        }
        if (table === 'system_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { value: 'openai' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                returns: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: null, error: null, count: null }) };
      }),
    });

    try {
      await AdminDashboardPage();
    } catch (e) {
      // ignore redirect error
    }

    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('renders dashboard with logs for admin user', async () => {
    const mockLogs = [
      { id: '1', action: 'login' },
      { id: '2', action: 'logout' },
    ];

    // Mock Supabase client for admin user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'admin@example.com' } }
        }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockImplementation((columns) => {
              // the component makes two calls to `users`:
              // 1. `select("role").eq(...)`
              // 2. `select("*", { count: "exact", head: true })` which doesn't chain `.eq`
              const chain: any = {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { role: 'admin' },
                    error: null
                  }),
                }),
              };

              if (columns === "*") {
                return Promise.resolve({ count: 10, error: null });
              }

              return chain;
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: mockLogs,
                  error: null
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      }),
    });

    const jsx = await AdminDashboardPage();
    render(jsx);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-table')).toHaveTextContent('Logs: 2');
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
