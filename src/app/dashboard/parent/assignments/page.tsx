import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, AlertCircle, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function ParentAssignments() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("parent_of")
    .eq("id", user.id)
    .single();

  const childId = profile?.parent_of;

  // Fetch child's name
  let childName = "Child";
  if (childId) {
    const { data: childProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", childId)
      .single();
    childName = childProfile?.full_name || "Child";
  }

  // Fetch all assignment links for the child
  let assignmentLinks: { assignment_id: string; completed_at: string | null }[] = [];
  if (childId) {
    const { data } = await supabase
      .from("assignment_students")
      .select("assignment_id, completed_at")
      .eq("student_id", childId);
    assignmentLinks = data || [];
  }

  const completedIds = assignmentLinks.filter((l) => l.completed_at).map((l) => l.assignment_id);
  const pendingIds = assignmentLinks.filter((l) => !l.completed_at).map((l) => l.assignment_id);
  const completionTimeMap: Record<string, string> = {};
  assignmentLinks.forEach((l) => { if (l.completed_at) completionTimeMap[l.assignment_id] = l.completed_at; });

  // Fetch all assignments
  const allIds = [...completedIds, ...pendingIds];
  let allAssignments: { id: string; title: string; subject: string; due_date: string; status: string }[] = [];
  if (allIds.length > 0) {
    const { data } = await supabase
      .from("assignments")
      .select("id, title, subject, due_date, status")
      .in("id", allIds)
      .order("due_date", { ascending: false });
    allAssignments = data || [];
  }

  const now = new Date();
  const completedSet = new Set(completedIds);
  const submitted = allAssignments.filter((a) => completedSet.has(a.id));
  const pending = allAssignments.filter((a) => !completedSet.has(a.id) && new Date(a.due_date) >= now);
  const overdue = allAssignments.filter((a) => !completedSet.has(a.id) && new Date(a.due_date) < now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{childName}&apos;s Assignments</h1>
        <p className="mt-1 text-gray-500">Track homework status and missing tasks</p>
      </div>

      {!childId ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No child linked to your account yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="text-2xl font-bold text-gray-900">{submitted.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Clock className="h-5 w-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pending.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{overdue.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignment List */}
          {allAssignments.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-7 w-7 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No assignments yet</p>
                <p className="text-xs text-gray-300 mt-1">Assignments will appear here once teachers assign them</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {allAssignments.map((a) => {
                  const isDone = completedSet.has(a.id);
                  const isOverdue = !isDone && new Date(a.due_date) < now;
                  return (
                    <div key={a.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                          isDone ? "bg-green-50" : isOverdue ? "bg-red-50" : "bg-blue-50"
                        }`}>
                          {isDone ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                           isOverdue ? <AlertCircle className="h-4 w-4 text-red-600" /> :
                           <Clock className="h-4 w-4 text-[#1e3a5f]" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${isDone ? "text-gray-400 line-through" : "text-gray-900"}`}>{a.title}</p>
                          <p className="text-xs text-gray-400">{a.subject} · Due {new Date(a.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        isDone ? "bg-green-50 text-green-600" : isOverdue ? "bg-red-50 text-red-600" : "bg-blue-50 text-[#1e3a5f]"
                      }`}>
                        {isDone ? "Done" : isOverdue ? "Overdue" : "Pending"}
                      </span>
                      {isDone && completionTimeMap[a.id] && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          Completed {new Date(completionTimeMap[a.id]).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
