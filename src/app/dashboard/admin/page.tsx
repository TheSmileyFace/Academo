import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const firstName = (profile?.full_name || "").split(" ")[0] || "Admin";

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0" style={{ paddingTop: 23 }}>
        <div>
          <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">
            {dayNames[today.getDay()]}, {today.getDate()} {monthNames[today.getMonth()]}
          </p>
          <h1 className="text-[22px] leading-tight mt-0.5 text-[#2d2d2d] dark:text-white">
            <span className="mr-1">👋</span>
            <span className="font-libre">Welcome back, </span>
            <span className="font-semibold">{firstName}</span>
          </h1>
        </div>
        {school?.name && (
          <div className="dash-card dark:border-[#2D2D2D] dark:bg-[#333333] rounded-xl px-4 py-2.5 flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#2D2D2D] shrink-0" />
            <span className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{school.name}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Year Groups", value: yearGroups.length, href: "/dashboard/admin/setup" },
          { label: "Classes", value: classes.length, href: "/dashboard/admin/setup" },
          { label: "Students", value: studentCount, href: "/dashboard/admin/users" },
          { label: "Teachers", value: teacherCount, href: "/dashboard/admin/users" },
        ].map((s) => (
          <Link key={s.label} href={s.href}>
            <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
              <p className="text-[22px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{s.value}</p>
              <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Setup School", href: "/dashboard/admin/setup" },
          { label: "Invite Users", href: "/dashboard/admin/invite-codes" },
          { label: "Announce", href: "/dashboard/admin/announcements" },
          { label: "Timetable", href: "/dashboard/admin/timetable" },
        ].map((a) => (
          <Link key={a.href} href={a.href}>
            <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
              <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{a.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts + lists */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
        {/* Left: charts */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          {/* Growth chart */}
          <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 flex-[2] min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">User Growth</p>
              <span className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0]">Last 6 months</span>
            </div>
            <GrowthChart data={growthData} />
          </div>

          {/* Year group + subject charts */}
          <div className="flex gap-3 flex-1 min-h-0">
            <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 flex-1 min-w-0 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Students per Year Group</p>
                <Link href="/dashboard/admin/setup" className="text-[11px] text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white transition-colors">Setup →</Link>
              </div>
              <YearGroupChart data={yearGroupData} />
            </div>
            <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 flex-1 min-w-0 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Classes per Subject</p>
                <Link href="/dashboard/admin/setup" className="text-[11px] text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white transition-colors">Setup →</Link>
              </div>
              <SubjectChart data={subjectData} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
          {/* Role donut */}
          <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 shrink-0">
            <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white mb-3">User Roles</p>
            <RoleDonutChart data={roleData} />
          </div>

          {/* People mini stats */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {[
              { label: "Parents", value: parentCount },
              { label: "Subjects", value: subjects.length },
            ].map((s) => (
              <div key={s.label} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-3 py-3 text-center">
                <p className="text-[20px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{s.value}</p>
                <p className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Year groups list */}
          <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
              <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">Year Groups</p>
              <Link href="/dashboard/admin/setup" className="text-[11px] text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white transition-colors">Manage →</Link>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {yearGroups.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[12px] text-[#9A9A9A]">No year groups yet</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {yearGroups.slice(0, 6).map((yg) => {
                    const ygClasses = classes.filter((c) => c.year_group_id === yg.id);
                    return (
                      <div key={yg.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-semibold text-[#2D2D2D] dark:text-white">{yg.name}</p>
                          <span className="text-[10px] text-[#9A9A9A]">{ygClasses.length} {ygClasses.length === 1 ? "class" : "classes"}</span>
                        </div>
                        {ygClasses.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ygClasses.slice(0, 4).map((c) => (
                              <span key={c.id} className="text-[9px] font-bold bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A] dark:text-[#A0A0A0] px-1.5 py-0.5 rounded-full">
                                {c.name}
                              </span>
                            ))}
                            {ygClasses.length > 4 && (
                              <span className="text-[9px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">+{ygClasses.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent announcements */}
          <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5">
              <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">Announcements</p>
              <Link href="/dashboard/admin/announcements" className="text-[11px] text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white transition-colors">All →</Link>
            </div>
            {recentAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center px-4">
                <p className="text-[12px] text-[#9A9A9A]">No announcements yet</p>
                <Link href="/dashboard/admin/announcements" className="mt-1 text-[11px] font-semibold text-[#2D2D2D] dark:text-white hover:underline">Create one →</Link>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#2D2D2D] dark:text-white truncate">{a.title}</p>
                      <p className="text-[10px] text-[#9A9A9A] dark:text-[#A0A0A0]">
                        {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {a.priority !== "normal" && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        a.priority === "urgent"
                          ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                      }`}>
                        {a.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
