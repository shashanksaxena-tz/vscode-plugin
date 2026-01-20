import { render, screen } from '@testing-library/react';
import { AuditLogTable } from '@/components/AuditLogTable';
import { Database } from '@/types/database';

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

describe('AuditLogTable', () => {
  it('renders "No audit logs found" when logs are empty or null', () => {
    const { rerender } = render(<AuditLogTable logs={[]} />);
    expect(screen.getByText('No audit logs found.')).toBeInTheDocument();

    rerender(<AuditLogTable logs={null} />);
    expect(screen.getByText('No audit logs found.')).toBeInTheDocument();
  });

  it('renders a list of audit logs', () => {
    const mockLogs: AuditLog[] = [
      {
        id: '1',
        user_email: 'test@example.com',
        action: 'login',
        target_resource: 'auth',
        details: { ip: '127.0.0.1' },
        created_at: '2024-01-01T10:00:00Z',
      },
      {
        id: '2',
        user_email: 'admin@example.com',
        action: 'delete_user',
        target_resource: 'user_123',
        details: {},
        created_at: '2024-01-01T11:00:00Z',
      },
    ];

    render(<AuditLogTable logs={mockLogs} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.getByText('auth')).toBeInTheDocument();

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('delete_user')).toBeInTheDocument();
    expect(screen.getByText('user_123')).toBeInTheDocument();
  });
});
