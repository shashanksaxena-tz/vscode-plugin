import { logAudit } from './audit';
import { createClient } from './supabase';

// Mock Supabase client
jest.mock('./supabase', () => ({
  createClient: jest.fn(),
}));

describe('logAudit', () => {
  let mockSupabase: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should insert audit log successfully', async () => {
    mockSupabase.insert.mockResolvedValue({ error: null });

    await logAudit({
      user_email: 'test@example.com',
      action: 'test_action',
      details: { foo: 'bar' },
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      user_email: 'test@example.com',
      action: 'test_action',
      target_resource: undefined,
      details: { foo: 'bar' },
      ip_address: undefined,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should handle Supabase error gracefully', async () => {
    const error = { message: 'Supabase error' };
    mockSupabase.insert.mockResolvedValue({ error });

    await logAudit({
      user_email: 'test@example.com',
      action: 'test_action',
    });

    expect(mockSupabase.insert).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to insert audit log:', error);
  });

  it('should catch unexpected exceptions', async () => {
    mockSupabase.insert.mockRejectedValue(new Error('Unexpected error'));

    await logAudit({
      user_email: 'test@example.com',
      action: 'test_action',
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Exception while logging audit:', expect.any(Error));
  });
});
