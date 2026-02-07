import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CohortList } from "@/components/CohortList";

export default async function CohortsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check role
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email!)
    .single();

  if (userError || !userData || (userData.role !== 'manager' && userData.role !== 'admin')) {
    redirect("/dashboard");
  }

  // Fetch cohorts
  const { data: cohortsData, error: cohortsError } = await supabase
    .from("cohorts")
    .select("*")
    .order("created_at", { ascending: false });

  if (cohortsError) {
    console.error("Error fetching cohorts:", cohortsError);
    return <div className="p-8 text-red-600">Error loading cohorts.</div>;
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cohort Management</h1>
        <p className="text-gray-600">Create and manage cohorts.</p>
      </header>

      <CohortList cohorts={cohortsData || []} />
    </div>
  );
}
