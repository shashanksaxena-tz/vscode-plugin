import * as vscode from 'vscode';
import { TelemetryService } from './services/telemetry';
import { SupabaseService } from './services/supabase';
import { CompletionTracker } from './providers/completionTracker';

let telemetryService: TelemetryService;

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('copilotAnalytics');

  if (!config.get('enabled')) return;

  // Initialize Supabase client
  const supabase = new SupabaseService(
    config.get('supabaseUrl') as string,
    config.get('supabaseAnonKey') as string
  );

  // Authenticate user via VS Code auth
  try {
      const session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: true });
      if (session) {
        await supabase.authenticate(session.accessToken);
        // Initialize telemetry
        telemetryService = new TelemetryService(supabase, session.account.id);
      }
  } catch (e) {
      console.error('Authentication failed:', e);
  }

  if (telemetryService) {
      // Track inline completions
      const tracker = new CompletionTracker(telemetryService);

      // Register inline completion provider wrapper
      context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
          { pattern: '**' },
          tracker
        )
      );

      // Track document changes after completions
      context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
          tracker.onDocumentChange(event);
        })
      );

      // Track active editor context
      context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
          if (editor) telemetryService.updateContext(editor);
        })
      );
  }

  // Command to show score
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-analytics.showScore', async () => {
        if (!telemetryService) {
             vscode.window.showErrorMessage('Copilot Analytics is not active. Please check your configuration and authentication.');
             return;
        }
       // Accessing private supabase service via telemetryService would be cleaner if exposed,
       // but for now we reuse the supabase instance we created.
       // However, in the spec, telemetryService took supabase as a dependency.
       // We can just use the local supabase instance here.
      const score = await supabase.getMyScore();
      vscode.window.showInformationMessage(`Your Copilot Score: ${score}/100`);
    })
  );

  console.log('Copilot Analytics activated');
}

export function deactivate() {
  telemetryService?.flush();
}
