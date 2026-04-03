import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { CohortTable } from "@/components/CohortTable";

type Cohort = Database["public"]["Tables"]["cohorts"]["Row"];

export default async function CohortsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  let cohorts: Cohort[] | null = null;
  let error: string | null = null;

  try {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("email", user.email || "")
      .single();

    if (userError) {
      console.error("Error fetching user role:", userError);
      redirect("/dashboard");
    }

    const role = (userData as { role: string }).role;
    if (role !== "admin" && role !== "manager") {
      redirect("/dashboard");
    }

    const { data: cohortsData, error: cohortsError } = await supabase
      .from("cohorts")
      .select("*")
      .order("created_at", { ascending: false });

    if (cohortsError) {
      console.error("Error fetching cohorts:", cohortsError);
      throw cohortsError;
    }

    cohorts = cohortsData as Cohort[] | null;

  } catch (e) {
    console.error("Unexpected error loading cohorts:", e);
    // If it was a redirect error (from Next.js), rethrow it
    if ((e as any)?.digest?.startsWith('NEXT_REDIRECT')) {
        throw e;
    }
    error = "Failed to load cohorts. Please try again later.";
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cohort Management</h1>
          <p className="text-gray-600">Track and manage coaching cohorts.</p>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-200">
              {error}
            </div>
          )}
        </div>
        <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Dashboard
        </a>
      </header>

      <CohortTable cohorts={cohorts} />
    </div>
  );
}
