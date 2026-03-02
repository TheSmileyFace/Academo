import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import StudentProfileClient from "./student-profile-client";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;

  // Fetch student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, bio, created_at, school_id")
    .eq("id", id)
    .single();

  if (!profile || profile.role !== "student") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-[14px] text-[#9A9A9A]">Student not found</p>
        <Link href="/dashboard/teacher/students" className="mt-3 text-[13px] font-semibold text-[#2D2D2D] dark:text-white">
          ← Back to Students
        </Link>
      </div>
    );
  }

  // Fetch enrollment (class info)
  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("class_id, classes(name, year_groups(name))")
    .eq("student_id", id)
    .single();

  const cls = enrollment?.classes as any;
  const className = cls ? `${cls?.year_groups?.name || ""} ${cls?.name || ""}`.trim() : null;

  // Fetch submissions for this student (all, ordered recent first)
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, status, grade, feedback, submitted_at, assignment_id")
    .eq("student_id", id)
    .order("submitted_at", { ascending: false })
    .limit(20);

  // Get assignment details for submissions
  let subsWithDetails: any[] = [];
  if (submissions && submissions.length > 0) {
    const assignmentIds = [...new Set(submissions.map((s) => s.assignment_id))];
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, title, subject, due_date, created_by")
      .in("id", assignmentIds);

    // Only show assignments from this teacher
    const myAssignments = (assignments || []).filter((a) => a.created_by === user.id);
    const myAssignmentIds = new Set(myAssignments.map((a) => a.id));
    const assignmentMap: Record<string, any> = {};
    myAssignments.forEach((a) => { assignmentMap[a.id] = a; });

    subsWithDetails = submissions
      .filter((s) => myAssignmentIds.has(s.assignment_id))
      .map((s) => ({
        id: s.id,
        status: s.status,
        grade: s.grade,
        feedback: s.feedback,
        submitted_at: s.submitted_at,
        assignment_title: assignmentMap[s.assignment_id]?.title || "Assignment",
        subject: assignmentMap[s.assignment_id]?.subject || "",
        due_date: assignmentMap[s.assignment_id]?.due_date || "",
      }));
  }

  // Stats
  const totalSubmissions = subsWithDetails.length;
  const gradedSubs = subsWithDetails.filter((s) => s.status === "graded" && s.grade != null);
  const avgGrade = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum, s) => sum + s.grade, 0) / gradedSubs.length)
    : null;
  const pendingCount = subsWithDetails.filter((s) => s.status === "submitted").length;

  // Attendance (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("id, date, status, notes")
    .eq("student_id", id)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false });

  const attendanceData = attendanceRows || [];
  const presentCount = attendanceData.filter((a) => a.status === "present").length;
  const absentCount = attendanceData.filter((a) => a.status === "absent").length;
  const lateCount = attendanceData.filter((a) => a.status === "late").length;
  const attendancePct = attendanceData.length > 0
    ? Math.round((presentCount / attendanceData.length) * 100)
    : null;

  // Behavior events
  const { data: behaviorRows } = await supabase
    .from("behavior_events")
    .select("id, type, reason, points, created_at, created_by")
    .eq("student_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get creator names for behavior events
  const behaviorCreatorIds = [...new Set((behaviorRows || []).map((b) => b.created_by).filter(Boolean))];
  let creatorMap: Record<string, string> = {};
  if (behaviorCreatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", behaviorCreatorIds);
    (creators || []).forEach((c) => { creatorMap[c.id] = c.full_name; });
  }

  const behaviorData = (behaviorRows || []).map((b) => ({
    ...b,
    creator_name: creatorMap[b.created_by] || "Teacher",
  }));

  const totalCautions = behaviorData.filter((b) => b.type === "caution").length;
  const totalRewards = behaviorData.filter((b) => b.type === "reward").length;
  const totalPoints = behaviorData.filter((b) => b.type === "reward").reduce((sum, b) => sum + (b.points || 0), 0);

  // Gamification stats
  const { data: statsRow } = await supabase
    .from("student_stats")
    .select("total_points, current_streak, longest_streak, lives")
    .eq("student_id", id)
    .single();

  const initials = profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Back nav */}
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <Link href="/dashboard/teacher/students" className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors">
          ← Students
        </Link>
      </div>

      {/* Profile header card */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-6 py-5 shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#2D2D2D]/5 dark:bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name} width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[22px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{profile.full_name}</h1>
            <p className="text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{profile.email}</p>
            {className && (
              <span className="inline-block mt-1.5 text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] bg-[#2D2D2D]/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
                {className}
              </span>
            )}
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-3 shrink-0">
            {statsRow?.current_streak != null && statsRow.current_streak > 0 && (
              <div className="text-center">
                <p className="text-[20px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{statsRow.current_streak}</p>
                <p className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">🔥 streak</p>
              </div>
            )}
            {avgGrade != null && (
              <div className="text-center">
                <p className="text-[20px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{avgGrade}%</p>
                <p className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">avg grade</p>
              </div>
            )}
          </div>
        </div>
        {profile.bio && (
          <p className="mt-3 text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] leading-relaxed border-t border-[#2D2D2D]/5 dark:border-white/5 pt-3">{profile.bio}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Submissions", value: totalSubmissions.toString() },
          { label: "Avg. Grade", value: avgGrade != null ? `${avgGrade}%` : "—" },
          { label: "Attendance", value: attendancePct != null ? `${attendancePct}%` : "—" },
          { label: "Cautions", value: totalCautions.toString() },
        ].map((stat) => (
          <div key={stat.label} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center">
            <p className="text-[22px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{stat.value}</p>
            <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main content area — passes data to client for interactivity */}
      <StudentProfileClient
        studentId={id}
        teacherId={user.id}
        submissions={subsWithDetails}
        attendanceData={attendanceData}
        behaviorData={behaviorData}
        pendingCount={pendingCount}
        totalCautions={totalCautions}
        totalRewards={totalRewards}
        totalPoints={totalPoints}
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
      />
    </div>
  );
}
