export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          department: string | null;
          role: "developer" | "manager" | "admin";
          created_at: string;
          last_active: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          department?: string | null;
          role?: "developer" | "manager" | "admin";
          created_at?: string;
          last_active?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          department?: string | null;
          role?: "developer" | "manager" | "admin";
          created_at?: string;
          last_active?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          timestamp: string;
          event_type: string;
          platform: "copilot" | "cursor" | "copilot-intellij";
          model: string | null;
          prompt_encrypted: string | null;
          response_encrypted: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          timestamp: string;
          event_type: string;
          platform: "copilot" | "cursor" | "copilot-intellij";
          model?: string | null;
          prompt_encrypted?: string | null;
          response_encrypted?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      daily_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          platform: string;
          total_prompts: number;
          accepted_count: number;
          rejected_count: number;
          retry_count: number;
          total_tokens_used: number;
          avg_response_time_ms: number;
          context_avg_files: number;
          context_avg_tokens: number;
          file_types_worked: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_metrics"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["daily_metrics"]["Insert"]>;
        Relationships: [];
      };
      quality_scores: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          effectiveness_score: number;
          best_practices_score: number;
          efficiency_score: number;
          overall_score: number;
          insights: Json;
          suggestions: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quality_scores"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["quality_scores"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
    Enums: {
      [_ in never]: never
    };
  };
}
