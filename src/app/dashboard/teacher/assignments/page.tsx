import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Plus, Inbox, Clock, CheckCircle2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
  const now = new Date();
  const activeCount = allAssignments.filter((a) => a.status === "active").length;
  const pastDueCount = allAssignments.filter((a) => a.status === "active" && new Date(a.due_date) < now).length;

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
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {allAssignments.map((a) => {
              const isActive = a.status === "active";
              const isPastDue = isActive && new Date(a.due_date) < now;
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
                        {a.class_name && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{a.class_name}</span>
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
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 capitalize ${
                    isPastDue ? "bg-red-50 text-red-600" : isActive ? "bg-blue-50 text-[#1e3a5f]" : "bg-gray-100 text-gray-500"
                  }`}>
                    {isPastDue ? "Past due" : a.status}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
