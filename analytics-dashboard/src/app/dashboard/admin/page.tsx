import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { AuditLogTable } from "@/components/AuditLogTable";
import { SystemConfigurationForm } from "@/components/SystemConfigurationForm";

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
    error = "Failed to load admin dashboard data. Please try again later.";
  }

  // Fetch System Overview Metrics
  let totalUsers = 0;
  let activeUsers = 0;
  let totalCohorts = 0;
  let activeLlmProvider = "anthropic"; // default fallback

  try {
    const [{ count: usersCount }, { count: cohortsCount }, { data: settingsData }] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("cohorts").select("*", { count: "exact", head: true }),
      supabase.from("system_settings").select("value").eq("key", "LLM_PROVIDER").single<{ value: string }>()
    ]);

    totalUsers = usersCount || 0;
    totalCohorts = cohortsCount || 0;

    if (settingsData?.value) {
      activeLlmProvider = String(settingsData.value);
    } else {
      activeLlmProvider = process.env.NEXT_PUBLIC_LLM_PROVIDER || "anthropic";
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Active users: count distinct users who had an event in the last 7 days
    const { data: recentEvents } = await supabase
      .from("events")
      .select("user_id")
      .gte("timestamp", sevenDaysAgo.toISOString())
      .returns<{ user_id: string }[]>();

    if (recentEvents) {
      const uniqueActiveUsers = new Set(recentEvents.map(e => e.user_id));
      activeUsers = uniqueActiveUsers.size;
    }
  } catch (e) {
    console.error("Error fetching system overview metrics:", e);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Total Users</h3>
          <p className="mt-2 text-4xl font-bold text-gray-900">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Active Users (7d)</h3>
          <p className="mt-2 text-4xl font-bold text-gray-900">{activeUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Total Cohorts</h3>
          <p className="mt-2 text-4xl font-bold text-gray-900">{totalCohorts}</p>
        </div>
      </div>

      <SystemConfigurationForm initialProvider={activeLlmProvider} />

      <AuditLogTable logs={auditLogs} />
    </div>
  );
}
