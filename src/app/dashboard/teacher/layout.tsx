import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role;
  if (role && role !== "teacher") redirect(`/dashboard/${role}`);

  const userName = profile?.full_name || user.user_metadata?.full_name || undefined;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardSidebar role="teacher" userName={userName} />
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
