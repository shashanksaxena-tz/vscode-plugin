import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || '';

    // Handle case where env vars are missing to prevent crash on init
    if (!url || !key) {
        console.warn('Supabase credentials missing in environment variables');
    }

    this.client = createClient(url, key);
  }

  async insertEvent(event: any) {
    if (!this.client) return;

    const { error } = await this.client
      .from('events')
      .insert(event);

    if (error) {
      console.error('Failed to insert event to Supabase:', error);
    }
  }
}
