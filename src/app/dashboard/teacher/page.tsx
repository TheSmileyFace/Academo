import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  TeacherAssignmentsCard,
  TeacherSubmissionsCard,
  TeacherScheduleCard,
  TeacherStatsRow,
  TeacherAnnouncementsCard,
  TeacherQuickActions,
} from "./teacher-dashboard-client";

export default async function TeacherDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, subject_id, full_name")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Fetch school name
  let schoolName = "";
  if (schoolId) {
    const { data: school } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();
    schoolName = school?.name || "";
  }

  // Fetch all assignments by this teacher
  const { data: allAssignments } = await supabase
    .from("assignments")
    .select("id, title, subject, class_name, due_date, status, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const recentAssignments = allAssignments || [];

  // Fetch student completion data for these assignments
  const dashboardAssignmentIds = recentAssignments.map((a) => a.id);
  const studentStatusMap: Record<string, { total: number; completed: number }> = {};
  if (dashboardAssignmentIds.length > 0) {
    const { data: links } = await supabase
      .from("assignment_students")
      .select("assignment_id, completed_at")
      .in("assignment_id", dashboardAssignmentIds);

    if (links) {
      links.forEach((l) => {
        if (!studentStatusMap[l.assignment_id]) {
          studentStatusMap[l.assignment_id] = { total: 0, completed: 0 };
        }
        studentStatusMap[l.assignment_id].total++;
        if (l.completed_at) studentStatusMap[l.assignment_id].completed++;
      });
    }
  }

  const dashboardAssignments = recentAssignments.map((a) => ({
    ...a,
    totalStudents: studentStatusMap[a.id]?.total || 0,
    completedStudents: studentStatusMap[a.id]?.completed || 0,
  }));

  // Fetch submissions for this teacher's assignments
  const assignmentIds = recentAssignments.map((a) => a.id);
  let submissionRows: { id: string; studentId: string; studentName: string; assignmentTitle: string; subject: string; status: string; grade: number | null; submittedAt: string }[] = [];
  let pendingSubmissionCount = 0;
  let avgGrade: number | null = null;

  if (assignmentIds.length > 0) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("id, student_id, assignment_id, status, grade, submitted_at")
      .in("assignment_id", assignmentIds)
      .order("submitted_at", { ascending: false })
      .limit(10);

    const submissions = subs || [];
    pendingSubmissionCount = submissions.filter((s) => s.status === "submitted").length;
    const gradedSubs = submissions.filter((s) => s.status === "graded" && s.grade != null);
    avgGrade = gradedSubs.length > 0
      ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubs.length)
      : null;

    // Get student names
    const studentIds = [...new Set(submissions.map((s) => s.student_id))];
    let studentMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const { data: students } = await supabase.from("profiles").select("id, full_name").in("id", studentIds);
      (students || []).forEach((s) => { studentMap[s.id] = s.full_name; });
    }

    const assignmentMap: Record<string, { title: string; subject: string }> = {};
    recentAssignments.forEach((a) => { assignmentMap[a.id] = { title: a.title, subject: a.subject }; });

    submissionRows = submissions.map((s) => ({
      id: s.id,
      studentId: s.student_id,
      studentName: studentMap[s.student_id] || "Unknown",
      assignmentTitle: assignmentMap[s.assignment_id]?.title || "Assignment",
      subject: assignmentMap[s.assignment_id]?.subject || "",
      status: s.status,
      grade: s.grade,
      submittedAt: s.submitted_at,
    }));
  }

  // Count total students taught (via class_subjects → student_enrollments)
  let totalStudents = 0;
  if (schoolId) {
    const { data: cs } = await supabase
      .from("class_subjects")
      .select("class_id")
      .eq("teacher_id", user.id);
    const classIds = [...new Set((cs || []).map((c) => c.class_id))];
    if (classIds.length > 0) {
      const { count } = await supabase
        .from("student_enrollments")
        .select("id", { count: "exact", head: true })
        .in("class_id", classIds);
      totalStudents = count || 0;
    }
  }

  // Fetch teacher's timetable (via class_subjects where teacher_id = user.id)
  let slotsMap: Record<number, { id: string; start_time: string; end_time: string; room: string | null; subject_name?: string; class_name?: string }[]> = {};
  if (schoolId) {
    const { data: teacherCS } = await supabase
      .from("class_subjects")
      .select("id, subject_id, class_id")
      .eq("teacher_id", user.id);

    if (teacherCS && teacherCS.length > 0) {
      const csIds = teacherCS.map((cs) => cs.id);
      const { data: slots } = await supabase
        .from("timetable_slots")
        .select("id, start_time, end_time, room, class_subject_id, day_of_week")
        .eq("school_id", schoolId)
        .in("class_subject_id", csIds)
        .order("start_time", { ascending: true });

      // Get subject names
      const subjectIds = [...new Set(teacherCS.map((cs) => cs.subject_id))];
      let subjectMap: Record<string, string> = {};
      if (subjectIds.length > 0) {
        const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
        (subjects || []).forEach((s) => { subjectMap[s.id] = s.name; });
      }

      // Get class names
      const classIds = [...new Set(teacherCS.map((cs) => cs.class_id))];
      let classMap: Record<string, string> = {};
      if (classIds.length > 0) {
        const { data: classes } = await supabase.from("classes").select("id, name").in("id", classIds);
        (classes || []).forEach((c) => { classMap[c.id] = c.name; });
      }

      const csMap: Record<string, { subject: string; className: string }> = {};
      teacherCS.forEach((cs) => {
        csMap[cs.id] = {
          subject: subjectMap[cs.subject_id] || "Subject",
          className: classMap[cs.class_id] || "",
        };
      });

      (slots || []).forEach((s) => {
        const dow = s.day_of_week;
        if (!slotsMap[dow]) slotsMap[dow] = [];
        slotsMap[dow].push({
          id: s.id,
          start_time: s.start_time,
          end_time: s.end_time,
          room: s.room,
          subject_name: csMap[s.class_subject_id]?.subject,
          class_name: csMap[s.class_subject_id]?.className,
        });
      });
    }
  }

  // Fetch announcements
  let announcements: { id: string; title: string; content: string; priority: string; created_at: string; created_by: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, priority, created_at, created_by")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(3);
    announcements = data || [];
  }

  // Get announcement author names
  const announcementAuthorIds = [...new Set(announcements.map((a) => a.created_by).filter(Boolean))];
  let authorMap: Record<string, string> = {};
  if (announcementAuthorIds.length > 0) {
    const { data: authors } = await supabase.from("profiles").select("id, full_name").in("id", announcementAuthorIds);
    (authors || []).forEach((a) => { authorMap[a.id] = a.full_name || "Admin"; });
  }

  const announcementsWithAuthors = announcements.map((a) => ({
    ...a,
    author_name: authorMap[a.created_by] || undefined,
  }));

  const userName = profile?.full_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "there";

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ─── TOP BAR ─── */}
      <div className="flex items-start justify-between shrink-0" style={{ paddingTop: 23 }}>
        <div>
          <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">
            {dayNames[today.getDay()]}, {today.getDate()} {monthNames[today.getMonth()]}
          </p>
          <h1 className="text-[22px] leading-tight mt-0.5 text-[#2d2d2d] dark:text-white" style={{ marginTop: 0 }}>
            <span className="mr-1">👋</span>
            <span className="font-libre">Welcome back, </span>
            <span className="font-semibold">{userName}</span>
          </h1>
        </div>
        {schoolName && (
          <div className="dash-card dark:border-[#2D2D2D] dark:bg-[#333333] rounded-xl px-4 py-2.5 flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#2D2D2D] shrink-0" />
            <span className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{schoolName}</span>
          </div>
        )}
      </div>

      {/* ─── STATS + QUICK ACTIONS ─── */}
      <TeacherStatsRow
        totalStudents={totalStudents}
        totalAssignments={recentAssignments.length}
        pendingSubmissions={pendingSubmissionCount}
        avgGrade={avgGrade}
      />

      {/* ─── MAIN GRID ─── */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Assignments + Submissions row */}
          <div className="flex flex-col sm:flex-row gap-3 flex-[2] min-h-0">
            <div className="flex-[3] min-w-0">
              <TeacherAssignmentsCard assignments={dashboardAssignments} />
            </div>
            <div className="flex-[2] min-w-0">
              <TeacherSubmissionsCard submissions={submissionRows} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="shrink-0">
            <TeacherQuickActions />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
          {/* Schedule */}
          <div className="flex-[2] min-h-0">
            <TeacherScheduleCard slots={slotsMap} />
          </div>

          {/* Announcements */}
          <div className="flex-1 min-h-0">
            <TeacherAnnouncementsCard announcements={announcementsWithAuthors} />
          </div>
        </div>
      </div>
    </div>
  );
}
