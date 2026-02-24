import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GraduationCap, Users, BookOpen, Layers, FolderOpen, KeyRound, Plus, ArrowRight, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Fetch real counts (safe even if schoolId is null — queries just return empty)
  const [schoolRes, yearGroupsRes, classesRes, subjectsRes, teachersRes, studentsRes, codesRes, announcementsRes] = await Promise.all([
    schoolId ? supabase.from("schools").select("name").eq("id", schoolId).single() : { data: null },
    schoolId ? supabase.from("year_groups").select("id, name, sort_order").eq("school_id", schoolId).order("sort_order") : { data: [] },
    schoolId ? supabase.from("classes").select("id, name, year_group_id").eq("school_id", schoolId) : { data: [] },
    schoolId ? supabase.from("subjects").select("id, name, color").eq("school_id", schoolId) : { data: [] },
    schoolId ? supabase.from("profiles").select("id").eq("school_id", schoolId).eq("role", "teacher") : { data: [] },
    schoolId ? supabase.from("profiles").select("id").eq("school_id", schoolId).eq("role", "student") : { data: [] },
    schoolId ? supabase.from("school_invite_codes").select("id, code, role, class_id").eq("school_id", schoolId) : { data: [] },
    schoolId ? supabase.from("announcements").select("id, title, priority, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(3) : { data: [] },
  ]);

  const school = schoolRes.data;
  const recentAnnouncements = (announcementsRes.data as { id: string; title: string; priority: string; created_at: string }[]) || [];
  const inviteCodes = (codesRes.data as { id: string; code: string; role: string; class_id: string | null }[]) || [];
  const studentCodeCount = inviteCodes.filter((c) => c.role === "student" && c.class_id).length;
  const staffCodeCount = inviteCodes.filter((c) => c.role !== "student").length;
  const yearGroups = yearGroupsRes.data || [];
  const classes = classesRes.data || [];
  const subjects = subjectsRes.data || [];
  const teacherCount = (teachersRes.data as unknown[] | null)?.length || 0;
  const studentCount = (studentsRes.data as unknown[] | null)?.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">School Management</h1>
        <p className="mt-1 text-gray-500">
          {school?.name || "Your school"} — manage your year groups, classes, subjects, and people
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Year Groups", value: yearGroups.length, icon: Layers },
          { label: "Classes", value: classes.length, icon: FolderOpen },
          { label: "Subjects", value: subjects.length, icon: BookOpen },
          { label: "People", value: teacherCount + studentCount, icon: Users },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <stat.icon className="h-5 w-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Year Groups & Classes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Year Groups & Classes</CardTitle>
            <Link href="/dashboard/admin/setup">
              <Button variant="ghost" size="sm" className="text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-blue-50">
                <Plus className="h-4 w-4 mr-1" /> Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {yearGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                  <Layers className="h-7 w-7 text-gray-300" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-400">No year groups yet</p>
                <p className="text-xs text-gray-300 mt-1">Create year groups to organize your students into classes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {yearGroups.map((yg) => {
                  const ygClasses = classes.filter((c) => c.year_group_id === yg.id);
                  return (
                    <div key={yg.id} className="rounded-xl border border-gray-100 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">{yg.name}</span>
                        <span className="text-xs text-gray-400">{ygClasses.length} {ygClasses.length === 1 ? "class" : "classes"}</span>
                      </div>
                      {ygClasses.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {ygClasses.map((c) => (
                            <span key={c.id} className="text-xs font-medium bg-blue-50 text-[#1e3a5f] rounded-full px-2.5 py-0.5">
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Subjects</CardTitle>
            <Link href="/dashboard/admin/setup">
              <Button variant="ghost" size="sm" className="text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-blue-50">
                <Plus className="h-4 w-4 mr-1" /> Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                  <BookOpen className="h-7 w-7 text-gray-300" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-400">No subjects yet</p>
                <p className="text-xs text-gray-300 mt-1">Add the subjects your school teaches</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color || "#059669" }} />
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* People */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">People</CardTitle>
            <Link href="/dashboard/admin/users">
              <Button variant="ghost" size="sm" className="text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-blue-50">
                Manage →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-blue-50">
                  <GraduationCap className="h-5 w-5 text-[#1e3a5f]" />
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{studentCount}</p>
                <p className="text-xs text-gray-400">Students</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-5 w-5 text-[#1e3a5f]" />
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{teacherCount}</p>
                <p className="text-xs text-gray-400">Teachers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Codes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Invite Codes</CardTitle>
            <Link href="/dashboard/admin/invite-codes">
              <Button variant="ghost" size="sm" className="text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-blue-50">
                Manage →
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-blue-50">
                  <GraduationCap className="h-5 w-5 text-[#1e3a5f]" />
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{studentCodeCount}</p>
                <p className="text-xs text-gray-400">Class Codes</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-blue-50">
                  <KeyRound className="h-5 w-5 text-[#1e3a5f]" />
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{staffCodeCount}</p>
                <p className="text-xs text-gray-400">Staff Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Announcements */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Megaphone className="h-4 w-4 text-[#1e3a5f]" />
            Recent Announcements
          </CardTitle>
          <Link href="/dashboard/admin/announcements">
            <Button variant="ghost" size="sm" className="text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-blue-50">
              <Plus className="h-4 w-4 mr-1" /> Manage
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Megaphone className="h-7 w-7 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No announcements published yet</p>
              <Link href="/dashboard/admin/announcements" className="mt-2 text-xs font-medium text-[#1e3a5f] hover:underline">
                Create your first announcement →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                      <Megaphone className="h-4 w-4 text-[#1e3a5f]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  {a.priority !== "normal" && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      a.priority === "urgent" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {a.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
