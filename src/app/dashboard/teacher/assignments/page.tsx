import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Plus, Inbox, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TeacherAssignmentsClient } from "./assignments-client";

export default async function TeacherAssignments() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, subject, class_name, due_date, status, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const allAssignments = assignments || [];

  // Fetch student completion data for all assignments
  const assignmentIds = allAssignments.map((a) => a.id);
  let studentStatusMap: Record<string, { total: number; completed: number; students: { id: string; name: string; completedAt: string | null }[] }> = {};

  if (assignmentIds.length > 0) {
    const { data: links } = await supabase
      .from("assignment_students")
      .select("assignment_id, student_id, completed_at")
      .in("assignment_id", assignmentIds);

    if (links && links.length > 0) {
      // Get all student names
      const studentIds = [...new Set(links.map((l) => l.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p) => { nameMap[p.id] = p.full_name || "Student"; });

      // Group by assignment
      links.forEach((l) => {
        if (!studentStatusMap[l.assignment_id]) {
          studentStatusMap[l.assignment_id] = { total: 0, completed: 0, students: [] };
        }
        studentStatusMap[l.assignment_id].total++;
        if (l.completed_at) studentStatusMap[l.assignment_id].completed++;
        studentStatusMap[l.assignment_id].students.push({
          id: l.student_id,
          name: nameMap[l.student_id] || "Student",
          completedAt: l.completed_at,
        });
      });

      // Sort students: completed first, then alphabetical
      Object.values(studentStatusMap).forEach((s) => {
        s.students.sort((a, b) => {
          if (a.completedAt && !b.completedAt) return -1;
          if (!a.completedAt && b.completedAt) return 1;
          return a.name.localeCompare(b.name);
        });
      });
    }
  }

  const rows = allAssignments.map((a) => ({
    id: a.id,
    title: a.title,
    subject: a.subject,
    className: a.class_name,
    dueDate: a.due_date,
    status: a.status,
    totalStudents: studentStatusMap[a.id]?.total || 0,
    completedStudents: studentStatusMap[a.id]?.completed || 0,
    students: studentStatusMap[a.id]?.students || [],
  }));

  const activeCount = allAssignments.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="mt-1 text-gray-500">{allAssignments.length} total · {activeCount} active</p>
        </div>
        <Link href="/dashboard/teacher/create">
          <Button className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> New Assignment
          </Button>
        </Link>
      </div>

      {allAssignments.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No assignments created yet</p>
            <p className="text-xs text-gray-300 mt-1">Click &quot;New Assignment&quot; to create your first one</p>
            <Link href="/dashboard/teacher/create" className="mt-4">
              <Button className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Create Assignment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <TeacherAssignmentsClient assignments={rows} />
      )}
    </div>
  );
}
