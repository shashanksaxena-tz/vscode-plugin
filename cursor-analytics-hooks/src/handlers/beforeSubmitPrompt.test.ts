import { handleBeforeSubmitPrompt } from './beforeSubmitPrompt';
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
      encrypt: jest.fn().mockReturnValue('encrypted_data')
    }))
  };
});

describe('handleBeforeSubmitPrompt', () => {
  let supabaseInstance: any;
  let encryptionInstance: any;

  beforeAll(() => {
    // We access the returned object via results, because the constructor returns an explicit object
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

  it('should log prompt submission and allow request', async () => {
    const input = {
      conversation_id: 'conv-123',
      generation_id: 'gen-123',
      model: 'gpt-4',
      user_email: 'test@example.com',
      cursor_version: '1.0.0',
      workspace_roots: ['/root'],
      prompt: 'test prompt',
      context_files: ['file1.ts', 'file2.ts'],
    };

    const result = await handleBeforeSubmitPrompt(input);

    expect(result).toEqual({ permission: 'allow' });

    expect(supabaseInstance).toBeDefined();
    expect(supabaseInstance.insertEvent).toBeDefined();

    expect(supabaseInstance.insertEvent).toHaveBeenCalledTimes(1);
    expect(supabaseInstance.insertEvent).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'test@example.com',
      session_id: 'conv-123',
      event_type: 'prompt_submitted',
      model: 'gpt-4',
      prompt_encrypted: 'encrypted_data',
      metadata: expect.objectContaining({
        context_files: 2,
        prompt_length: 11,
        workspace_roots: ['/root']
      })
    }));

    expect(encryptionInstance.encrypt).toHaveBeenCalledWith('test prompt');
  });
});
