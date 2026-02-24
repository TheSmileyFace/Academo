import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Shield, GraduationCap, School, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { UserActionsClient } from "./users-client";

export default async function AdminUsers() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  const { data: users } = schoolId
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role, parent_of, created_at")
        .eq("school_id", schoolId)
        .order("role")
        .order("full_name")
    : { data: [] };

  const allUsers = users || [];
  const studentCount = allUsers.filter((u) => u.role === "student").length;
  const teacherCount = allUsers.filter((u) => u.role === "teacher").length;
  const parentCount = allUsers.filter((u) => u.role === "parent").length;
  const adminCount = allUsers.filter((u) => u.role === "admin").length;

  const students = allUsers.filter((u) => u.role === "student");
  const parents = allUsers.filter((u) => u.role === "parent");

  // Build a map of student id -> name for displaying linked children
  const studentNameMap: Record<string, string> = {};
  students.forEach((s) => { studentNameMap[s.id] = s.full_name || "Unnamed"; });

  const roleConfig = [
    { role: "student", label: "Students", count: studentCount, color: "bg-blue-100 text-[#1e3a5f]", Icon: GraduationCap },
    { role: "teacher", label: "Teachers", count: teacherCount, color: "bg-blue-50 text-[#1e3a5f]", Icon: School },
    { role: "parent", label: "Parents", count: parentCount, color: "bg-blue-50 text-[#1e3a5f]", Icon: Users },
    { role: "admin", label: "Admins", count: adminCount, color: "bg-blue-50 text-[#1e3a5f]", Icon: Shield },
  ];

  const roleBadge: Record<string, string> = {
    student: "bg-blue-50 text-[#1e3a5f] border-blue-200",
    teacher: "bg-blue-50 text-[#1e3a5f] border-blue-200",
    parent: "bg-amber-50 text-amber-700 border-amber-200",
    admin: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-gray-500">View and manage school users</p>
      </div>

      {/* Role Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {roleConfig.map((rc) => (
          <Card key={rc.role} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${rc.color}`}>
                <rc.Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{rc.label}</p>
                <p className="text-2xl font-bold text-gray-900">{rc.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User List */}
      {allUsers.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
              <Inbox className="h-8 w-8 text-gray-300" />
            </div>
            <p className="mt-4 text-base font-medium text-gray-400">No users yet</p>
            <p className="mt-1 text-sm text-gray-300">Share invite codes to get users signed up</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {allUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                    {(u.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{u.full_name || "Unnamed"}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {u.role === "parent" && u.parent_of && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Linked to: {studentNameMap[u.parent_of] || "Unknown student"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.role === "parent" && (
                    <UserActionsClient
                      parentId={u.id}
                      currentChildId={u.parent_of || null}
                      students={students.map((s) => ({ id: s.id, full_name: s.full_name || "Unnamed" }))}
                    />
                  )}
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadge[u.role] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
