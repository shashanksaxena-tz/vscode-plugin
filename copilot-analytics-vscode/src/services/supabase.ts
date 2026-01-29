import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TelemetryEvent } from '../types/events';
import { Database } from '../types/database';

export class SupabaseService {
  // Removing generic to avoid 'never' inference issues with strict Supabase types
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    // Removing generic here as well
    this.client = createClient(url, anonKey);
  }

  async authenticate(githubToken: string) {
    const { error } = await this.client.auth.signInWithIdToken({
      provider: 'github',
      token: githubToken,
    });
    if (error) throw error;
  }

  async getUserEmail(): Promise<string | undefined> {
    const { data: { user } } = await this.client.auth.getUser();
    return user?.email;
  }

  async insertEvents(events: TelemetryEvent[]) {
    // We strictly type the payload here to ensure we match the DB schema
    const records: Database['public']['Tables']['events']['Insert'][] = events.map(e => ({
      user_id: e.user_id,
      session_id: e.session_id,
      timestamp: e.timestamp,
      event_type: e.event_type,
      platform: e.platform,
      model: e.model,
      prompt_encrypted: e.prompt_encrypted,
      response_encrypted: e.response_encrypted,
      metadata: e.metadata,
    }));

    const { error } = await this.client
      .from('events')
      .insert(records);

    if (error) throw error;
  }

  async getMyScore(): Promise<number> {
    const { data, error } = await this.client
      .from('quality_scores')
      .select('overall_score')
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) return 0;
    // data is now any, so this access is unchecked but safe if schema matches
    return data?.overall_score || 0;
  }
}
