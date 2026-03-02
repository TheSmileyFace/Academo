import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GradesClient from "./grades-client";

export default async function StudentGrades() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all graded submissions for this student
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, grade, feedback, submitted_at, assignment_id")
    .eq("student_id", user.id)
    .eq("status", "graded")
    .order("submitted_at", { ascending: false });

  const gradedSubmissions = (submissions || []).filter(s => s.grade != null);

  // Fetch assignment details for graded submissions
  const assignmentIds = [...new Set(gradedSubmissions.map((s) => s.assignment_id))];
  let assignmentMap: Record<string, { title: string; subject: string }> = {};
  if (assignmentIds.length > 0) {
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, title, subject")
      .in("id", assignmentIds);
    (assignments || []).forEach((a) => {
      assignmentMap[a.id] = { title: a.title, subject: a.subject };
    });
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2">
        <h1 className="text-[22px] font-bold text-[#2D2D2D]">Grades & Progress</h1>
        <p className="text-[12px] text-[#9A9A9A] mt-0.5">Track your academic performance</p>
      </div>
      <GradesClient gradedSubmissions={gradedSubmissions} assignmentMap={assignmentMap} />
    </div>
  );
}
