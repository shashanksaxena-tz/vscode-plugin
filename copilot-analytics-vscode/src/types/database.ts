export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          user_id: string
          session_id: string
          timestamp: string
          event_type: string
          platform: string
          model: string | null
          prompt_encrypted: string | null
          response_encrypted: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          timestamp: string
          event_type: string
          platform: string
          model?: string | null
          prompt_encrypted?: string | null
          response_encrypted?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          timestamp?: string
          event_type?: string
          platform?: string
          model?: string | null
          prompt_encrypted?: string | null
          response_encrypted?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      quality_scores: {
        Row: {
          id: string
          user_id: string
          week_start_date: string
          overall_score: number
          effectiveness_score: number
          best_practices_score: number
          efficiency_score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start_date: string
          overall_score: number
          effectiveness_score: number
          best_practices_score: number
          efficiency_score: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start_date?: string
          overall_score?: number
          effectiveness_score?: number
          best_practices_score?: number
          efficiency_score?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
