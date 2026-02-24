import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, CheckSquare, Brain, Inbox, Plus, Clock, Users, GraduationCap, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TeacherDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, subject_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  let subjectName = "";
  if (profile?.subject_id) {
    const { data: sub } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", profile.subject_id)
      .single();
    subjectName = sub?.name || "";
  }

  const { data: assignments } = schoolId
    ? await supabase
        .from("assignments")
        .select("id, title, subject, class_name, due_date, status, created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const recentAssignments = assignments || [];

  // Fetch school announcements
  let announcements: { id: string; title: string; priority: string; created_at: string }[] = [];
  if (schoolId) {
    const { data: ann } = await supabase
      .from("announcements")
      .select("id, title, priority, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(3);
    announcements = ann || [];
  }

  const today = new Date();
  const hours = today.getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{greeting}!</h1>
          <p className="mt-1 text-gray-500">
            {subjectName ? `${subjectName} Department` : "Here's your teaching dashboard"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/teacher/create-exam">
            <Button variant="outline" className="rounded-xl h-12 px-5 text-base font-semibold border-blue-200 text-[#1e3a5f] hover:bg-blue-50">
              <GraduationCap className="mr-2 h-5 w-5" /> Schedule Exam
            </Button>
          </Link>
          <Link href="/dashboard/teacher/create">
            <Button className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl h-12 px-6 text-base font-semibold shadow-lg shadow-blue-100">
              <Plus className="mr-2 h-5 w-5" /> Create Assignment
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Assignments */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Recent Assignments</CardTitle>
              <Link href="/dashboard/teacher/assignments" className="text-sm font-medium text-[#1e3a5f] hover:text-[#1e3a5f]">
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {recentAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                    <Inbox className="h-7 w-7 text-gray-300" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-400">No assignments created yet</p>
                  <p className="mt-1 text-xs text-gray-300">Click the button above to create your first assignment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shrink-0">
                          <BookOpen className="h-5 w-5 text-[#1e3a5f]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">{a.class_name || a.subject}</span>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due {new Date(a.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        a.status === "active"
                          ? "bg-blue-50 text-[#1e3a5f]"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Announcements */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Create Assignment", href: "/dashboard/teacher/create", icon: BookOpen, color: "bg-blue-50 text-[#1e3a5f] border-blue-200" },
                { label: "Schedule Exam", href: "/dashboard/teacher/create-exam", icon: GraduationCap, color: "bg-blue-50 text-[#1e3a5f] border-blue-200" },
                { label: "AI Homework Digitizer", href: "/dashboard/teacher/ai-digitizer", icon: Brain, color: "bg-blue-50 text-[#1e3a5f] border-blue-200" },
                { label: "Grade Submissions", href: "/dashboard/teacher/submissions", icon: CheckSquare, color: "bg-blue-50 text-[#1e3a5f] border-blue-200" },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors hover:shadow-sm cursor-pointer ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                    <span className="text-sm font-semibold">{action.label}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Megaphone className="h-4 w-4 text-[#1e3a5f]" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Megaphone className="h-6 w-6 text-gray-200 mb-1" />
                  <p className="text-xs text-gray-400">No announcements</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {announcements.map((a) => (
                    <div key={a.id} className="rounded-lg border border-gray-100 px-3 py-2.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                        {a.priority !== "normal" && (
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            a.priority === "urgent" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          }`}>
                            {a.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
