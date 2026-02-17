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

  if (userError || !userData || ((userData as any).role !== 'manager' && (userData as any).role !== 'admin')) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return supabase;
}

export async function updateCohort(cohortId: string, data: CohortUpdateData) {
  try {
    const supabase = (await checkPermissions()) as any;

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
    const supabase = (await checkPermissions()) as any;

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
    const supabase = (await checkPermissions()) as any;

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

export async function addCohortMember(cohortId: string, userId: string) {
  try {
    const supabase = (await checkPermissions()) as any;

    const { error } = await supabase
      .from("cohort_members")
      .insert({ cohort_id: cohortId, user_id: userId });

    if (error) {
      console.error("Error adding cohort member:", error);
      throw new Error("Failed to add cohort member");
    }

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error("Error in addCohortMember:", error);
    throw error;
  }
}

export async function removeCohortMember(cohortId: string, userId: string) {
  try {
    const supabase = (await checkPermissions()) as any;

    const { error } = await supabase
      .from("cohort_members")
      .delete()
      .eq("cohort_id", cohortId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing cohort member:", error);
      throw new Error("Failed to remove cohort member");
    }

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error("Error in removeCohortMember:", error);
    throw error;
  }
}

export async function getCohortMembers(cohortId: string) {
  try {
    const supabase = (await checkPermissions()) as any;

    // Fetch members joined with user details
    const { data, error } = await supabase
      .from("cohort_members")
      .select(`
        user_id,
        users (
          id,
          name,
          email,
          department,
          role
        )
      `)
      .eq("cohort_id", cohortId);

    if (error) {
      console.error("Error fetching cohort members:", error);
      throw new Error("Failed to fetch cohort members");
    }

    return data.map((item: any) => item.users);
  } catch (error) {
    console.error("Error in getCohortMembers:", error);
    throw error;
  }
}

export async function getAvailableUsers(cohortId: string) {
  try {
    const supabase = (await checkPermissions()) as any;

    // Fetch all users
    const { data: allUsers, error: usersError } = await supabase
      .from("users")
      .select("id, name, email, department, role");

    if (usersError) {
       console.error("Error fetching users:", usersError);
       throw new Error("Failed to fetch users");
    }

    // Fetch current members
    const { data: currentMembers, error: membersError } = await supabase
      .from("cohort_members")
      .select("user_id")
      .eq("cohort_id", cohortId);

    if (membersError) {
        console.error("Error fetching current members:", membersError);
        throw new Error("Failed to fetch current members");
    }

    const memberIds = new Set(currentMembers.map((m: any) => m.user_id));

    // Filter out users who are already members
    return allUsers.filter((u: any) => !memberIds.has(u.id));

  } catch (error) {
    console.error("Error in getAvailableUsers:", error);
    throw error;
  }
}
