import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch role
  const { data: userData, error } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email!)
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
  }

  const role = (userData as any)?.role || 'developer';

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav userRole={role} />
      <main>
        {children}
      </main>
    </div>
  );
}
