import { SupabaseService } from '../services/supabase';
import { EncryptionService } from '../services/encryption';

interface AfterMCPExecutionInput {
  conversation_id: string;
  generation_id: string;
  model: string;
  user_email: string;
  tool_name: string;
  tool_input: string;
  result_json: string;
  duration: number;
}

const supabase = new SupabaseService();
const encryption = new EncryptionService();

export async function handleAfterMCPExecution(
  input: AfterMCPExecutionInput
): Promise<object> {

  await supabase.insertEvent({
    user_id: input.user_email,
    session_id: input.conversation_id,
    timestamp: new Date().toISOString(),
    event_type: 'response_received',
    platform: 'cursor',
    model: input.model,
    response_encrypted: encryption.encrypt(input.result_json),
    metadata: {
      tool_name: input.tool_name,
      latency_ms: input.duration,
      result_length: input.result_json.length,
    }
  });

  return {};
}
