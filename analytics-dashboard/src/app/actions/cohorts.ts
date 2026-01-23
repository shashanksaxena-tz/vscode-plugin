'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CohortUpdateData {
  name?: string;
  description?: string;
  coaching_plan?: string;
}

export async function updateCohort(cohortId: string, data: CohortUpdateData) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Check role
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email!)
    .single();

  if (userError || !userData || (userData.role !== 'manager' && userData.role !== 'admin')) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  // Update cohort
  const { error } = await supabase
    .from("cohorts")
    .update(data)
    .eq("id", cohortId);

  if (error) {
    console.error("Error updating cohort:", error);
    throw new Error("Failed to update cohort");
  }

  revalidatePath('/dashboard/team');
  return { success: true };
}
