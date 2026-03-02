import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

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
  let childProfile: { full_name: string; email: string; avatar_url: string | null } | null = null;
  if (childId) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", childId)
      .single();
    childProfile = data;
  }

  // Pending assignments
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

  // Recent grades (with assignment titles)
  let recentGrades: { id: string; grade: number; assignment_title: string; subject: string; submitted_at: string }[] = [];
  if (childId) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("id, grade, submitted_at, assignment_id")
      .eq("student_id", childId)
      .eq("status", "graded")
      .order("submitted_at", { ascending: false })
      .limit(5);
    if (subs && subs.length > 0) {
      const aIds = subs.map((s) => s.assignment_id);
      const { data: asgns } = await supabase.from("assignments").select("id, title, subject").in("id", aIds);
      const aMap: Record<string, { title: string; subject: string }> = {};
      (asgns || []).forEach((a) => { aMap[a.id] = { title: a.title, subject: a.subject }; });
      recentGrades = subs
        .filter((s) => s.grade != null && aMap[s.assignment_id])
        .map((s) => ({
          id: s.id,
          grade: s.grade,
          assignment_title: aMap[s.assignment_id]?.title || "Assignment",
          subject: aMap[s.assignment_id]?.subject || "",
          submitted_at: s.submitted_at,
        }));
    }
  }

  // Attendance (last 30 days)
  let attendanceRate: number | null = null;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  if (childId) {
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const { data: att } = await supabase
      .from("attendance")
      .select("status")
      .eq("student_id", childId)
      .gte("date", thirtyAgo.toISOString().split("T")[0]);
    const attRows = att || [];
    presentCount = attRows.filter((a) => a.status === "present").length;
    absentCount = attRows.filter((a) => a.status === "absent").length;
    lateCount = attRows.filter((a) => a.status === "late").length;
    const total = attRows.length;
    attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : null;
  }

  // Behavior events
  let recentBehavior: { id: string; type: string; reason: string; points: number; created_at: string }[] = [];
  let cautionCount = 0;
  let rewardCount = 0;
  if (childId) {
    const { data } = await supabase
      .from("behavior_events")
      .select("id, type, reason, points, created_at")
      .eq("student_id", childId)
      .order("created_at", { ascending: false })
      .limit(5);
    recentBehavior = data || [];
    cautionCount = recentBehavior.filter((b) => b.type === "caution").length;
    rewardCount = recentBehavior.filter((b) => b.type === "reward").length;
  }

  // Gamification
  let statsRow: { total_points: number; current_streak: number } | null = null;
  if (childId) {
    const { data } = await supabase
      .from("student_stats")
      .select("total_points, current_streak")
      .eq("student_id", childId)
      .single();
    statsRow = data;
  }

  // Announcements
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

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const firstName = (profile?.full_name || "").split(" ")[0] || "Parent";

  const avgGrade = recentGrades.length > 0
    ? Math.round(recentGrades.reduce((s, g) => s + g.grade, 0) / recentGrades.length)
    : null;

  const childInitials = childProfile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

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
            <span className="font-libre">Welcome, </span>
            <span className="font-semibold">{firstName}</span>
          </h1>
        </div>
      </div>

      {!childId ? (
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white">No child linked yet</p>
          <p className="text-[13px] text-[#9A9A9A] mt-2 max-w-sm">
            Once your school administrator links your child's account, you'll see their grades, assignments, attendance and activity here.
          </p>
        </div>
      ) : (
        <>
          {/* Child profile strip */}
          <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#2D2D2D]/5 dark:bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
                {childProfile?.avatar_url ? (
                  <Image src={childProfile.avatar_url} alt={childProfile.full_name} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[16px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">{childInitials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[#2D2D2D] dark:text-white">{childProfile?.full_name || "Your child"}</p>
                <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">{childProfile?.email || ""}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {statsRow?.current_streak != null && statsRow.current_streak > 0 && (
                  <div className="text-center">
                    <p className="text-[18px] font-bold text-[#2D2D2D] dark:text-white">{statsRow.current_streak} 🔥</p>
                    <p className="text-[10px] font-bold text-[#9A9A9A]">streak</p>
                  </div>
                )}
                {avgGrade != null && (
                  <div className="text-center">
                    <p className="text-[18px] font-bold text-[#2D2D2D] dark:text-white">{avgGrade}%</p>
                    <p className="text-[10px] font-bold text-[#9A9A9A]">avg grade</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            {[
              { label: "Attendance", value: attendanceRate != null ? `${attendanceRate}%` : "—", color: attendanceRate != null && attendanceRate < 75 ? "text-red-500 dark:text-red-400" : "text-[#2D2D2D] dark:text-white" },
              { label: "Avg. Grade", value: avgGrade != null ? `${avgGrade}%` : "—", color: "text-[#2D2D2D] dark:text-white" },
              { label: "Pending", value: pendingAssignments.length.toString(), color: pendingAssignments.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-[#2D2D2D] dark:text-white" },
              { label: "Cautions", value: cautionCount.toString(), color: cautionCount > 0 ? "text-red-500 dark:text-red-400" : "text-[#2D2D2D] dark:text-white" },
            ].map((s) => (
              <div key={s.label} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center">
                <p className={`text-[22px] font-bold leading-tight ${s.color}`}>{s.value}</p>
                <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
            {/* Assignments card */}
            <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-0 px-4 pt-3 pb-2 shrink-0">
                <Image src="/Icons/black/assignments or tasks without noti black.svg" alt="" width={20} height={20} className="shrink-0 dark:invert" />
                <div className="w-px h-4 bg-gray-200 dark:bg-[#3D3D3D] mx-2.5" />
                <span className="text-[15px] font-semibold text-[#2D2D2D] dark:text-white">Pending Assignments</span>
                <div className="flex-1" />
                {pendingAssignments.length > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    {pendingAssignments.length}
                  </span>
                )}
              </div>
              <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10 shrink-0" />
              <div className="flex-1 overflow-y-auto min-h-0">
                {pendingAssignments.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-[13px] text-[#9A9A9A]">All assignments completed</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {pendingAssignments.map((a) => {
                      const overdue = new Date(a.due_date) < today;
                      return (
                        <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white truncate">{a.title}</p>
                            <p className="text-[11px] text-[#9A9A9A] mt-0.5">{a.subject}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-3 ${
                            overdue ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" : "bg-[#2D2D2D]/5 text-[#9A9A9A] dark:bg-white/5"
                          }`}>
                            {overdue ? "Overdue" : `Due ${new Date(a.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
              {/* Grades card */}
              <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-0 px-4 pt-3 pb-2 shrink-0">
                  <Image src="/Icons/black/grades black.svg" alt="" width={20} height={20} className="shrink-0 dark:invert" />
                  <div className="w-px h-4 bg-gray-200 dark:bg-[#3D3D3D] mx-2.5" />
                  <span className="text-[15px] font-semibold text-[#2D2D2D] dark:text-white">Recent Grades</span>
                </div>
                <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10 shrink-0" />
                <div className="flex-1 overflow-y-auto min-h-0">
                  {recentGrades.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-[13px] text-[#9A9A9A]">No grades yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                      {recentGrades.map((g) => (
                        <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white truncate">{g.assignment_title}</p>
                            <p className="text-[11px] text-[#9A9A9A]">{g.subject}</p>
                          </div>
                          <span className={`text-[15px] font-bold shrink-0 ml-3 ${
                            g.grade >= 70 ? "text-green-600 dark:text-green-400" : g.grade >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"
                          }`}>
                            {g.grade}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance mini card */}
              <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 shrink-0">
                <p className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wide mb-2">Attendance · 30 days</p>
                {attendanceRate != null ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[20px] font-bold text-[#2D2D2D] dark:text-white">{attendanceRate}%</p>
                      <div className="flex gap-2 text-[11px] font-bold">
                        <span className="text-green-600 dark:text-green-400">{presentCount}P</span>
                        <span className="text-amber-600 dark:text-amber-400">{lateCount}L</span>
                        <span className="text-red-500 dark:text-red-400">{absentCount}A</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${attendanceRate >= 90 ? "bg-green-500" : attendanceRate >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${attendanceRate}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-[#9A9A9A]">No records yet</p>
                )}
              </div>

              {/* Behaviour mini card */}
              {recentBehavior.length > 0 && (
                <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 shrink-0">
                  <p className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wide mb-2">Behaviour</p>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[16px] font-bold text-red-500 dark:text-red-400">{cautionCount}</p>
                      <p className="text-[10px] font-bold text-[#9A9A9A]">Cautions</p>
                    </div>
                    <div className="w-px h-8 bg-[#2D2D2D]/10 dark:bg-white/10" />
                    <div className="text-center">
                      <p className="text-[16px] font-bold text-green-600 dark:text-green-400">{rewardCount}</p>
                      <p className="text-[10px] font-bold text-[#9A9A9A]">Rewards</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Announcements */}
              {announcements.length > 0 && (
                <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col flex-1 min-h-0">
                  <div className="px-4 pt-3 pb-2 shrink-0">
                    <span className="text-[15px] font-semibold text-[#2D2D2D] dark:text-white">Announcements</span>
                  </div>
                  <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10 shrink-0" />
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                      {announcements.map((a) => (
                        <div key={a.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white leading-snug">{a.title}</p>
                            {a.priority === "urgent" && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shrink-0">Urgent</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-1 line-clamp-2">{a.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
