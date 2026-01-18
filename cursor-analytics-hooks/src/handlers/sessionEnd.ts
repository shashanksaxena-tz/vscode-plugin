import { SupabaseService } from '../services/supabase';

const supabase = new SupabaseService();

export async function handleSessionEnd(input: any): Promise<object> {
  if (!input.user_email) return {};

  await supabase.insertEvent({
    user_id: input.user_email,
    session_id: input.conversation_id || 'unknown',
    timestamp: new Date().toISOString(),
    event_type: 'session_end',
    platform: 'cursor',
    metadata: {
       // Capture session end metadata
    }
  });

  return {};
}
