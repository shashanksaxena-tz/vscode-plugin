import { ScoreCard } from "@/components/ScoreCard";
import { MetricsChart } from "@/components/MetricsChart";
import { SuggestionsList } from "@/components/SuggestionsList";
import { InsightsList } from "@/components/InsightsList";

export default function VerifyDashboardPage() {
  const user = { email: "test-user@example.com" };
  const latestScore = {
    overall_score: 85,
    effectiveness_score: 90,
    best_practices_score: 80,
    suggestions: [
      "Try to include more context files in your prompts.",
      "Break down complex tasks into smaller prompts."
    ],
    insights: [
      "You frequently ask for code generation without providing the necessary context.",
      "Your prompt acceptance rate is high, indicating effective use of the AI."
    ]
  };
  const scoreHistory = [
    { week_start_date: "2023-10-01", overall_score: 80 },
    { week_start_date: "2023-10-08", overall_score: 82 },
    { week_start_date: "2023-10-15", overall_score: 85 },
  ];
  const dailyMetrics = [
    { date: "2023-10-15", total_prompts: 10 },
    { date: "2023-10-16", total_prompts: 15 },
    { date: "2023-10-17", total_prompts: 12 },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Copilot Analytics</h1>
            <p className="text-gray-600">Welcome back, {user.email}</p>
          </div>
          <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium flex items-center shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            AI Engine: gemini
          </div>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Improvement Suggestions</h2>
          <SuggestionsList suggestions={latestScore.suggestions} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Code Insights</h2>
          <InsightsList insights={latestScore.insights} />
        </div>
      </div>
    </div>
  );
}
