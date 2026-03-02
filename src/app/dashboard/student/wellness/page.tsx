import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WellnessClient from "./wellness-client";

export default async function StudentWellnessPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  // Fetch last 30 wellness checks
  const { data: checks } = await supabase
    .from("wellness_checks")
    .select("id, mood, note, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  // Check if already submitted today
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCheck = (checks || []).find((c) =>
    c.created_at.startsWith(todayStr)
  );

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Weekly check-in</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Wellness</h1>
      </div>
      <WellnessClient
        schoolId={profile?.school_id || ""}
        studentId={user.id}
        existingChecks={checks || []}
        alreadySubmittedToday={!!todayCheck}
      />
    </div>
  );
}
