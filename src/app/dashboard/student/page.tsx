import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Clock, MessageCircle, Megaphone, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AssignmentsCard, ExamsCard, CalendarCard } from "./student-dashboard-client";

export default async function StudentDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch assignments assigned to this student (not completed)
  const { data: assignmentLinks } = await supabase
    .from("assignment_students")
    .select("assignment_id, completed_at")
    .eq("student_id", user.id);

  const pendingAssignmentIds = (assignmentLinks || [])
    .filter((l) => !l.completed_at)
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

  // Fetch exams assigned to this student
  const { data: examLinks } = await supabase
    .from("exam_students")
    .select("exam_id")
    .eq("student_id", user.id);

  const examIds = (examLinks || []).map((l) => l.exam_id);
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

  // Get teacher names
  const allTeacherIds = [...new Set([...myAssignments.map((a) => a.created_by), ...myExams.map((e) => e.created_by)].filter(Boolean))];
  let teacherMap: Record<string, string> = {};
  if (allTeacherIds.length > 0) {
    const { data: teachers } = await supabase.from("profiles").select("id, full_name").in("id", allTeacherIds);
    (teachers || []).forEach((t) => { teacherMap[t.id] = t.full_name || "Teacher"; });
  }

  // Fetch school_id from profile
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  // Fetch announcements
  let announcements: { id: string; title: string; content: string; priority: string; created_at: string }[] = [];
  if (studentProfile?.school_id) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, priority, created_at")
      .eq("school_id", studentProfile.school_id)
      .order("created_at", { ascending: false })
      .limit(3);
    announcements = data || [];
  }

  // Fetch timetable slots for today
  let todaySlots: { id: string; start_time: string; end_time: string; room: string | null; subject_name?: string }[] = [];
  if (studentProfile?.school_id) {
    const { data: enrollment } = await supabase
      .from("student_enrollments")
      .select("class_id")
      .eq("student_id", user.id)
      .single();

    if (enrollment?.class_id) {
      const todayDow = new Date().getDay();
      const { data: slots } = await supabase
        .from("timetable_slots")
        .select("id, start_time, end_time, room, class_subject_id")
        .eq("school_id", studentProfile.school_id)
        .eq("day_of_week", todayDow)
        .order("start_time", { ascending: true });

      if (slots && slots.length > 0) {
        // Get class_subjects for this student's class
        const csIds = slots.map(s => s.class_subject_id);
        const { data: classSubjects } = await supabase
          .from("class_subjects")
          .select("id, subject_id, class_id")
          .in("id", csIds)
          .eq("class_id", enrollment.class_id);

        const validCsIds = new Set((classSubjects || []).map(cs => cs.id));

        // Get subject names
        const subjectIds = (classSubjects || []).map(cs => cs.subject_id);
        let subjectMap: Record<string, string> = {};
        if (subjectIds.length > 0) {
          const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
          (subjects || []).forEach(s => { subjectMap[s.id] = s.name; });
        }

        const csSubjectMap: Record<string, string> = {};
        (classSubjects || []).forEach(cs => { csSubjectMap[cs.id] = subjectMap[cs.subject_id] || "Subject"; });

        todaySlots = slots
          .filter(s => validCsIds.has(s.class_subject_id))
          .map(s => ({ ...s, subject_name: csSubjectMap[s.class_subject_id] }));
      }
    }
  }

  const userName = user.user_metadata?.full_name?.split(" ")[0] || "there";

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-3">
      {/* Greeting */}
      <div className="shrink-0">
        <p className="text-xs text-gray-400">{dayNames[today.getDay()]}, {monthNames[today.getMonth()]} {today.getDate()}</p>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
      </div>

      {/* Main content: two columns */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ─── LEFT COLUMN ─── */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Assignments (wider) + Exams (narrower) */}
          <div className="grid grid-cols-5 gap-3 shrink-0">
            <div className="col-span-3">
              <AssignmentsCard assignments={myAssignments} teacherMap={teacherMap} studentId={user.id} />
            </div>
            <div className="col-span-2">
              <ExamsCard exams={myExams} teacherMap={teacherMap} />
            </div>
          </div>

          {/* Calendar takes remaining space */}
          <CalendarCard />
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div className="w-64 xl:w-72 shrink-0 flex flex-col gap-3">
          {/* Timetable */}
          <Card className="border-0 shadow-sm flex-1 min-h-0 flex flex-col">
            <CardHeader className="pb-2 px-4 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                    <Clock className="h-3.5 w-3.5 text-[#1e3a5f]" />
                  </div>
                  Timetable
                </CardTitle>
                <span className="text-[11px] font-semibold text-gray-500">{dayNames[today.getDay()]}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 px-4 pb-3 pt-1 overflow-y-auto">
              {todaySlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Calendar className="h-6 w-6 text-gray-200 mb-1.5" />
                  <p className="text-xs font-medium text-gray-400">No classes today</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">Schedule will appear here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {todaySlots.map((slot) => (
                    <div key={slot.id} className="rounded-lg border border-gray-100 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-800">{slot.subject_name}</p>
                      <p className="text-[10px] text-gray-400">
                        {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                        {slot.room && <span> · {slot.room}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="border-0 shadow-sm shrink-0">
            <CardHeader className="pb-1 px-4 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                    <MessageCircle className="h-3.5 w-3.5 text-[#1e3a5f]" />
                  </div>
                  Messages
                </CardTitle>
                <Link href="/dashboard/student/chat" className="text-[11px] font-medium text-[#1e3a5f] hover:text-[#1e3a5f]">
                  View all &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-1">
              <div className="flex flex-col items-center justify-center py-3 text-center">
                <MessageCircle className="h-5 w-5 text-gray-200 mb-1" />
                <p className="text-[11px] font-medium text-gray-400">No messages yet</p>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="border-0 shadow-sm shrink-0">
            <CardHeader className="pb-1 px-4 pt-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                  <Megaphone className="h-3.5 w-3.5 text-[#1e3a5f]" />
                </div>
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-1">
              {announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-3 text-center">
                  <Megaphone className="h-5 w-5 text-gray-200 mb-1" />
                  <p className="text-[11px] font-medium text-gray-400">No announcements</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {announcements.map((a) => (
                    <div key={a.id} className="rounded-lg border border-gray-100 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">{a.title}</p>
                        {a.priority === "urgent" && (
                          <span className="text-[8px] font-bold uppercase bg-red-50 text-red-600 px-1 py-0.5 rounded shrink-0">Urgent</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">{a.content}</p>
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
