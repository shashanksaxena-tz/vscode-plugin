import { SupabaseService } from '../services/supabase';
import { EncryptionService } from '../services/encryption';

interface BeforeSubmitPromptInput {
  conversation_id: string;
  generation_id: string;
  model: string;
  user_email: string;
  cursor_version: string;
  workspace_roots: string[];
  prompt: string;
  context_files: string[];
}

interface BeforeSubmitPromptOutput {
  permission: 'allow' | 'deny' | 'ask';
  user_message?: string;
}

const supabase = new SupabaseService();
const encryption = new EncryptionService();

export async function handleBeforeSubmitPrompt(
  input: BeforeSubmitPromptInput
): Promise<BeforeSubmitPromptOutput> {

  // Record the prompt submission
  await supabase.insertEvent({
    user_id: input.user_email,
    session_id: input.conversation_id,
    timestamp: new Date().toISOString(),
    event_type: 'prompt_submitted',
    platform: 'cursor',
    model: input.model,
    prompt_encrypted: encryption.encrypt(input.prompt),
    metadata: {
      context_files: input.context_files.length,
      prompt_length: input.prompt.length,
      workspace_roots: input.workspace_roots,
    }
  });

  // Always allow - we're just observing
  return { permission: 'allow' };
}
