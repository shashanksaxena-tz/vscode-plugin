import { SupabaseService } from '../services/supabase';

const supabase = new SupabaseService();

export async function handleAfterFileEdit(input: any): Promise<object> {
  // Check if we have user info
  if (!input.user_email) return {};

  await supabase.insertEvent({
    user_id: input.user_email,
    session_id: input.conversation_id || 'unknown',
    timestamp: new Date().toISOString(),
    event_type: 'file_edit',
    platform: 'cursor',
    metadata: {
      file_path: input.filename || input.file_path,
      // Capture other relevant metadata if available
    }
  });

  return {};
}
