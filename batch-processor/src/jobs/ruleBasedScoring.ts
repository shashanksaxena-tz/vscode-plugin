import { createClient } from "../utils/supabase";
import { subDays, startOfWeek } from "date-fns";

export async function ruleBasedScoring() {
  const supabase = createClient();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekAgo = subDays(new Date(), 7);

  console.log("Running rule-based scoring...");

  // Get all users
  const { data: users } = await supabase
    .from("events")
    .select("user_id")
    .gte("timestamp", weekAgo.toISOString());

  if (!users) return;
  const uniqueUsers = [...new Set(users.map((u) => u.user_id))];

  for (const userId of uniqueUsers) {
    // Fetch daily metrics
    const { data: metrics } = await supabase
      .from("daily_metrics")
      .select("*")
      .eq("user_id", userId)
      .gte("date", weekAgo.toISOString().split("T")[0]);

    if (!metrics || metrics.length === 0) continue;

    const effectivenessScore = calculateEffectivenessScore(metrics);
    const efficiencyScore = calculateEfficiencyScore(metrics);

    // Update scores (without overwriting best_practices if possible, or just setting a partial score)
    // Here we just update what we can.
    // Note: This might need a more complex upsert logic to preserve best_practices_score if it exists.

    // Check if score exists
    const { data: existing } = await supabase
        .from("quality_scores")
        .select("best_practices_score")
        .eq("user_id", userId)
        .eq("week_start_date", weekStart.toISOString().split("T")[0])
        .single();

    const bestPracticesScore = existing?.best_practices_score || 50;

    const overallScore = Math.round(
        effectivenessScore * 0.4 + bestPracticesScore * 0.35 + efficiencyScore * 0.25
    );

    await supabase.from("quality_scores").upsert({
      user_id: userId,
      week_start_date: weekStart.toISOString().split("T")[0],
      effectiveness_score: effectivenessScore,
      efficiency_score: efficiencyScore,
      best_practices_score: bestPracticesScore,
      overall_score: overallScore,
    });
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

  return Math.round(Math.min(100, Math.max(0, acceptanceRate * 80 + (1 - retryRate) * 20)));
}

function calculateEfficiencyScore(metrics: any[]): number {
  if (metrics.length === 0) return 50;

  const avgLatency = metrics.reduce((sum, m) => sum + m.avg_response_time_ms, 0) / metrics.length;
  const avgTokens = metrics.reduce((sum, m) => sum + m.total_tokens_used, 0) / metrics.length;

  const latencyScore = Math.max(0, 100 - avgLatency / 100);
  const tokenScore = avgTokens < 10000 ? 100 : Math.max(0, 100 - (avgTokens - 10000) / 1000);

  return Math.round((latencyScore + tokenScore) / 2);
}
