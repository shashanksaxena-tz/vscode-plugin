"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSystemSetting(key: string, value: any) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email!)
    .single<{ role: string }>();

  if (userData?.role !== "admin") {
    return { error: "Forbidden" };
  }

  const { error } = await supabase
    .from("system_settings")
    .upsert({
      key,
      value: value as unknown as any,
      updated_at: new Date().toISOString()
    } as any);

  if (error) {
    console.error("Failed to update system setting:", error);
    return { error: error.message };
  }

  // Log action
  await supabase.from("audit_logs").insert({
    user_email: user.email!,
    action: "UPDATE_SYSTEM_SETTING",
    target_resource: "system_settings",
    details: { key, new_value: value },
  } as any);

  revalidatePath("/dashboard/admin");
  return { success: true };
}
