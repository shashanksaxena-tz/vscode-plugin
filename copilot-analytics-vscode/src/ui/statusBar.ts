import * as vscode from 'vscode';
import { TelemetryService } from '../services/telemetry';
import { SupabaseService } from '../services/supabase';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private acceptanceRate: number = 0;
  private totalPrompts: number = 0;
  private acceptedPrompts: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(
    private telemetryService: TelemetryService | null,
    private supabaseService: SupabaseService | null
  ) {
    // Create status bar item on the right side
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'copilot-analytics.showScore';
    this.update();
    this.statusBarItem.show();

    // Update every 30 seconds
    this.updateInterval = setInterval(() => this.update(), 30000);
  }

  /**
   * Record a completion event and update the status bar
   */
  recordCompletion(accepted: boolean) {
    this.totalPrompts++;
    if (accepted) {
      this.acceptedPrompts++;
    }
    this.acceptanceRate = this.totalPrompts > 0
      ? Math.round((this.acceptedPrompts / this.totalPrompts) * 100)
      : 0;
    this.updateDisplay();
  }

  /**
   * Update status bar with current session stats
   */
  private update() {
    this.updateDisplay();

    // Optionally fetch score from Supabase periodically
    if (this.supabaseService) {
      this.fetchLatestScore();
    }
  }

  private async fetchLatestScore() {
    try {
      const score = await this.supabaseService?.getMyScore();
      if (score !== undefined && score > 0) {
        this.statusBarItem.tooltip = `Weekly Score: ${score}/100\nSession: ${this.acceptanceRate}% acceptance (${this.acceptedPrompts}/${this.totalPrompts})`;
      }
    } catch (error) {
      // Silently fail - don't interrupt user
      console.error('Failed to fetch score for status bar:', error);
    }
  }

  private updateDisplay() {
    const icon = this.getIcon();
    this.statusBarItem.text = `${icon} ${this.acceptanceRate}%`;
    this.statusBarItem.tooltip = `Copilot Acceptance Rate: ${this.acceptanceRate}%\nPrompts: ${this.acceptedPrompts}/${this.totalPrompts}\nClick to view full score`;

    // Change color based on acceptance rate
    if (this.acceptanceRate >= 70) {
      this.statusBarItem.backgroundColor = undefined;
    } else if (this.acceptanceRate >= 40) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else if (this.totalPrompts > 5) {
      // Only show warning if there are enough prompts to be meaningful
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
  }

  private getIcon(): string {
    if (this.totalPrompts === 0) {
      return '$(copilot)';
    }
    if (this.acceptanceRate >= 70) {
      return '$(check)';
    } else if (this.acceptanceRate >= 40) {
      return '$(warning)';
    }
    return '$(x)';
  }

  /**
   * Reset session statistics
   */
  resetSession() {
    this.totalPrompts = 0;
    this.acceptedPrompts = 0;
    this.acceptanceRate = 0;
    this.updateDisplay();
  }

  dispose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.statusBarItem.dispose();
  }
}
