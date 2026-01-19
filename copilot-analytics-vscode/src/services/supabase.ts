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
    // Force casting to any to bypass the complex type matching issue with Supabase generic
    // This often happens when the generated types don't perfectly align with the library's expectations
    // or when there are strictness flags enabled.
    const records = events.map(e => ({
        user_id: e.user_id,
        session_id: e.session_id,
        timestamp: e.timestamp,
        event_type: e.event_type as string,
        platform: e.platform as string,
        model: e.model,
        prompt_encrypted: e.prompt_encrypted,
        response_encrypted: e.response_encrypted,
        metadata: e.metadata,
      }));

    const { error } = await this.client
      .from('events')
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
    return (data as any)?.overall_score || 0;
  }
}
