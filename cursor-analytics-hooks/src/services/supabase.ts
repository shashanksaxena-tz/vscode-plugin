import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TelemetryEvent {
  user_id: string;
  session_id: string;
  timestamp: string;
  event_type: string;
  platform: string;
  model?: string;
  prompt_encrypted?: string;
  response_encrypted?: string;
  metadata?: Record<string, unknown>;
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    // defaults for development
    const url = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
    const key = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
    this.client = createClient(url, key);
  }

  async insertEvent(event: TelemetryEvent) {
    const { error } = await this.client
      .from('events')
      .insert(event);

    if (error) {
        console.error('Supabase insert error:', error);
    }
  }
}
