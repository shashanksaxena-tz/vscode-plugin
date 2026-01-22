import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScoreCard } from "@/components/ScoreCard";
import { MetricsChart } from "@/components/MetricsChart";
import { SuggestionsList } from "@/components/SuggestionsList";
import { CoachingPlanCard } from "@/components/CoachingPlanCard";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  let latestScore: any = null;
  let scoreHistory: any[] = [];
  let dailyMetrics: any[] = [];
  let userCohorts: any[] = [];
  let error: string | null = null;

  try {
    // Fetch latest quality score
    const { data: latestScoreData, error: scoreError } = await supabase
      .from("quality_scores")
      .select("*")
      .eq("user_id", user.email!)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .single();

    if (scoreError && scoreError.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
       console.error("Error fetching latest score:", scoreError);
    }
    latestScore = latestScoreData;

    // Fetch score history (8 weeks)
    const { data: historyData, error: historyError } = await supabase
      .from("quality_scores")
      .select("week_start_date, overall_score, effectiveness_score, best_practices_score, efficiency_score")
      .eq("user_id", user.email!)
      .order("week_start_date", { ascending: false })
      .limit(8);

    if (historyError) console.error("Error fetching history:", historyError);
    scoreHistory = historyData || [];

    // Fetch daily metrics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: metricsData, error: metricsError } = await supabase
      .from("daily_metrics")
      .select("*")
      .eq("user_id", user.email!)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (metricsError) console.error("Error fetching metrics:", metricsError);
    dailyMetrics = metricsData || [];

    // Fetch user cohorts
    const { data: cohortMembersData, error: cohortError } = await supabase
      .from("cohort_members")
      .select("cohort_id")
      .eq("user_id", user.email!);

    if (cohortError) console.error("Error fetching cohorts:", cohortError);

    if (cohortMembersData && cohortMembersData.length > 0) {
      const cohortIds = cohortMembersData.map(c => c.cohort_id);

      const { data: cohortsData, error: cohortsFetchError } = await supabase
        .from("cohorts")
        .select("name, description, coaching_plan")
        .in("id", cohortIds);

      if (cohortsFetchError) console.error("Error fetching cohort details:", cohortsFetchError);

      userCohorts = cohortsData || [];
    }

  } catch (e) {
    console.error("Unexpected error loading dashboard data:", e);
    error = "Failed to load dashboard data. Please try again later.";
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Copilot Analytics</h1>
        <p className="text-gray-600">Welcome back, {user.email}</p>
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ScoreCard
          title="Overall Score"
          score={latestScore ? (latestScore.overall_score ?? 0) : 0}
          maxScore={100}
          color="blue"
        />
        <ScoreCard
          title="Effectiveness"
          score={latestScore ? (latestScore.effectiveness_score ?? 0) : 0}
          maxScore={100}
          color="green"
        />
        <ScoreCard
          title="Best Practices"
          score={latestScore ? (latestScore.best_practices_score ?? 0) : 0}
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

      <CoachingPlanCard cohorts={userCohorts} />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Improvement Suggestions</h2>
        <SuggestionsList suggestions={latestScore?.suggestions as string[] ?? []} />
      </div>
    </div>
  );
}
