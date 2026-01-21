import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { AuditLogTable } from "@/components/AuditLogTable";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Check admin role via public.users
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email || "")
    .single();

  if (userError || !userData || (userData as { role: string }).role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch audit logs
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const auditLogs = logs as AuditLog[] | null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System Audit Logs</p>
        </div>
        <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Dashboard
        </a>
      </header>

      <AuditLogTable logs={auditLogs} />
    </div>
  );
}
