import { createClient } from "./supabase";

export interface AuditLogEntry {
  user_email: string;
  action: string;
  target_resource?: string;
  details?: Record<string, any>;
  ip_address?: string;
}

export async function logAudit(entry: AuditLogEntry) {
  const supabase = createClient();

  try {
    const { error } = await supabase.from("audit_logs").insert({
      user_email: entry.user_email,
      action: entry.action,
      target_resource: entry.target_resource,
      details: entry.details,
      ip_address: entry.ip_address,
    });

    if (error) {
      console.error("Failed to insert audit log:", error);
    }
  } catch (err) {
    console.error("Exception while logging audit:", err);
  }
}
