import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  AssignmentsCard,
  ExamsCard,
  ScheduleCard,
  PlannerCard,
  AnnouncementsCard,
} from "./student-dashboard-client";

export default async function StudentDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch student profile
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("school_id, full_name")
    .eq("id", user.id)
    .single();

  const schoolId = studentProfile?.school_id;

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

  // Fetch assignments assigned to this student
  const { data: assignmentLinks } = await supabase
    .from("assignment_students")
    .select("assignment_id, completed_at")
    .eq("student_id", user.id);

  const pendingAssignmentIds = (assignmentLinks || [])
    .filter((l) => !l.completed_at)
    .map((l) => l.assignment_id);

  const completedAssignmentIds = (assignmentLinks || [])
    .filter((l) => l.completed_at)
    .map((l) => l.assignment_id);

  let myAssignments: { id: string; title: string; subject: string; class_name: string; due_date: string; status: string; created_by: string }[] = [];
  if (pendingAssignmentIds.length > 0) {
    const { data } = await supabase
      .from("assignments")
      .select("id, title, subject, class_name, due_date, status, created_by")
      .in("id", pendingAssignmentIds)
      .eq("status", "active")
      .order("due_date", { ascending: true });
    myAssignments = data || [];
  }

  // Fetch completed assignments (for filler slots)
  let completedAssignments: { id: string; title: string; subject: string; due_date: string; created_by: string }[] = [];
  if (completedAssignmentIds.length > 0) {
    const { data } = await supabase
      .from("assignments")
      .select("id, title, subject, due_date, created_by")
      .in("id", completedAssignmentIds)
      .order("due_date", { ascending: false })
      .limit(4);
    completedAssignments = data || [];
  }

  // Fetch graded submissions for Grades tab
  const { data: gradedSubmissions } = await supabase
    .from("submissions")
    .select("id, grade, feedback, assignment_id")
    .eq("student_id", user.id)
    .eq("status", "graded")
    .order("submitted_at", { ascending: false })
    .limit(4);

  let gradedItems: { id: string; assignment_title: string; subject: string; grade: number; feedback: string | null; created_by: string }[] = [];
  if (gradedSubmissions && gradedSubmissions.length > 0) {
    const gradeAssignmentIds = [...new Set(gradedSubmissions.map((s) => s.assignment_id))];
    const { data: gradeAssignments } = await supabase
      .from("assignments")
      .select("id, title, subject, created_by")
      .in("id", gradeAssignmentIds);
    const gaMap: Record<string, { title: string; subject: string; created_by: string }> = {};
    (gradeAssignments || []).forEach((a) => { gaMap[a.id] = { title: a.title, subject: a.subject, created_by: a.created_by }; });
    gradedItems = gradedSubmissions
      .filter((s) => s.grade != null && gaMap[s.assignment_id])
      .map((s) => ({
        id: s.id,
        assignment_title: gaMap[s.assignment_id].title,
        subject: gaMap[s.assignment_id].subject,
        grade: s.grade!,
        feedback: s.feedback,
        created_by: gaMap[s.assignment_id].created_by,
      }));
  }

  // Fetch exams assigned to this student (including marked_done status)
  const { data: examLinks } = await supabase
    .from("exam_students")
    .select("exam_id, marked_done")
    .eq("student_id", user.id);

  const examIds = (examLinks || []).map((l) => l.exam_id);
  const doneExamIds = (examLinks || []).filter((l) => l.marked_done).map((l) => l.exam_id);
  let myExams: { id: string; title: string; subject: string; class_name: string; exam_date: string; duration_minutes: number; created_by: string }[] = [];
  if (examIds.length > 0) {
    const { data } = await supabase
      .from("exams")
      .select("id, title, subject, class_name, exam_date, duration_minutes, created_by")
      .in("id", examIds)
      .eq("status", "scheduled")
      .order("exam_date", { ascending: true });
    myExams = data || [];
  }

  // Get all teacher IDs needed
  const allTeacherIds = [...new Set([
    ...myAssignments.map((a) => a.created_by),
    ...completedAssignments.map((a) => a.created_by),
    ...gradedItems.map((g) => g.created_by),
    ...myExams.map((e) => e.created_by),
  ].filter(Boolean))];

  let teacherMap: Record<string, string> = {};
  if (allTeacherIds.length > 0) {
    const { data: teachers } = await supabase.from("profiles").select("id, full_name").in("id", allTeacherIds);
    (teachers || []).forEach((t) => { teacherMap[t.id] = t.full_name || "Teacher"; });
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

  // Fetch timetable slots for all days (for schedule navigation)
  let slotsMap: Record<number, { id: string; start_time: string; end_time: string; room: string | null; subject_name?: string; teacher_name?: string }[]> = {};
  if (schoolId) {
    const { data: enrollment } = await supabase
      .from("student_enrollments")
      .select("class_id")
      .eq("student_id", user.id)
      .single();

    if (enrollment?.class_id) {
      const { data: slots } = await supabase
        .from("timetable_slots")
        .select("id, start_time, end_time, room, class_subject_id, day_of_week")
        .eq("school_id", schoolId)
        .order("start_time", { ascending: true });

      if (slots && slots.length > 0) {
        const csIds = [...new Set(slots.map(s => s.class_subject_id))];
        const { data: classSubjects } = await supabase
          .from("class_subjects")
          .select("id, subject_id, class_id, teacher_id")
          .in("id", csIds)
          .eq("class_id", enrollment.class_id);

        const validCsIds = new Set((classSubjects || []).map(cs => cs.id));

        // Get subject names
        const subjectIds = [...new Set((classSubjects || []).map(cs => cs.subject_id))];
        let subjectMap: Record<string, string> = {};
        if (subjectIds.length > 0) {
          const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
          (subjects || []).forEach(s => { subjectMap[s.id] = s.name; });
        }

        // Get teacher names for timetable
        const ttTeacherIds = [...new Set((classSubjects || []).map(cs => cs.teacher_id).filter(Boolean))];
        let ttTeacherMap: Record<string, string> = {};
        if (ttTeacherIds.length > 0) {
          const { data: ttTeachers } = await supabase.from("profiles").select("id, full_name").in("id", ttTeacherIds);
          (ttTeachers || []).forEach(t => { ttTeacherMap[t.id] = t.full_name || "Teacher"; });
        }

        const csMap: Record<string, { subject: string; teacher: string }> = {};
        (classSubjects || []).forEach(cs => {
          csMap[cs.id] = {
            subject: subjectMap[cs.subject_id] || "Subject",
            teacher: ttTeacherMap[cs.teacher_id] || "",
          };
        });

        slots
          .filter(s => validCsIds.has(s.class_subject_id))
          .forEach(s => {
            const dow = s.day_of_week;
            if (!slotsMap[dow]) slotsMap[dow] = [];
            slotsMap[dow].push({
              id: s.id,
              start_time: s.start_time,
              end_time: s.end_time,
              room: s.room,
              subject_name: csMap[s.class_subject_id]?.subject,
              teacher_name: csMap[s.class_subject_id]?.teacher,
            });
          });
      }
    }
  }

  // Build planner tasks from pending assignments
  const plannerTasks = myAssignments.map((a) => ({
    id: a.id,
    title: a.title,
    subject: a.subject,
    teacher_name: teacherMap[a.created_by] || "Teacher",
    due_date: a.due_date,
  }));

  // Fetch gamification stats
  const { data: statsRow } = await supabase
    .from("student_stats")
    .select("total_points, current_streak, longest_streak, lives")
    .eq("student_id", user.id)
    .single();

  // Fetch recent behavior events (for student to see their own)
  const { data: recentBehavior } = await supabase
    .from("behavior_events")
    .select("id, type, reason, points, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // Fetch attendance rate (last 30 days)
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const { data: myAttendance } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", user.id)
    .gte("date", thirtyAgo.toISOString().split("T")[0]);
  const attTotal = (myAttendance || []).length;
  const attPresent = (myAttendance || []).filter((a) => a.status === "present").length;
  const attendanceRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;

  // Vacation countdown — use events table if available
  let vacationDays: number | null = null;
  if (schoolId) {
    const { data: events } = await supabase
      .from("events")
      .select("start_date")
      .eq("school_id", schoolId)
      .eq("event_type", "holiday")
      .gte("start_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: true })
      .limit(1);
    if (events && events.length > 0) {
      const nextVac = new Date(events[0].start_date);
      const now = new Date();
      vacationDays = Math.ceil((nextVac.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  const userName = studentProfile?.full_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "there";

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

      {/* ─── MAIN GRID ─── */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Assignments + Exams row */}
          <div className="flex flex-col sm:flex-row gap-3 flex-[2] min-h-0">
            <div className="flex-[3] min-w-0">
              <AssignmentsCard
                assignments={myAssignments}
                completedAssignments={completedAssignments}
                gradedItems={gradedItems}
                teacherMap={teacherMap}
                studentId={user.id}
              />
            </div>
            <div className="flex-[2] min-w-0">
              <ExamsCard exams={myExams} teacherMap={teacherMap} studentId={user.id} doneExamIds={doneExamIds} />
            </div>
          </div>

          {/* Planner */}
          <div className="flex-1 min-h-0">
            <PlannerCard tasks={plannerTasks} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
          {/* Schedule — matches assignments/exams height */}
          <div className="flex-[2] min-h-0">
            <ScheduleCard slots={slotsMap} initialDayOffset={0} />
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="dash-card dark:border-[#2D2D2D] dark:bg-[#333333] rounded-2xl px-3 py-3">
              <p className="text-[20px] font-bold text-[#2D2D2D] dark:text-white leading-tight">
                {statsRow?.current_streak ?? 0}
                <span className="ml-1">🔥</span>
              </p>
              <p className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Day streak</p>
            </div>
            <div className="dash-card dark:border-[#2D2D2D] dark:bg-[#333333] rounded-2xl px-3 py-3">
              <p className="text-[20px] font-bold text-[#2D2D2D] dark:text-white leading-tight">
                {attendanceRate !== null ? `${attendanceRate}%` : "—"}
              </p>
              <p className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Attendance</p>
            </div>
          </div>
          {/* Vacation countdown */}
          {vacationDays !== null && (
            <div className="dash-card dark:border-[#2D2D2D] dark:bg-[#333333] rounded-2xl px-4 py-3 shrink-0">
              <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">
                <span className="mr-1">🌴</span>
                {`Next vacation in ${vacationDays} days`}
              </p>
            </div>
          )}

          {/* Announcements */}
          <div className="flex-1 min-h-0">
            <AnnouncementsCard announcements={announcementsWithAuthors} />
          </div>

        </div>
      </div>
    </div>
  );
}
