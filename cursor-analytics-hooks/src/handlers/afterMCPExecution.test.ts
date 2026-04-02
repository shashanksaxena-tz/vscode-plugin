import { handleAfterMCPExecution } from './afterMCPExecution';
import { SupabaseService } from '../services/supabase';
import { EncryptionService } from '../services/encryption';

jest.mock('../services/supabase', () => {
  return {
    SupabaseService: jest.fn(() => ({
      insertEvent: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

jest.mock('../services/encryption', () => {
  return {
    EncryptionService: jest.fn(() => ({
      encrypt: jest.fn().mockReturnValue('encrypted_response')
    }))
  };
});

describe('handleAfterMCPExecution', () => {
  let supabaseInstance: any;
  let encryptionInstance: any;

  beforeAll(() => {
    if ((SupabaseService as jest.Mock).mock.results.length > 0) {
        supabaseInstance = (SupabaseService as jest.Mock).mock.results[0].value;
    }
    if ((EncryptionService as jest.Mock).mock.results.length > 0) {
        encryptionInstance = (EncryptionService as jest.Mock).mock.results[0].value;
    }
  });

  beforeEach(() => {
    if (supabaseInstance && supabaseInstance.insertEvent) supabaseInstance.insertEvent.mockClear();
    if (encryptionInstance && encryptionInstance.encrypt) encryptionInstance.encrypt.mockClear();
  });

  it('should log MCP execution response', async () => {
    const input = {
      conversation_id: 'conv-456',
      generation_id: 'gen-456',
      model: 'claude-3',
      user_email: 'user@example.com',
      tool_name: 'git_status',
      tool_input: '{}',
      result_json: '{"status": "clean"}',
      duration: 150,
    };

    const result = await handleAfterMCPExecution(input);

    expect(result).toEqual({});

    expect(supabaseInstance.insertEvent).toHaveBeenCalledTimes(1);
    expect(supabaseInstance.insertEvent).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user@example.com',
      session_id: 'conv-456',
      event_type: 'response_received',
      model: 'claude-3',
      response_encrypted: 'encrypted_response',
      metadata: expect.objectContaining({
        tool_name: 'git_status',
        latency_ms: 150,
        result_length: 19
      })
    }));

    expect(encryptionInstance.encrypt).toHaveBeenCalledWith('{"status": "clean"}');
  });
});
