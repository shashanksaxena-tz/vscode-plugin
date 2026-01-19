import * as vscode from 'vscode';
import { SupabaseService } from './supabase';
import { EncryptionService } from './encryption';
import { TelemetryEvent } from '../types/events';

export class TelemetryService {
  private buffer: TelemetryEvent[] = [];
  private sessionId: string;
  private encryption: EncryptionService;
  private flushInterval: NodeJS.Timeout;

  constructor(
    private supabase: SupabaseService,
    private userId: string
  ) {
    this.sessionId = this.generateSessionId();
    this.encryption = new EncryptionService();

    // Flush buffer every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  async record(event: Partial<TelemetryEvent>) {
    const fullEvent: TelemetryEvent = {
      user_id: this.userId,
      session_id: this.sessionId,
      platform: 'copilot',
      timestamp: new Date().toISOString(),
      ...event,
    } as TelemetryEvent;

    // Encrypt sensitive fields
    if (fullEvent.prompt_data) {
      fullEvent.prompt_encrypted = this.encryption.encrypt(fullEvent.prompt_data);
      delete fullEvent.prompt_data;
    }

    this.buffer.push(fullEvent);

    // Flush if buffer is large
    if (this.buffer.length >= 50) {
      await this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await this.supabase.insertEvents(events);
    } catch (error) {
      // Re-add to buffer on failure
      this.buffer.unshift(...events);
      console.error('Failed to flush telemetry:', error);
    }
  }

  updateContext(editor: vscode.TextEditor) {
    // Track context for metadata enrichment
  }

  getOpenFileCount(): number {
    return vscode.workspace.textDocuments.filter(d => !d.isUntitled).length;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  dispose() {
    clearInterval(this.flushInterval);
    this.flush();
  }
}
