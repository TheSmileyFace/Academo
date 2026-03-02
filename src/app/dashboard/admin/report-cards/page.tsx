import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportCardsClient from "./report-cards-client";

export default async function AdminReportCardsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");
  const schoolId = profile.school_id;

  // Fetch classes with year groups
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, year_groups(name)")
    .eq("school_id", schoolId)
    .order("name");

  // Fetch subjects
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  // Fetch existing report cards
  const { data: reportCards } = await supabase
    .from("report_cards")
    .select("id, student_id, class_id, term, academic_year, overall_grade, published, published_at, created_at, grades, teacher_comment, admin_comment")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch student names for existing report cards
  const studentIds = [...new Set((reportCards || []).map((r) => r.student_id))];
  let studentMap: Record<string, string> = {};
  if (studentIds.length > 0) {
    const { data: students } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    (students || []).forEach((s) => { studentMap[s.id] = s.full_name; });
  }

  const classData = (classes || []).map((c) => ({
    id: c.id,
    name: c.name,
    year_group_name: (c.year_groups as any)?.name || "",
  }));

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Admin</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Report Cards</h1>
      </div>
      <ReportCardsClient
        schoolId={schoolId}
        adminId={user.id}
        classes={classData}
        subjects={subjects || []}
        existingReportCards={(reportCards || []).map((r) => ({
          ...r,
          student_name: studentMap[r.student_id] || "Unknown",
        }))}
      />
    </div>
  );
}
