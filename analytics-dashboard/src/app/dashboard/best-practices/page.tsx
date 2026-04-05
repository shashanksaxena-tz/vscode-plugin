import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SuggestionsList } from "@/components/SuggestionsList";

export default async function BestPracticesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch top quality scores to use as best practice examples
  // We look for overall_score >= 80 to ensure they represent high quality
  const { data: topScores, error } = await supabase
    .from("quality_scores")
    .select("overall_score, insights, suggestions, week_start_date")
    .gte("overall_score", 80)
    .order("overall_score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching top scores:", error);
  }

  // Combine and deduplicate insights and suggestions
  const allInsights: string[] = [];
  const allSuggestions: string[] = [];

  if (topScores) {
    topScores.forEach(score => {
      const insights = score.insights as string[] || [];
      const suggestions = score.suggestions as string[] || [];

      insights.forEach(insight => {
        if (!allInsights.includes(insight)) {
          allInsights.push(insight);
        }
      });

      suggestions.forEach(suggestion => {
        if (!allSuggestions.includes(suggestion)) {
          allSuggestions.push(suggestion);
        }
      });
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Best Practice Library
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Anonymized insights and actionable suggestions from top-performing developers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Top Insights
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Patterns identified from highly effective AI interactions.
            </p>
          </div>
          <div className="p-6">
            {allInsights.length > 0 ? (
              <SuggestionsList suggestions={allInsights} />
            ) : (
              <p className="text-gray-500">No top insights available yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Actionable Suggestions
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Recommended practices based on successful usage.
            </p>
          </div>
          <div className="p-6">
            {allSuggestions.length > 0 ? (
              <SuggestionsList suggestions={allSuggestions} />
            ) : (
              <p className="text-gray-500">No top suggestions available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
