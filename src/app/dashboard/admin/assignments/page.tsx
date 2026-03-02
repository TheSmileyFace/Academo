import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Clock, Users, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAssignments() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Fetch all assignments in the school
  let assignments: { id: string; title: string; subject: string; class_name: string; due_date: string; status: string; created_by: string; created_at: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("assignments")
      .select("id, title, subject, class_name, due_date, status, created_by, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    assignments = data || [];
  }

  // Fetch teacher names
  const teacherIds = [...new Set(assignments.map((a) => a.created_by).filter(Boolean))];
  let teacherMap: Record<string, string> = {};
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);
    (teachers || []).forEach((t) => { teacherMap[t.id] = t.full_name || "Teacher"; });
  }

  // Fetch completion stats for all assignments
  const assignmentIds = assignments.map((a) => a.id);
  let completionMap: Record<string, { total: number; completed: number }> = {};
  if (assignmentIds.length > 0) {
    const { data: links } = await supabase
      .from("assignment_students")
      .select("assignment_id, completed_at")
      .in("assignment_id", assignmentIds);

    (links || []).forEach((l) => {
      if (!completionMap[l.assignment_id]) completionMap[l.assignment_id] = { total: 0, completed: 0 };
      completionMap[l.assignment_id].total++;
      if (l.completed_at) completionMap[l.assignment_id].completed++;
    });
  }

  const now = new Date();
  const activeCount = assignments.filter((a) => a.status === "active").length;
  const overdueCount = assignments.filter((a) => a.status === "active" && new Date(a.due_date) < now).length;
  const totalStudentsAssigned = Object.values(completionMap).reduce((sum, c) => sum + c.total, 0);
  const totalCompleted = Object.values(completionMap).reduce((sum, c) => sum + c.completed, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">All Assignments</h1>
        <p className="mt-0.5 text-sm text-gray-500">School-wide assignment overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{assignments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {totalStudentsAssigned > 0 ? `${Math.round((totalCompleted / totalStudentsAssigned) * 100)}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No assignments in the school yet</p>
            <p className="text-xs text-gray-300 mt-1">Assignments created by teachers will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {assignments.map((a) => {
              const isActive = a.status === "active";
              const isPastDue = isActive && new Date(a.due_date) < now;
              const stats = completionMap[a.id] || { total: 0, completed: 0 };
              const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

              return (
                <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                      isPastDue ? "bg-red-50" : isActive ? "bg-blue-50" : "bg-gray-50"
                    }`}>
                      <BookOpen className={`h-4 w-4 ${isPastDue ? "text-red-500" : isActive ? "text-[#1e3a5f]" : "text-gray-400"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{a.subject}</span>
                        <span className="text-gray-200">·</span>
                        <span>{teacherMap[a.created_by] || "Teacher"}</span>
                        {a.class_name && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span>{a.class_name}</span>
                          </>
                        )}
                        <span className="text-gray-200">·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {new Date(a.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {stats.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : pct > 0 ? "bg-blue-500" : "bg-gray-200"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500">{stats.completed}/{stats.total}</span>
                      </div>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      isPastDue ? "bg-red-50 text-red-600" : isActive ? "bg-blue-50 text-[#1e3a5f]" : "bg-gray-100 text-gray-500"
                    }`}>
                      {isPastDue ? "Past due" : a.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
