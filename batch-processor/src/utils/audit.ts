import { createClient } from "./supabase";

export async function logAudit(
  action: string,
  targetResource: string,
  targetId: string | null,
  details: Record<string, any> = {}
) {
  const supabase = createClient();

  try {
    const { error } = await supabase.from("audit_logs").insert({
      // user_id is null for system actions (batch processor), or we could create a system user
      action,
      target_resource: targetResource,
      target_id: targetId,
      details,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (err) {
    console.error("Exception writing audit log:", err);
  }
}
