import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamTable, TeamMember } from "@/components/TeamTable";

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

  if ((currentUserData as any).role !== 'manager' && (currentUserData as any).role !== 'admin') {
    redirect("/dashboard");
  }

  let teamMembers: TeamMember[] = [];
  let error: string | null = null;

  try {
    let query = supabase.from("users").select("*");

    if ((currentUserData as any).role === 'manager') {
      if ((currentUserData as any).department) {
        query = query.eq("department", (currentUserData as any).department);
      } else {
        // If manager has no department, show users with no department?
        // Or show all? Let's assume users with no department.
        query = query.is("department", null);
      }
    }
    // Admin sees all, so no filter added.

    const { data: usersData, error: usersFetchError } = await query;

    if (usersFetchError) throw usersFetchError;

    if (usersData && usersData.length > 0) {
      const userEmails = usersData.map((u: any) => u.email);
      const userIds = usersData.map((u: any) => u.id);

      // Fetch scores for these users (scores use email as user_id)
      const { data: scoresData, error: scoresError } = await supabase
        .from("quality_scores")
        .select("*")
        .in("user_id", userEmails)
        .order("week_start_date", { ascending: false });

      if (scoresError) throw scoresError;

      // Fetch cohort memberships (cohort_members use UUID as user_id)
      const { data: cohortMembersData, error: cohortMembersError } = await supabase
        .from("cohort_members")
        .select("user_id, cohort_id")
        .in("user_id", userIds);

      if (cohortMembersError) throw cohortMembersError;

      // Fetch cohorts details
      let cohortsData: { id: string; name: string; coaching_plan: string | null; description: string | null; criteria: any }[] = [];
      if (cohortMembersData && cohortMembersData.length > 0) {
        const cohortIds = Array.from(new Set(cohortMembersData.map((cm: any) => cm.cohort_id)));
        const { data: cohorts, error: cohortsError } = await supabase
          .from("cohorts")
          .select("id, name, coaching_plan, description, criteria")
          .in("id", cohortIds);

        if (cohortsError) throw cohortsError;
        cohortsData = cohorts || [];
      }

      // Map scores and cohorts to users
      teamMembers = usersData.map((member: any) => {
        const memberScores = scoresData?.filter((s: any) => s.user_id === member.email) || [];
        // Since we ordered by date desc, the first one is the latest
        const latestScore = memberScores.length > 0 ? memberScores[0] : null;

        const memberCohortIds = cohortMembersData
            ?.filter((cm: any) => cm.user_id === member.id)
            .map((cm: any) => cm.cohort_id) || [];

        const memberCohorts = cohortsData
            .filter(c => memberCohortIds.includes(c.id))
            .map(c => ({
              id: c.id,
              name: c.name,
              coaching_plan: c.coaching_plan,
              description: c.description,
              criteria: c.criteria
            }));

        return {
          ...member,
          latest_score: latestScore,
          cohorts: memberCohorts
        };
      });
    }
  } catch (e) {
    console.error("Error loading team data:", e);
    error = "Failed to load team data.";
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Analytics</h1>
        <p className="text-gray-600">
          {(currentUserData as any).role === 'admin'
            ? 'All Users'
            : `Department: ${(currentUserData as any).department || 'Unassigned'}`}
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
