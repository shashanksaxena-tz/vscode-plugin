export enum EventType {
  COMPLETION_REQUESTED = 'completion_requested',
  COMPLETION_SHOWN = 'completion_shown',
  COMPLETION_ACCEPTED = 'completion_accepted',
  COMPLETION_REJECTED = 'completion_rejected',
  PROMPT_SUBMITTED = 'prompt_submitted',
  RESPONSE_RECEIVED = 'response_received',
  EDIT_AFTER_ACCEPT = 'edit_after_accept',
}

export interface TelemetryEvent {
  user_id: string;
  session_id: string;
  timestamp: string;
  event_type: EventType;
  platform: 'copilot' | 'cursor';
  model?: string;
  prompt_data?: string;
  prompt_encrypted?: string;
  response_data?: string;
  response_encrypted?: string;
  metadata: {
    file_type?: string;
    context_files?: number;
    context_size_tokens?: number;
    response_tokens?: number;
    latency_ms?: number;
    retry_count?: number;
    line_number?: number;
    inserted_length?: number;
    trigger_kind?: number;
    [key: string]: unknown;
  };
}
