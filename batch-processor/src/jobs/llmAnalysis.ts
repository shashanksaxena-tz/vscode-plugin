import { createClient } from "../utils/supabase";
import { getLLMProvider } from "../providers/llm";
import { EncryptionService } from "../utils/encryption";
import { logAudit } from "../utils/audit";
import { subDays, startOfWeek } from "date-fns";

const BATCH_SIZE = 50;

export async function llmAnalysis() {
  const supabase = createClient();
  const llm = getLLMProvider();
  const encryption = new EncryptionService();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekAgo = subDays(new Date(), 7);

  // Get all users with events in the past week
  const { data: users } = await supabase
    .from("events")
    .select("user_id")
    .gte("timestamp", weekAgo.toISOString())
    .order("user_id");

  if (!users) return;

  const uniqueUsers = [...new Set(users.map((u) => u.user_id))];

  for (const userId of uniqueUsers) {
    try {
      // Fetch user's events from past week
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", userId)
        .gte("timestamp", weekAgo.toISOString())
        .limit(BATCH_SIZE);

      if (!events || events.length === 0) continue;

      // Prepare anonymized prompt data for LLM
      const promptSamples = events
        .filter((e) => e.prompt_encrypted)
        .slice(0, 20)
        .map((e) => {
          let prompt = "Encrypted Content";
          try {
             if (e.prompt_encrypted) {
                 prompt = encryption.decrypt(e.prompt_encrypted);
             }
          } catch (err) {
              console.error(`Failed to decrypt prompt for event ${e.id}`, err);
          }

          return {
            event_type: e.event_type,
            metadata: e.metadata,
            prompt_content: prompt
          };
        });

      // Fetch daily metrics for rule-based scores
      const { data: metrics } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("user_id", userId)
        .gte("date", weekAgo.toISOString().split("T")[0]);

      // Calculate rule-based scores
      const effectivenessScore = calculateEffectivenessScore(metrics ?? []);
      const efficiencyScore = calculateEfficiencyScore(metrics ?? []);

      // Get LLM analysis for best practices
      const analysis = await llm.analyze(promptSamples);

      const bestPracticesScore = analysis.score;
      const overallScore = Math.round(
        effectivenessScore * 0.4 + bestPracticesScore * 0.35 + efficiencyScore * 0.25
      );

      // Save quality scores
      await supabase.from("quality_scores").upsert({
        user_id: userId,
        week_start_date: weekStart.toISOString().split("T")[0],
        effectiveness_score: effectivenessScore,
        best_practices_score: bestPracticesScore,
        efficiency_score: efficiencyScore,
        overall_score: overallScore,
        insights: analysis.insights,
        suggestions: analysis.suggestions,
      });

      console.log(`Analyzed user ${userId}: score ${overallScore}`);

      await logAudit({
          user_email: userId,
          action: "LLM_ANALYSIS_COMPLETED",
          target_resource: "quality_scores",
          details: {
              week_start_date: weekStart.toISOString().split("T")[0],
              overall_score: overallScore
          }
      });
    } catch (error) {
      console.error(`Failed to analyze user ${userId}:`, error);
    }
  }
}

function calculateEffectivenessScore(metrics: any[]): number {
  if (metrics.length === 0) return 50;

  const totalPrompts = metrics.reduce((sum, m) => sum + m.total_prompts, 0);
  const totalAccepted = metrics.reduce((sum, m) => sum + m.accepted_count, 0);
  const totalRetries = metrics.reduce((sum, m) => sum + m.retry_count, 0);

  if (totalPrompts === 0) return 50;

  const acceptanceRate = totalAccepted / totalPrompts;
  const retryRate = totalRetries / totalPrompts;

  // Score: high acceptance = good, high retry = bad
  return Math.round(Math.min(100, Math.max(0, acceptanceRate * 80 + (1 - retryRate) * 20)));
}

function calculateEfficiencyScore(metrics: any[]): number {
  if (metrics.length === 0) return 50;

  const avgLatency = metrics.reduce((sum, m) => sum + m.avg_response_time_ms, 0) / metrics.length;
  const avgTokens = metrics.reduce((sum, m) => sum + m.total_tokens_used, 0) / metrics.length;

  // Lower latency and reasonable token usage = better score
  const latencyScore = Math.max(0, 100 - avgLatency / 100);
  const tokenScore = avgTokens < 10000 ? 100 : Math.max(0, 100 - (avgTokens - 10000) / 1000);

  return Math.round((latencyScore + tokenScore) / 2);
}
