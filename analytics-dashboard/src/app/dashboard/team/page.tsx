import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamTable, TeamMember } from "@/components/TeamTable";
import { Database } from "@/types/database";

type UserRow = Database['public']['Tables']['users']['Row'];
type QualityScoreRow = Database['public']['Tables']['quality_scores']['Row'];

export default async function TeamDashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Fetch current user details to check role and department
  const { data: currentUserDataResponse, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", user.email!)
    .single();

  const currentUserData = currentUserDataResponse as UserRow | null;

  if (userError || !currentUserData) {
    console.error("Error fetching user data:", userError);
    return <div className="p-8 text-red-600">Error loading user profile. Please contact support.</div>;
  }

  const userRole = currentUserData.role;

  if (userRole !== 'manager' && userRole !== 'admin') {
    redirect("/dashboard");
  }

  let teamMembers: TeamMember[] = [];
  let error: string | null = null;

  try {
    let query = supabase.from("users").select("*");

    if (userRole === 'manager') {
      const userDepartment = currentUserData.department;
      if (userDepartment) {
        query = query.eq("department", userDepartment);
      } else {
        // If manager has no department, show users with no department?
        // Or show all? Let's assume users with no department.
        query = query.is("department", null);
      }
    }
    // Admin sees all, so no filter added.

    const { data: usersDataResponse, error: usersFetchError } = await query;
    const usersData = usersDataResponse as UserRow[] | null;

    if (usersFetchError) throw usersFetchError;

    if (usersData && usersData.length > 0) {
      const userEmails = usersData.map(u => u.email);

      // Fetch scores for these users
      const { data: scoresDataResponse, error: scoresError } = await supabase
        .from("quality_scores")
        .select("*")
        .in("user_id", userEmails)
        .order("week_start_date", { ascending: false });

      const scoresData = scoresDataResponse as QualityScoreRow[] | null;

      if (scoresError) throw scoresError;

      // Fetch cohort memberships
      const { data: cohortData, error: cohortError } = await supabase
        .from("cohort_members")
        .select("user_id, cohorts(name)")
        .in("user_id", userEmails);

      if (cohortError) console.error("Error fetching cohorts:", cohortError);

      // Map scores and cohorts to users
      teamMembers = usersData.map(member => {
        const memberScores = scoresData?.filter(s => s.user_id === member.email) || [];
        // Since we ordered by date desc, the first one is the latest
        const latestScore = memberScores.length > 0 ? memberScores[0] : null;

        const memberCohorts = cohortData
          ?.filter(c => c.user_id === member.email)
          .map(c => (c.cohorts as any)?.name)
          .filter(Boolean) || [];

        return {
          ...member,
          latest_score: latestScore,
          cohort_names: memberCohorts
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
          {currentUserData.role === 'admin'
            ? 'All Users'
            : `Department: ${currentUserData.department || 'Unassigned'}`}
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        )}
      </header>

      <TeamTable members={teamMembers} />
    </div>
  );
}
