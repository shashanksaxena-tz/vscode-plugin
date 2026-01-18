import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScoreCard } from "@/components/ScoreCard";
import { MetricsChart } from "@/components/MetricsChart";
import { SuggestionsList } from "@/components/SuggestionsList";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch latest quality score
  const { data: latestScoreData } = await supabase
    .from("quality_scores")
    .select("*")
    .eq("user_id", user.email!) // Assuming user.email is available
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single();

  const latestScore = latestScoreData as any;

  // Fetch score history (8 weeks)
  const { data: scoreHistoryData } = await supabase
    .from("quality_scores")
    .select("week_start_date, overall_score, effectiveness_score, best_practices_score, efficiency_score")
    .eq("user_id", user.email!)
    .order("week_start_date", { ascending: false })
    .limit(8);

  const scoreHistory = scoreHistoryData as any[];

  // Fetch daily metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: dailyMetricsData } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("user_id", user.email!)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  const dailyMetrics = dailyMetricsData as any[];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Copilot Analytics</h1>
        <p className="text-gray-600">Welcome back, {user.email}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ScoreCard
          title="Overall Score"
          score={latestScore?.overall_score ?? 0}
          maxScore={100}
          color="blue"
        />
        <ScoreCard
          title="Effectiveness"
          score={latestScore?.effectiveness_score ?? 0}
          maxScore={100}
          color="green"
        />
        <ScoreCard
          title="Best Practices"
          score={latestScore?.best_practices_score ?? 0}
          maxScore={100}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Score Trend</h2>
          <MetricsChart
            data={scoreHistory?.reverse() ?? []}
            dataKey="overall_score"
            xAxisKey="week_start_date"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Activity</h2>
          <MetricsChart
            data={dailyMetrics ?? []}
            dataKey="total_prompts"
            xAxisKey="date"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Improvement Suggestions</h2>
        <SuggestionsList suggestions={latestScore?.suggestions as string[] ?? []} />
      </div>
    </div>
  );
}
