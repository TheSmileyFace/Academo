"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  due_date: string;
  status: string;
  created_at: string;
  totalStudents?: number;
  completedStudents?: number;
}

interface SubmissionRow {
  id: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  subject: string;
  status: string;
  grade: number | null;
  submittedAt: string;
}

interface TimetableSlot {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_name?: string;
  class_name?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  author_name?: string;
}

/* ─── Assignments Card with Active/Closed tabs ─── */
export function TeacherAssignmentsCard({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  const now = new Date();

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  const isOverdue = (d: string) => new Date(d) < now;

  const activeAssignments = assignments.filter((a) => a.status === "active");
  const closedAssignments = assignments.filter((a) => a.status === "closed");

  const list = activeTab === "active" ? activeAssignments : closedAssignments;

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-0 px-4 pt-3 pb-2">
        <Image src="/Icons/black/assignments or tasks without noti black.svg" alt="" width={24} height={24} className="shrink-0 dark:invert" />
        <div className="w-px h-4 bg-gray-300 dark:bg-[#3D3D3D] mx-2.5" />
        <button
          onClick={() => setActiveTab("active")}
          className={`text-[16px] font-semibold transition-colors ${activeTab === "active" ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white"}`}
        >
          Active
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={`text-[16px] font-semibold ml-4 transition-colors ${activeTab === "closed" ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white"}`}
        >
          Closed
        </button>
        <div className="flex-1" />
        <span className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] tabular-nums">
          {activeAssignments.length} active
        </span>
      </div>
      <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10" />

      {/* Content */}
      <div className="flex-1 px-4 pb-2 flex flex-col min-h-0">
        <div className="flex-1">
          {list.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-sm text-[#9A9A9A] dark:text-[#A0A0A0]">
                {activeTab === "active" ? "No active assignments" : "No closed assignments"}
              </p>
            </div>
          ) : (
            list.slice(0, 4).map((a) => {
              const overdue = activeTab === "active" && isOverdue(a.due_date);
              const total = a.totalStudents || 0;
              const completed = a.completedStudents || 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              
              return (
                <div key={a.id}>
                  <Link
                    href={`/dashboard/teacher/assignments`}
                    className="flex flex-col justify-center px-2 hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02] transition-colors group"
                    style={{ height: 80 }}
                  >
                    <div className="flex items-start justify-between min-w-0">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-[14px] font-bold text-[#2D2D2D] dark:text-white truncate">{a.title}</p>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-[#9A9A9A] dark:text-[#A0A0A0] mt-1">
                          <span>{a.subject}</span>
                          {a.class_name && (
                            <>
                              <span>•</span>
                              <span>{a.class_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Due {fmt(a.due_date)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        {overdue && (
                          <span className="text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">
                            Overdue
                          </span>
                        )}
                        {activeTab === "closed" && (
                          <span className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] bg-[#2D2D2D]/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-[#2D2D2D] dark:bg-white transition-all duration-500 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#2D2D2D] dark:text-white shrink-0 min-w-[32px] text-right">
                        {completed}/{total}
                      </span>
                    </div>
                  </Link>
                  <div className="-mx-4 h-px bg-[#2D2D2D]/5 dark:bg-white/5" />
                </div>
              );
            })
          )}
        </div>
        <div className="-mx-4 h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
        <Link href="/dashboard/teacher/assignments" className="block text-center text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors py-2">
          View all ↓
        </Link>
      </div>
    </div>
  );
}

/* ─── Submissions Card ─── */
export function TeacherSubmissionsCard({
  submissions,
}: {
  submissions: SubmissionRow[];
}) {
  const [activeTab, setActiveTab] = useState<"pending" | "graded">("pending");

  const pending = submissions.filter((s) => s.status === "submitted");
  const graded = submissions.filter((s) => s.status === "graded");
  const list = activeTab === "pending" ? pending : graded;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-0 px-4 pt-3 pb-2">
        <Image src="/Icons/black/exams black.svg" alt="" width={24} height={24} className="shrink-0 dark:invert" />
        <div className="w-px h-4 bg-gray-300 dark:bg-[#3D3D3D] mx-2.5" />
        <button
          onClick={() => setActiveTab("pending")}
          className={`text-[16px] font-semibold transition-colors ${activeTab === "pending" ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white"}`}
        >
          To Grade
        </button>
        <button
          onClick={() => setActiveTab("graded")}
          className={`text-[16px] font-semibold ml-4 transition-colors ${activeTab === "graded" ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white"}`}
        >
          Graded
        </button>
        <div className="flex-1" />
        {pending.length > 0 && (
          <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
            {pending.length} pending
          </span>
        )}
      </div>
      <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10" />

      <div className="flex-1 px-4 pb-2 flex flex-col min-h-0">
        <div className="flex-1">
          {list.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-sm text-[#9A9A9A] dark:text-[#A0A0A0]">
                {activeTab === "pending" ? "No submissions to grade" : "No graded submissions"}
              </p>
            </div>
          ) : (
            list.slice(0, 4).map((s) => (
              <div key={s.id}>
                <Link
                  href="/dashboard/teacher/submissions"
                  className="flex items-center justify-between hover:opacity-80 transition-opacity"
                  style={{ height: 73 }}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white truncate">{s.assignmentTitle}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                      <Link href={`/dashboard/teacher/students/${s.studentId}`} className="flex items-center gap-0.5 hover:text-[#2D2D2D] dark:hover:text-white hover:underline">
                        {s.studentName}
                      </Link>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        {fmt(s.submittedAt)}
                      </span>
                    </div>
                  </div>
                  {s.grade != null && (
                    <span className="text-[16px] font-bold text-[#2D2D2D] dark:text-white shrink-0">{s.grade}%</span>
                  )}
                </Link>
                <div className="-mx-4 h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
              </div>
            ))
          )}
        </div>
        <div className="-mx-4 h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
        <Link href="/dashboard/teacher/submissions" className="block text-center text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors py-2">
          View all ↓
        </Link>
      </div>
    </div>
  );
}

/* ─── Schedule Card ─── */
export function TeacherScheduleCard({
  slots,
}: {
  slots: Record<number, TimetableSlot[]>;
}) {
  const [dayOffset, setDayOffset] = useState(0);
  const today = new Date();
  const viewDate = new Date(today);
  viewDate.setDate(viewDate.getDate() + dayOffset);
  const dow = viewDate.getDay();
  const currentSlots = slots[dow] || [];

  const isWeekend = dow === 0 || dow === 6;
  const isToday = dayOffset === 0;

  const dayLabel = isToday
    ? "Today"
    : viewDate.toLocaleDateString("en-GB", { weekday: "long" });

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col h-full">
      <div className="flex items-center gap-0 px-4 pt-3 pb-1">
        <Image src="/Icons/black/schedule black.svg" alt="" width={24} height={24} className="shrink-0 dark:invert" />
        <div className="w-px h-4 bg-gray-300 dark:bg-[#3D3D3D] mx-2.5" />
        <span className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white">Schedule</span>
      </div>
      <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
      <div className="flex items-center justify-between px-4 py-1.5">
        <button onClick={() => setDayOffset((d) => d - 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2D2D2D] rounded transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 text-[#9A9A9A]" />
        </button>
        <span className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{dayLabel}</span>
        <button onClick={() => setDayOffset((d) => d + 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2D2D2D] rounded transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-[#9A9A9A]" />
        </button>
      </div>
      <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
      <div className="flex-1 px-4 pb-3 overflow-y-auto min-h-0">
        {isWeekend || currentSlots.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0]">{isWeekend ? "No school today" : "No classes scheduled"}</p>
          </div>
        ) : (
          <div>
            {currentSlots.map((slot) => (
              <div key={slot.id}>
                <div className="flex items-center gap-3 py-2.5">
                  <span className="text-[13px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] w-10 shrink-0 tabular-nums">{slot.start_time?.slice(0, 5)}</span>
                  <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white truncate flex-1 min-w-0">{slot.subject_name || "Class"}</p>
                  {slot.class_name && (
                    <span className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] shrink-0">{slot.class_name}</span>
                  )}
                </div>
                <div className="-mx-4 h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stats Row ─── */
export function TeacherStatsRow({
  totalStudents,
  totalAssignments,
  pendingSubmissions,
  avgGrade,
}: {
  totalStudents: number;
  totalAssignments: number;
  pendingSubmissions: number;
  avgGrade: number | null;
}) {
  const stats = [
    { label: "Students", value: totalStudents.toString() },
    { label: "Assignments", value: totalAssignments.toString() },
    { label: "To Grade", value: pendingSubmissions.toString() },
    { label: "Avg. Grade", value: avgGrade !== null ? `${avgGrade}%` : "—" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center"
        >
          <p className="text-[22px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{s.value}</p>
          <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Announcements Card ─── */
export function TeacherAnnouncementsCard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 6) return `${diffDays} days ago`;
    if (diffDays <= 13) return "1 week ago";
    if (diffDays <= 35) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "2-digit" });
  };

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-0 px-4 pt-3 pb-2">
        <Image src="/Icons/black/home black.svg" alt="" width={24} height={24} className="shrink-0 dark:invert" />
        <div className="w-px h-4 bg-gray-300 dark:bg-[#3D3D3D] mx-2.5" />
        <span className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white">Announcements</span>
      </div>
      <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
      <div className="flex-1 px-4 pb-2 flex flex-col min-h-0">
        {announcements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0]">No announcements</p>
          </div>
        ) : (
          <div className="flex-1">
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id}>
                <div className="cursor-pointer hover:opacity-80 transition-opacity py-2">
                  <p className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white leading-snug line-clamp-2">{a.title}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                    {a.author_name && (
                      <span className="flex items-center gap-0.5">
                        <Image src="/Icons/grey/teacher:person.svg" alt="" width={10} height={10} />
                        {a.author_name}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />
                      {formatDate(a.created_at)}
                    </span>
                    {a.priority !== "normal" && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        a.priority === "urgent" ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                      }`}>
                        {a.priority}
                      </span>
                    )}
                  </div>
                </div>
                <div className="-mx-4 h-px bg-[#2D2D2D]/10 dark:bg-white/10" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Quick Actions Row ─── */
export function TeacherQuickActions() {
  const actions = [
    { label: "Create Assignment", href: "/dashboard/teacher/create" },
    { label: "Schedule Exam", href: "/dashboard/teacher/create-exam" },
    { label: "My Students", href: "/dashboard/teacher/students" },
    { label: "Attendance", href: "/dashboard/teacher/attendance" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
        >
          <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{a.label}</p>
        </Link>
      ))}
    </div>
  );
}
