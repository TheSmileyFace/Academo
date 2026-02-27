import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { AiFloatingBall } from "@/components/ai-floating-ball";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role;
  if (role && role !== "student") redirect(`/dashboard/${role}`);

  const userName = profile?.full_name || user.user_metadata?.full_name || undefined;

  return (
    <div className="h-screen overflow-hidden noise-bg flex p-2 pl-0">
      <DashboardSidebar role="student" userName={userName} />
      <main className="flex-1 bg-white rounded-2xl overflow-hidden relative z-[1]">
        <div className="h-full overflow-auto px-6 py-5">{children}</div>
        <AiFloatingBall />
      </main>
    </div>
  );
}
