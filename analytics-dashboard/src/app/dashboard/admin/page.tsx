import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";

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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditLogs?.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.user_email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.target_resource || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {JSON.stringify(log.details)}
                </td>
              </tr>
            ))}
            {(!auditLogs || auditLogs.length === 0) && (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No audit logs found.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
