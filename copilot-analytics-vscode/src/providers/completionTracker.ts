import * as vscode from 'vscode';
import { TelemetryService } from '../services/telemetry';
import { TelemetryEvent, EventType } from '../types/events';
import { StatusBarManager } from '../ui/statusBar';

export class CompletionTracker implements vscode.InlineCompletionItemProvider {
  private pendingCompletions: Map<string, { text: string; timestamp: number }> = new Map();

  constructor(
    private telemetry: TelemetryService,
    private statusBar?: StatusBarManager
  ) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null> {

    // Record that a completion was requested
    const completionId = `${document.uri.toString()}-${position.line}-${Date.now()}`;

    await this.telemetry.record({
      event_type: EventType.COMPLETION_REQUESTED,
      timestamp: new Date().toISOString(),
      metadata: {
        file_type: this.getFileExtension(document.fileName),
        line_number: position.line,
        context_files: this.telemetry.getOpenFileCount(),
        trigger_kind: context.triggerKind,
      }
    });

    // Let Copilot handle actual completion - we just observe
    return null;
  }

  onDocumentChange(event: vscode.TextDocumentChangeEvent) {
    // Detect if this looks like an accepted completion
    for (const change of event.contentChanges) {
      if (this.looksLikeAcceptedCompletion(change)) {
        this.telemetry.record({
          event_type: EventType.COMPLETION_ACCEPTED,
          timestamp: new Date().toISOString(),
          metadata: {
            file_type: this.getFileExtension(event.document.fileName),
            inserted_length: change.text.length,
            range_length: change.rangeLength,
          }
        });

        // Update status bar with accepted completion
        this.statusBar?.recordCompletion(true);
      }
    }
  }

  private looksLikeAcceptedCompletion(change: vscode.TextDocumentContentChangeEvent): boolean {
    // Heuristic: Multi-line or substantial single-line insertions
    return change.text.length > 20 || change.text.includes('\n');
  }

  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop() || 'unknown';
  }
}
