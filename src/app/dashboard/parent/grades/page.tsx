import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, BarChart3, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ParentGrades() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("parent_of")
    .eq("id", user.id)
    .single();

  const childId = profile?.parent_of;

  if (!childId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Child&apos;s Grades</h1>
          <p className="mt-1 text-gray-500">Detailed academic performance overview</p>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No child linked to your account yet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch child's name
  const { data: childProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", childId)
    .single();

  // Fetch graded submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, grade, feedback, submitted_at, assignment_id")
    .eq("student_id", childId)
    .eq("status", "graded")
    .order("submitted_at", { ascending: false });

  const gradedSubmissions = submissions || [];

  // Fetch assignment details
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

  // Subject averages
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{childProfile?.full_name || "Child"}&apos;s Grades</h1>
        <p className="mt-1 text-gray-500">Detailed academic performance overview</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Subject Averages</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectAverages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-7 w-7 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No grades available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subjectAverages.map((s) => (
                  <div key={s.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{s.subject}</span>
                      <span className={`text-sm font-bold ${s.average >= 70 ? "text-green-600" : s.average >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {s.average}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.average >= 70 ? "bg-green-500" : s.average >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${s.average}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{s.count} graded assignment{s.count !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            {gradedSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="h-7 w-7 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No results yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {gradedSubmissions.slice(0, 10).map((s) => {
                  const assignment = assignmentMap[s.assignment_id];
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{assignment?.title || "Assignment"}</p>
                        <p className="text-xs text-gray-400">{assignment?.subject}</p>
                        {s.feedback && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">{s.feedback}</p>}
                      </div>
                      <div className={`text-lg font-bold shrink-0 ml-3 ${
                        (s.grade || 0) >= 70 ? "text-green-600" : (s.grade || 0) >= 50 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {s.grade}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
