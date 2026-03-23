export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          timestamp: string;
          event_type: string;
          platform: string;
          model: string | null;
          prompt_encrypted: string | null;
          response_encrypted: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          timestamp: string;
          event_type: string;
          platform: string;
          model?: string | null;
          prompt_encrypted?: string | null;
          response_encrypted?: string | null;
          metadata?: any;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      quality_scores: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          overall_score: number;
          effectiveness_score: number;
          best_practices_score: number;
          efficiency_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          overall_score: number;
          effectiveness_score: number;
          best_practices_score: number;
          efficiency_score: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['quality_scores']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
