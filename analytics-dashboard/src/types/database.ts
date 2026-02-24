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
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          timestamp?: string;
          event_type?: string;
          platform?: "copilot" | "cursor" | "copilot-intellij";
          model?: string | null;
          prompt_encrypted?: string | null;
          response_encrypted?: string | null;
          metadata?: Json;
          created_at?: string;
        };
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
        Insert: {
          id?: string;
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
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          platform?: string;
          total_prompts?: number;
          accepted_count?: number;
          rejected_count?: number;
          retry_count?: number;
          total_tokens_used?: number;
          avg_response_time_ms?: number;
          context_avg_files?: number;
          context_avg_tokens?: number;
          file_types_worked?: Json;
          created_at?: string;
        };
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
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          effectiveness_score: number;
          best_practices_score: number;
          efficiency_score: number;
          overall_score: number;
          insights: Json;
          suggestions: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start_date?: string;
          effectiveness_score?: number;
          best_practices_score?: number;
          efficiency_score?: number;
          overall_score?: number;
          insights?: Json;
          suggestions?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      cohorts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          criteria: Json;
          member_count: number;
          coaching_plan: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          criteria: Json;
          member_count?: number;
          coaching_plan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          criteria?: Json;
          member_count?: number;
          coaching_plan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cohort_members: {
        Row: {
          cohort_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          cohort_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          cohort_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_email: string;
          action: string;
          target_resource: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_email: string;
          action: string;
          target_resource?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_email?: string;
          action?: string;
          target_resource?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
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
    CompositeTypes: {
      [_ in never]: never
    };
  };
}
