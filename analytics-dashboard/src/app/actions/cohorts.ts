'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CohortUpdateData {
  name?: string;
  description?: string;
  coaching_plan?: string;
}

interface CohortCreateData {
  name: string;
  description?: string;
  coaching_plan?: string;
  criteria?: any;
}

async function checkPermissions() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email!)
    .single();

  if (userError || !userData || (userData.role !== 'manager' && userData.role !== 'admin')) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return supabase;
}

export async function updateCohort(cohortId: string, data: CohortUpdateData) {
  try {
    const supabase = await checkPermissions();

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
  } catch (error) {
    console.error("Error in updateCohort:", error);
    throw error;
  }
}

export async function createCohort(data: CohortCreateData) {
  try {
    const supabase = await checkPermissions();

    const { error } = await supabase
      .from("cohorts")
      .insert(data);

    if (error) {
      console.error("Error creating cohort:", error);
      throw new Error("Failed to create cohort");
    }

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error("Error in createCohort:", error);
    throw error;
  }
}

export async function deleteCohort(cohortId: string) {
  try {
    const supabase = await checkPermissions();

    const { error } = await supabase
      .from("cohorts")
      .delete()
      .eq("id", cohortId);

    if (error) {
      console.error("Error deleting cohort:", error);
      throw new Error("Failed to delete cohort");
    }

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error("Error in deleteCohort:", error);
    throw error;
  }
}
