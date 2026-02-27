import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, BarChart3 } from "lucide-react";
import Image from "next/image";

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

  const gradedSubmissions = submissions || [];

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

  // Group grades by subject for averages
  const subjectGrades: Record<string, number[]> = {};
  gradedSubmissions.forEach((s) => {
    const assignment = assignmentMap[s.assignment_id];
    if (assignment?.subject && s.grade != null) {
      if (!subjectGrades[assignment.subject]) subjectGrades[assignment.subject] = [];
      subjectGrades[assignment.subject].push(s.grade);
    }
  });

  const subjectAverages = Object.entries(subjectGrades).map(([subject, grades]) => ({
    subject,
    average: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
    count: grades.length,
  })).sort((a, b) => b.average - a.average);

  const overallAvg = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.filter(s => s.grade != null).reduce((a, s) => a + (s.grade || 0), 0) / gradedSubmissions.filter(s => s.grade != null).length)
    : null;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2">
        <h1 className="text-[22px] font-bold text-black">Grades & Progress</h1>
        <p className="text-[12px] text-[#9A9A9A] mt-0.5">
          {overallAvg !== null ? `Overall average: ${overallAvg}%` : "Track your academic performance"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 flex-1 min-h-0">
        {/* Subject Performance */}
        <div className="dash-card rounded-2xl flex flex-col">
          <div className="flex items-center gap-0 px-4 pt-3 pb-2">
            <Image src="/Icons/black/grades black.svg" alt="" width={24} height={24} className="shrink-0" />
            <div className="w-px h-4 bg-gray-300 mx-2.5" />
            <span className="text-[16px] font-semibold text-black">Subject Averages</span>
          </div>
          <div className="h-px bg-black/10" />
          <div className="flex-1 px-4 py-3">
            {subjectAverages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-6 w-6 text-[#9A9A9A]/30 mb-2" />
                <p className="text-[13px] font-semibold text-[#9A9A9A]">No grades yet</p>
                <p className="text-[10px] text-[#9A9A9A]/60 mt-1">Subject averages will appear once assignments are graded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subjectAverages.map((s) => (
                  <div key={s.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-black">{s.subject}</span>
                      <span className={`text-[14px] font-bold ${s.average >= 70 ? "text-green-600" : s.average >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {s.average}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${s.average >= 70 ? "bg-green-500" : s.average >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${s.average}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-[#9A9A9A]">{s.count} graded assignment{s.count !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Grades */}
        <div className="dash-card rounded-2xl flex flex-col">
          <div className="flex items-center gap-0 px-4 pt-3 pb-2">
            <Trophy className="h-5 w-5 text-black shrink-0" />
            <div className="w-px h-4 bg-gray-300 mx-2.5" />
            <span className="text-[16px] font-semibold text-black">Recent Grades</span>
          </div>
          <div className="h-px bg-black/10" />
          <div className="flex-1 px-4 py-3">
            {gradedSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="h-6 w-6 text-[#9A9A9A]/30 mb-2" />
                <p className="text-[13px] font-semibold text-[#9A9A9A]">No graded work yet</p>
                <p className="text-[10px] text-[#9A9A9A]/60 mt-1">Your grades and feedback will show up here</p>
              </div>
            ) : (
              <div className="space-y-0">
                {gradedSubmissions.slice(0, 10).map((s, idx) => {
                  const assignment = assignmentMap[s.assignment_id];
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-semibold text-black truncate">{assignment?.title || "Assignment"}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] mt-0.5">
                            <span className="flex items-center gap-0.5"><Image src="/Icons/grey/subject.svg" alt="" width={10} height={10} />{assignment?.subject || ""}</span>
                            <span className="flex items-center gap-0.5"><Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />{new Date(s.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          </div>
                          {s.feedback && (
                            <p className="text-[10px] text-[#9A9A9A] mt-1 line-clamp-1 italic">{s.feedback}</p>
                          )}
                        </div>
                        <div className={`text-[18px] font-bold shrink-0 ml-3 ${
                          (s.grade || 0) >= 70 ? "text-green-600" : (s.grade || 0) >= 50 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {s.grade}%
                        </div>
                      </div>
                      {idx < gradedSubmissions.slice(0, 10).length - 1 && <div className="-mx-4 h-px bg-black/10" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
