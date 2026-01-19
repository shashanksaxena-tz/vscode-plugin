export interface Database {
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
          model?: string;
          prompt_encrypted?: string;
          response_encrypted?: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          user_id: string;
          session_id: string;
          timestamp: string;
          event_type: string;
          platform: string;
          model?: string;
          prompt_encrypted?: string;
          response_encrypted?: string;
          metadata: any;
        };
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
      };
    };
  };
}
