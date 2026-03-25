import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MetricsChart } from "@/components/MetricsChart";
import { SuggestionsList } from "@/components/SuggestionsList";
import { InsightsList } from "@/components/InsightsList";
import Link from "next/link";

export default async function TeamMemberDashboardPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // 2. Fetch current user (manager/admin) details
  const { data: currentUserData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", user.email!)
    .single();

  if (userError || !currentUserData) {
    return <div className="p-8 text-red-600">Error loading user profile.</div>;
  }

  if ((currentUserData as any).role !== 'manager' && (currentUserData as any).role !== 'admin') {
    redirect("/dashboard");
  }

  // 3. Fetch team member details using the provided ID
  const memberId = params.id;
  const { data: memberData, error: memberError } = await supabase
    .from("users")
    .select("*")
    .eq("id", memberId)
    .single();

  if (memberError || !memberData) {
    return <div className="p-8 text-red-600">Error loading team member details.</div>;
  }

  // Verify manager can only view their own department (unless admin)
  if ((currentUserData as any).role === 'manager' && (memberData as any).department !== (currentUserData as any).department) {
    return <div className="p-8 text-red-600">Unauthorized: You can only view members in your department.</div>;
  }

  // 4. Fetch the member's metrics using their email (quality_scores uses user_id = email for now)
  const memberEmail = (memberData as any).email;

  const { data: scoresData, error: scoresError } = await supabase
    .from("quality_scores")
    .select("*")
    .eq("user_id", memberEmail)
    .order("week_start_date", { ascending: false });

  if (scoresError) {
    return <div className="p-8 text-red-600">Error loading team member metrics.</div>;
  }

  const scores = scoresData || [];
  const latestScore = scores.length > 0 ? scores[0] : null;

  // Chart Data Formatting
  const chartData = [...scores].reverse().map(score => ({
    week: new Date(score.week_start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overall: score.overall_score,
    effectiveness: score.effectiveness_score,
    efficiency: score.efficiency_score
  }));

  // Render drill-down view
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/dashboard/team" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              &larr; Back to Team
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            {(memberData as any).name || (memberData as any).email}
          </h1>
          <p className="text-gray-600">
            {(memberData as any).email} | {(memberData as any).department || "No Department"} | Role: {(memberData as any).role}
          </p>
        </div>
      </header>

      {latestScore ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Overall Score</h3>
              <div className="text-3xl font-bold text-gray-900">{latestScore.overall_score}/100</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Effectiveness</h3>
              <div className="text-3xl font-bold text-green-600">{latestScore.effectiveness_score}/100</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Efficiency</h3>
              <div className="text-3xl font-bold text-blue-600">{latestScore.efficiency_score}/100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-6">Historical Performance</h2>
              <div className="h-80 w-full">
                <MetricsChart data={chartData} dataKey="overall" xAxisKey="week" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow overflow-y-auto max-h-[420px]">
              <h2 className="text-xl font-semibold mb-6">Latest Insights</h2>
              {latestScore.insights ? (
                <InsightsList insights={latestScore.insights as any} />
              ) : (
                <p className="text-gray-500 italic">No specific insights generated for this period.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow overflow-y-auto max-h-[420px]">
            <h2 className="text-xl font-semibold mb-6">Coaching Suggestions</h2>
            {latestScore.suggestions ? (
              <SuggestionsList suggestions={latestScore.suggestions as any} />
            ) : (
              <p className="text-gray-500 italic">No specific coaching suggestions generated for this period.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          No quality scores available for this team member yet.
        </div>
      )}
    </div>
  );
}
