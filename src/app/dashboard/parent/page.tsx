import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart3, BookOpen, Inbox, Activity, Clock, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ParentDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, parent_of, full_name")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;
  const childId = profile?.parent_of;

  // Fetch child profile
  let childProfile: { full_name: string; email: string } | null = null;
  if (childId) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", childId)
      .single();
    childProfile = data;
  }

  // Fetch child's pending assignments
  let pendingAssignments: { id: string; title: string; subject: string; due_date: string }[] = [];
  if (childId) {
    const { data: links } = await supabase
      .from("assignment_students")
      .select("assignment_id, completed_at")
      .eq("student_id", childId);

    const pendingIds = (links || []).filter((l) => !l.completed_at).map((l) => l.assignment_id);
    if (pendingIds.length > 0) {
      const { data } = await supabase
        .from("assignments")
        .select("id, title, subject, due_date")
        .in("id", pendingIds)
        .order("due_date", { ascending: true })
        .limit(5);
      pendingAssignments = data || [];
    }
  }

  // Fetch child's recent graded submissions
  let recentGrades: { id: string; grade: number; feedback: string | null; submitted_at: string; assignment_id: string }[] = [];
  if (childId) {
    const { data } = await supabase
      .from("submissions")
      .select("id, grade, feedback, submitted_at, assignment_id")
      .eq("student_id", childId)
      .eq("status", "graded")
      .order("submitted_at", { ascending: false })
      .limit(5);
    recentGrades = data || [];
  }

  // Fetch school announcements
  let announcements: { id: string; title: string; content: string; priority: string; created_at: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, priority, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(3);
    announcements = data || [];
  }

  const hours = new Date().getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.full_name || "").split(" ")[0] || "Parent";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{greeting}, {firstName}</h1>
        <p className="mt-1 text-gray-500">
          {childProfile
            ? `Monitoring ${childProfile.full_name}'s academic progress`
            : "Monitor your child's progress and stay connected with teachers"}
        </p>
      </div>

      {!childId ? (
        <Card className="border-0 shadow-sm bg-blue-50/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
              <Inbox className="h-7 w-7 text-[#1e3a5f]" />
            </div>
            <p className="mt-4 text-base font-semibold text-gray-700">No child linked to your account yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Once your school administrator links your child&apos;s account, you&apos;ll see their grades, assignments, and activity here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Assignments */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Pending Assignments</CardTitle>
              <Link href="/dashboard/parent/assignments" className="text-sm font-medium text-[#1e3a5f]">
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {pendingAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-7 w-7 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">All assignments completed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingAssignments.map((a) => {
                    const isOverdue = new Date(a.due_date) < new Date();
                    return (
                      <div key={a.id} className={`rounded-lg border px-3 py-2.5 ${isOverdue ? "border-red-200 bg-red-50/40" : "border-gray-100"}`}>
                        <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span>{a.subject}</span>
                          <span className="text-gray-200">·</span>
                          <Clock className="h-3 w-3" />
                          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                            {isOverdue ? "Overdue" : `Due ${new Date(a.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Grades */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Recent Grades</CardTitle>
              <Link href="/dashboard/parent/grades" className="text-sm font-medium text-[#1e3a5f]">
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {recentGrades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BarChart3 className="h-7 w-7 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No grades yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentGrades.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Assignment</p>
                        <p className="text-xs text-gray-400">
                          {new Date(g.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${g.grade >= 70 ? "text-green-600" : g.grade >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {g.grade}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Megaphone className="h-4 w-4 text-[#1e3a5f]" />
              School Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                  {a.priority === "urgent" && (
                    <span className="text-[10px] font-bold uppercase bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Urgent</span>
                  )}
                  {a.priority === "high" && (
                    <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Important</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{a.content}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
