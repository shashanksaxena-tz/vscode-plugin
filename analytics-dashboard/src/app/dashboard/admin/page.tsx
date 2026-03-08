import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { AuditLogTable } from "@/components/AuditLogTable";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  let auditLogs: AuditLog[] | null = null;
  let error: string | null = null;

  try {
    // Check admin role via public.users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("email", user.email || "")
      .single();

    if (userError) {
      console.error("Error fetching user role:", userError);
      // Fail secure: if we can't verify role, assume not admin
      redirect("/dashboard");
    }

    if (!userData || (userData as { role: string }).role !== "admin") {
      redirect("/dashboard");
    }

    // Fetch audit logs
    const { data: logs, error: logsError } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (logsError) {
      console.error("Error fetching audit logs:", logsError);
      throw logsError;
    }

    auditLogs = logs as AuditLog[] | null;

  } catch (e) {
    // If it was a redirect error (from Next.js), rethrow it
    if ((e as any)?.digest?.startsWith('NEXT_REDIRECT')) {
        throw e;
    }
    console.error("Unexpected error loading admin dashboard:", e);
    error = "Failed to load audit logs. Please try again later.";
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System Audit Logs</p>
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

      <AuditLogTable logs={auditLogs} />
    </div>
  );
}
