import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TelemetryEvent } from '../types/events';
import { Database } from '../types/database';

export class SupabaseService {
  private client: SupabaseClient<Database>;

  constructor(url: string, anonKey: string) {
    this.client = createClient<Database>(url, anonKey);
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
    const records: Database['public']['Tables']['events']['Insert'][] = events.map(e => ({
      user_id: e.user_id,
      session_id: e.session_id,
      timestamp: e.timestamp,
      event_type: e.event_type,
      platform: e.platform,
      model: e.model,
      prompt_encrypted: e.prompt_encrypted,
      response_encrypted: e.response_encrypted,
      metadata: e.metadata as unknown as Database['public']['Tables']['events']['Insert']['metadata'],
    }));

    const { error } = await this.client
      .from('events')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(records as any);

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
    return (data as unknown as { overall_score: number })?.overall_score || 0;
  }
}
