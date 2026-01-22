import { ScoreCard } from "@/components/ScoreCard";
import { MetricsChart } from "@/components/MetricsChart";
import { SuggestionsList } from "@/components/SuggestionsList";
import { CoachingPlanCard } from "@/components/CoachingPlanCard";

export default function MockDashboardPage() {
  const latestScore = {
    overall_score: 85,
    effectiveness_score: 80,
    best_practices_score: 90,
    efficiency_score: 85,
    suggestions: ["Use more keyboard shortcuts", "Optimize imports"]
  };

  const scoreHistory = [
    { week_start_date: "2024-01-01", overall_score: 70 },
    { week_start_date: "2024-01-08", overall_score: 75 },
    { week_start_date: "2024-01-15", overall_score: 85 }
  ];

  const dailyMetrics = [
    { date: "2024-01-20", total_prompts: 10 },
    { date: "2024-01-21", total_prompts: 15 },
    { date: "2024-01-22", total_prompts: 12 }
  ];

  const userCohorts = [
    { name: "Senior Devs", description: "Senior Developers Cohort", coaching_plan: "Focus on architecture" },
    { name: "Python Experts", description: "Python Focus", coaching_plan: "Advanced Python patterns" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Copilot Analytics (Mock)</h1>
        <p className="text-gray-600">Welcome back, mock@example.com</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ScoreCard
          title="Overall Score"
          score={latestScore.overall_score}
          maxScore={100}
          color="blue"
        />
        <ScoreCard
          title="Effectiveness"
          score={latestScore.effectiveness_score}
          maxScore={100}
          color="green"
        />
        <ScoreCard
          title="Best Practices"
          score={latestScore.best_practices_score}
          maxScore={100}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Score Trend</h2>
          <MetricsChart
            data={scoreHistory}
            dataKey="overall_score"
            xAxisKey="week_start_date"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Activity</h2>
          <MetricsChart
            data={dailyMetrics}
            dataKey="total_prompts"
            xAxisKey="date"
          />
        </div>
      </div>

      <CoachingPlanCard cohorts={userCohorts} />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Improvement Suggestions</h2>
        <SuggestionsList suggestions={latestScore.suggestions} />
      </div>
    </div>
  );
}
