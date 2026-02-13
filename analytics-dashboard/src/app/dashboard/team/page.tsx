import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamTable, TeamMember } from "@/components/TeamTable";
import { CohortList } from "@/components/CohortList";
import { Database } from "@/types/database";

export default async function TeamDashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Fetch current user details to check role and department
  const { data: currentUserData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", user.email!)
    .single();

  if (userError || !currentUserData) {
    console.error("Error fetching user data:", userError);
    return <div className="p-8 text-red-600">Error loading user profile. Please contact support.</div>;
  }

  const userRole = (currentUserData as any).role;
  const userDepartment = (currentUserData as any).department;

  if (userRole !== 'manager' && userRole !== 'admin') {
    redirect("/dashboard");
  }

  let teamMembers: TeamMember[] = [];
  let cohorts: Database["public"]["Tables"]["cohorts"]["Row"][] = [];
  let error: string | null = null;

  try {
    // Fetch cohorts
    const { data: cohortsData, error: cohortsError } = await supabase
      .from("cohorts")
      .select("*")
      .order("member_count", { ascending: false });

    if (cohortsError) console.error("Error fetching cohorts:", cohortsError);
    else cohorts = cohortsData || [];

    let query = supabase.from("users").select("*");

    if (userRole === 'manager') {
      if (userDepartment) {
        query = query.eq("department", userDepartment);
      } else {
        // If manager has no department, show users with no department?
        // Or show all? Let's assume users with no department.
        query = query.is("department", null);
      }
    }
    // Admin sees all, so no filter added.

    const { data: usersData, error: usersFetchError } = await query;

    if (usersFetchError) throw usersFetchError;

    const users = usersData as unknown as Database["public"]["Tables"]["users"]["Row"][] | null;

    if (users && users.length > 0) {
      const userEmails = users.map(u => u.email);

      // Fetch scores for these users
      const { data: scoresData, error: scoresError } = await supabase
        .from("quality_scores")
        .select("*")
        .in("user_id", userEmails)
        .order("week_start_date", { ascending: false });

      if (scoresError) throw scoresError;

      const scores = scoresData as Database["public"]["Tables"]["quality_scores"]["Row"][] | null;

      // Map scores to users
      teamMembers = users.map(member => {
        const memberScores = scores?.filter(s => s.user_id === member.email) || [];
        // Since we ordered by date desc, the first one is the latest
        const latestScore = memberScores.length > 0 ? memberScores[0] : null;
        return {
          ...member,
          latest_score: latestScore
        };
      });
    }
  } catch (e) {
    console.error("Error loading team data:", e);
    error = "Failed to load team data.";
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Analytics</h1>
        <p className="text-gray-600">
        {userRole === 'admin'
            ? 'All Users'
            : `Department: ${userDepartment || 'Unassigned'}`}
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        )}
      </header>

      <TeamTable members={teamMembers} />
      <CohortList cohorts={cohorts} />
    </div>
  );
}
