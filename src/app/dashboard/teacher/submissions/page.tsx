import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckSquare, Clock, Star, Inbox, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubmissionsClient } from "./submissions-client";

export default async function TeacherSubmissions() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get assignment IDs created by this teacher
  const { data: myAssignments } = await supabase
    .from("assignments")
    .select("id, title, subject")
    .eq("created_by", user.id);

  const assignmentIds = (myAssignments || []).map((a) => a.id);
  const assignmentMap: Record<string, { title: string; subject: string }> = {};
  (myAssignments || []).forEach((a) => {
    assignmentMap[a.id] = { title: a.title, subject: a.subject };
  });

  // Fetch all submissions for those assignments
  let submissions: { id: string; student_id: string; assignment_id: string; status: string; grade: number | null; feedback: string | null; submitted_at: string; file_url: string | null }[] = [];
  if (assignmentIds.length > 0) {
    const { data } = await supabase
      .from("submissions")
      .select("id, student_id, assignment_id, status, grade, feedback, submitted_at, file_url")
      .in("assignment_id", assignmentIds)
      .order("submitted_at", { ascending: false });
    submissions = data || [];
  }

  // Fetch student names
  const studentIds = [...new Set(submissions.map((s) => s.student_id))];
  let studentMap: Record<string, string> = {};
  if (studentIds.length > 0) {
    const { data: students } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    (students || []).forEach((s) => {
      studentMap[s.id] = s.full_name;
    });
  }

  const pendingCount = submissions.filter((s) => s.status === "submitted").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  const gradedSubmissions = submissions.filter((s) => s.status === "graded" && s.grade != null);
  const avgGrade = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length)
    : null;

  // Prepare data for client component
  const submissionRows = submissions.map((s) => ({
    id: s.id,
    studentId: s.student_id,
    studentName: studentMap[s.student_id] || "Unknown",
    assignmentTitle: assignmentMap[s.assignment_id]?.title || "Assignment",
    subject: assignmentMap[s.assignment_id]?.subject || "",
    status: s.status,
    grade: s.grade,
    feedback: s.feedback,
    submittedAt: s.submitted_at,
    fileUrl: s.file_url,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
        <p className="mt-1 text-gray-500">Review and grade student work</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Graded</p>
              <p className="text-2xl font-bold text-gray-900">{gradedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Star className="h-5 w-5 text-[#1e3a5f]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Grade</p>
              <p className="text-2xl font-bold text-gray-900">{avgGrade !== null ? `${avgGrade}%` : "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {submissions.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No submissions yet</p>
            <p className="text-xs text-gray-300 mt-1">Student submissions will appear here as they submit assignments</p>
          </CardContent>
        </Card>
      ) : (
        <SubmissionsClient submissions={submissionRows} />
      )}
    </div>
  );
}
