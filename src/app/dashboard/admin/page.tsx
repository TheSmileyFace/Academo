import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  FolderOpen,
  KeyRound,
  Plus,
  ArrowRight,
  Megaphone,
  TrendingUp,
  UserPlus,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  GrowthChart,
  YearGroupChart,
  RoleDonutChart,
  SubjectChart,
} from "@/components/overview-charts";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Fetch all data in parallel
  const [
    schoolRes,
    yearGroupsRes,
    classesRes,
    subjectsRes,
    allProfilesRes,
    codesRes,
    announcementsRes,
    enrollmentsRes,
    classSubjectsRes,
  ] = await Promise.all([
    schoolId
      ? supabase.from("schools").select("name").eq("id", schoolId).single()
      : { data: null },
    schoolId
      ? supabase
          .from("year_groups")
          .select("id, name, sort_order")
          .eq("school_id", schoolId)
          .order("sort_order")
      : { data: [] },
    schoolId
      ? supabase
          .from("classes")
          .select("id, name, year_group_id")
          .eq("school_id", schoolId)
      : { data: [] },
    schoolId
      ? supabase
          .from("subjects")
          .select("id, name, color")
          .eq("school_id", schoolId)
      : { data: [] },
    schoolId
      ? supabase
          .from("profiles")
          .select("id, role, created_at")
          .eq("school_id", schoolId)
      : { data: [] },
    schoolId
      ? supabase
          .from("school_invite_codes")
          .select("id, code, role, class_id")
          .eq("school_id", schoolId)
      : { data: [] },
    schoolId
      ? supabase
          .from("announcements")
          .select("id, title, priority, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(5)
      : { data: [] },
    schoolId
      ? supabase
          .from("student_enrollments")
          .select("id, class_id")
          .eq("school_id", schoolId)
      : { data: [] },
    schoolId
      ? supabase
          .from("class_subjects")
          .select("id, subject_id")
          .eq("school_id", schoolId)
      : { data: [] },
  ]);

  const school = schoolRes.data;
  const yearGroups =
    (yearGroupsRes.data as { id: string; name: string; sort_order: number }[]) ||
    [];
  const classes =
    (classesRes.data as {
      id: string;
      name: string;
      year_group_id: string;
    }[]) || [];
  const subjects =
    (subjectsRes.data as { id: string; name: string; color: string }[]) || [];
  const allProfiles =
    (allProfilesRes.data as {
      id: string;
      role: string;
      created_at: string;
    }[]) || [];
  const inviteCodes =
    (codesRes.data as {
      id: string;
      code: string;
      role: string;
      class_id: string | null;
    }[]) || [];
  const recentAnnouncements =
    (announcementsRes.data as {
      id: string;
      title: string;
      priority: string;
      created_at: string;
    }[]) || [];
  const enrollments =
    (enrollmentsRes.data as { id: string; class_id: string }[]) || [];
  const classSubjects =
    (classSubjectsRes.data as { id: string; subject_id: string }[]) || [];

  const teacherCount = allProfiles.filter((p) => p.role === "teacher").length;
  const studentCount = allProfiles.filter((p) => p.role === "student").length;
  const parentCount = allProfiles.filter((p) => p.role === "parent").length;
  const adminCount = allProfiles.filter((p) => p.role === "admin").length;
  const studentCodeCount = inviteCodes.filter(
    (c) => c.role === "student" && c.class_id
  ).length;
  const staffCodeCount = inviteCodes.filter(
    (c) => c.role !== "student"
  ).length;

  // ── Chart data: User growth over last 6 months ──
  const now = new Date();
  const growthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const count = allProfiles.filter(
      (p) => new Date(p.created_at) <= monthEnd
    ).length;
    return {
      month: d.toLocaleDateString("en-GB", { month: "short" }),
      users: count,
    };
  });

  // ── Chart data: Students per year group ──
  const yearGroupData = yearGroups.map((yg) => {
    const ygClassIds = classes
      .filter((c) => c.year_group_id === yg.id)
      .map((c) => c.id);
    const studentsInYG = enrollments.filter((e) =>
      ygClassIds.includes(e.class_id)
    ).length;
    return { name: yg.name, students: studentsInYG };
  });

  // ── Chart data: Role distribution ──
  const roleData = [
    { name: "Students", value: studentCount, color: "#2563eb" },
    { name: "Teachers", value: teacherCount, color: "#0891b2" },
    { name: "Parents", value: parentCount, color: "#059669" },
    { name: "Admins", value: adminCount, color: "#7c3aed" },
  ].filter((r) => r.value > 0);

  // ── Chart data: Classes per subject ──
  const subjectData = subjects
    .map((s) => ({
      name: s.name,
      classes: classSubjects.filter((cs) => cs.subject_id === s.id).length,
      color: s.color || "#059669",
    }))
    .sort((a, b) => b.classes - a.classes)
    .slice(0, 8);

  // Stat cards config
  const stats = [
    {
      label: "Year Groups",
      value: yearGroups.length,
      icon: Layers,
      color: "bg-blue-50 text-blue-600",
      href: "/dashboard/admin/setup",
    },
    {
      label: "Classes",
      value: classes.length,
      icon: FolderOpen,
      color: "bg-cyan-50 text-cyan-600",
      href: "/dashboard/admin/setup",
    },
    {
      label: "Subjects",
      value: subjects.length,
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600",
      href: "/dashboard/admin/setup",
    },
    {
      label: "People",
      value: allProfiles.length,
      icon: Users,
      color: "bg-violet-50 text-violet-600",
      href: "/dashboard/admin/users",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {school?.name || "Your school"} — overview and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/invite-codes">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-gray-200"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Invite
            </Button>
          </Link>
          <Link href="/dashboard/admin/announcements">
            <Button
              size="sm"
              className="text-xs h-8 bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              <Megaphone className="h-3.5 w-3.5 mr-1.5" />
              Announce
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color} transition-transform group-hover:scale-110`}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row 1: Growth + Role Distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  User Growth
                </CardTitle>
              </div>
              <span className="text-xs text-gray-400">Last 6 months</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <GrowthChart data={growthData} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <Users className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <CardTitle className="text-sm font-semibold">
                User Roles
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <RoleDonutChart data={roleData} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Year Groups + Subjects */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50">
                  <GraduationCap className="h-3.5 w-3.5 text-cyan-600" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Students per Year Group
                </CardTitle>
              </div>
              <Link href="/dashboard/admin/setup">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-gray-400 hover:text-[#1e3a5f]"
                >
                  View all
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <YearGroupChart data={yearGroupData} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Classes per Subject
                </CardTitle>
              </div>
              <Link href="/dashboard/admin/setup">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-gray-400 hover:text-[#1e3a5f]"
                >
                  View all
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <SubjectChart data={subjectData} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Quick Links + Announcements */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Year Groups & Classes Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Year Groups
              </CardTitle>
              <Link href="/dashboard/admin/setup">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-gray-400 hover:text-[#1e3a5f]"
                >
                  Manage
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {yearGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Layers className="h-6 w-6 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No year groups yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {yearGroups.slice(0, 5).map((yg) => {
                  const ygClasses = classes.filter(
                    (c) => c.year_group_id === yg.id
                  );
                  return (
                    <div
                      key={yg.id}
                      className="rounded-lg border border-gray-100 p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">
                          {yg.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {ygClasses.length}{" "}
                          {ygClasses.length === 1 ? "class" : "classes"}
                        </span>
                      </div>
                      {ygClasses.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {ygClasses.map((c) => (
                            <span
                              key={c.id}
                              className="text-[10px] font-medium bg-blue-50 text-[#1e3a5f] rounded-full px-2 py-0.5"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {yearGroups.length > 5 && (
                  <p className="text-[10px] text-gray-400 text-center pt-1">
                    +{yearGroups.length - 5} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Codes Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Invite Codes
              </CardTitle>
              <Link href="/dashboard/admin/invite-codes">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-gray-400 hover:text-[#1e3a5f]"
                >
                  Manage
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-100 p-3 text-center">
                <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-blue-50">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-1.5 text-xl font-bold text-gray-900">
                  {studentCodeCount}
                </p>
                <p className="text-[10px] text-gray-400">Class Codes</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 text-center">
                <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-amber-50">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                </div>
                <p className="mt-1.5 text-xl font-bold text-gray-900">
                  {staffCodeCount}
                </p>
                <p className="text-[10px] text-gray-400">Staff Codes</p>
              </div>
            </div>
            {/* Quick people stats */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-100 p-3 text-center">
                <p className="text-xl font-bold text-gray-900">
                  {studentCount}
                </p>
                <p className="text-[10px] text-gray-400">Students</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 text-center">
                <p className="text-xl font-bold text-gray-900">
                  {teacherCount}
                </p>
                <p className="text-[10px] text-gray-400">Teachers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                  <Megaphone className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Announcements
                </CardTitle>
              </div>
              <Link href="/dashboard/admin/announcements">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-gray-400 hover:text-[#1e3a5f]"
                >
                  All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Megaphone className="h-6 w-6 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No announcements yet</p>
                <Link
                  href="/dashboard/admin/announcements"
                  className="mt-1.5 text-[10px] font-medium text-[#1e3a5f] hover:underline"
                >
                  Create one →
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentAnnouncements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {a.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(a.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    {a.priority !== "normal" && (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                          a.priority === "urgent"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
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
    </div>
  );
}
