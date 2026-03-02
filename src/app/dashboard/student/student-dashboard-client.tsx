"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  due_date: string;
  status: string;
  created_by: string;
}

interface CompletedAssignment {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  created_by: string;
}

interface GradedItem {
  id: string;
  assignment_title: string;
  subject: string;
  grade: number;
  feedback: string | null;
  created_by: string;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  exam_date: string;
  duration_minutes: number;
  created_by: string;
}

interface TimetableSlot {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_name?: string;
  teacher_name?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  author_name?: string;
}

interface PlannerTask {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  due_date: string;
}

/* ─── Done Button Component ─── */
function DoneButton({
  done,
  overdue,
  onClick,
  disabled,
}: {
  done: boolean;
  overdue: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  let bg = "#2D2D2D";
  if (done) bg = "linear-gradient(to top, #12E43C, #2D2D2D)";
  else if (overdue) bg = "linear-gradient(to top, #B10707, #2D2D2D)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center shrink-0 transition-all active:scale-95 dark:text-white"
      style={{
        width: 72,
        height: 32,
        borderRadius: 49,
        background: bg,
      }}
    >
      <Check className="h-4 w-4 text-white" strokeWidth={3} />
    </button>
  );
}

/* ─── Assignments Card with Grades Tab ─── */
export function AssignmentsCard({
  assignments,
  completedAssignments,
  gradedItems,
  teacherMap,
  studentId,
}: {
  assignments: Assignment[];
  completedAssignments: CompletedAssignment[];
  gradedItems: GradedItem[];
  teacherMap: Record<string, string>;
  studentId: string;
}) {
  const [localAssignments, setLocalAssignments] = useState(assignments);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"assignments" | "grades">("assignments");
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const supabase = createClient();
  const now = new Date();

  const markAsDone = async (assignmentId: string) => {
    setCompletingId(assignmentId);
    const { error } = await supabase
      .from("assignment_students")
      .update({ completed_at: new Date().toISOString() })
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId);
    if (error) { toast.error("Failed to mark as done"); setCompletingId(null); return; }
    setDoneIds((prev) => new Set(prev).add(assignmentId));
    toast.success("Marked as done!");
    setCompletingId(null);
  };

  const isOverdue = (d: string) => new Date(d) < now;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  const pendingSorted = [...localAssignments].sort((a, b) => {
    const aOver = isOverdue(a.due_date) ? 0 : 1;
    const bOver = isOverdue(b.due_date) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const fillerCount = Math.max(0, 4 - pendingSorted.length);
  const fillers = completedAssignments
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, fillerCount);

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-0 px-4 pt-3 pb-2">
        <Image src="/Icons/black/assignments or tasks without noti black.svg" alt="" width={24} height={24} className="shrink-0" />
        <div className="w-px h-4 bg-gray-300 mx-2.5" />
        <button
          onClick={() => setActiveTab("assignments")}
          className={`text-[16px] font-semibold transition-colors ${activeTab === "assignments" ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white"}`}
        >
          Assignments
        </button>
        <button
          onClick={() => setActiveTab("grades")}
          className={`text-[16px] font-semibold ml-4 transition-colors ${activeTab === "grades" ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white"}`}
        >
          Grades
        </button>
      </div>

      {/* Separator below header */}
      <div className="h-px bg-[#2D2D2D]/10" />

      {/* Content */}
      <div className="flex-1 px-4 pb-2 flex flex-col min-h-0">
        {activeTab === "assignments" ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              {pendingSorted.slice(0, 4).map((a, idx) => {
                const overdue = isOverdue(a.due_date);
                const completing = completingId === a.id;
                const isDone = doneIds.has(a.id);
                return (
                  <div key={a.id}>
                    <div className="flex items-center justify-between" style={{ height: 73 }}>
                      <div className="min-w-0 flex-1 mr-3">
                        <Link
                          href={`/dashboard/student/assignments/${a.id}`}
                          className="text-[16px] font-semibold block truncate transition-colors text-[#2D2D2D] dark:text-white hover:opacity-70"
                        >
                          {a.title}
                        </Link>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                          <span className="flex items-center gap-0.5"><Image src="/Icons/grey/subject.svg" alt="" width={10} height={10} />{a.subject}</span>
                          <span className="flex items-center gap-0.5"><Image src="/Icons/grey/teacher:person.svg" alt="" width={10} height={10} />{teacherMap[a.created_by] || "Teacher"}</span>
                          <span className="flex items-center gap-0.5"><Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />{fmt(a.due_date)}</span>
                        </div>
                      </div>
                      <DoneButton
                        done={isDone}
                        overdue={overdue && !isDone}
                        onClick={() => markAsDone(a.id)}
                        disabled={completing || isDone}
                      />
                    </div>
                    <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
                  </div>
                );
              })}
              {fillers.map((a) => (
                <div key={a.id}>
                  <div className="flex items-center justify-between opacity-60" style={{ height: 73 }}>
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white truncate">{a.title}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                        <span className="flex items-center gap-0.5"><Image src="/Icons/grey/subject.svg" alt="" width={10} height={10} />{a.subject}</span>
                        <span className="flex items-center gap-0.5"><Image src="/Icons/grey/teacher:person.svg" alt="" width={10} height={10} />{teacherMap[a.created_by] || "Teacher"}</span>
                        <span className="flex items-center gap-0.5"><Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />{fmt(a.due_date)}</span>
                      </div>
                    </div>
                    <DoneButton done={true} overdue={false} />
                  </div>
                  <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
                </div>
              ))}
              {pendingSorted.length === 0 && fillers.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-6">
                  <p className="text-sm text-[#9A9A9A] dark:text-[#A0A0A0]">All caught up!</p>
                </div>
              )}
            </div>
            <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
            <Link href="/dashboard/student/assignments" className="block text-center text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors py-2">
              View all ↓
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              {gradedItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-6">
                  <p className="text-sm text-[#9A9A9A] dark:text-[#A0A0A0]">No grades yet</p>
                </div>
              ) : (
                gradedItems.slice(0, 4).map((g) => (
                  <div key={g.id}>
                    <div
                      className="py-2.5 cursor-pointer"
                      onClick={() => setExpandedGrade(expandedGrade === g.id ? null : g.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white truncate">{g.assignment_title}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                            <span>{g.subject}</span>
                            <span>{teacherMap[g.created_by] || "Teacher"}</span>
                          </div>
                        </div>
                        <span className="text-[16px] font-bold text-[#2D2D2D] dark:text-white shrink-0">{g.grade}%</span>
                      </div>
                      {expandedGrade === g.id && g.feedback && (
                        <p className="text-[10px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-1 italic">{g.feedback}</p>
                      )}
                    </div>
                    <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
                  </div>
                ))
              )}
            </div>
            <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
            <Link href="/dashboard/student/grades" className="block text-center text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors py-2">
              View all ↓
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Exams Card ─── */
export function ExamsCard({
  exams,
  teacherMap,
  studentId,
  doneExamIds = [],
}: {
  exams: Exam[];
  teacherMap: Record<string, string>;
  studentId: string;
  doneExamIds?: string[];
}) {
  const now = new Date();
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set(doneExamIds));
  const supabase = createClient();
  const isPast = (d: string) => new Date(d) < now;

  const markExamDone = async (examId: string) => {
    const { error } = await supabase
      .from("exam_students")
      .update({ marked_done: true })
      .eq("exam_id", examId)
      .eq("student_id", studentId);
    if (!error) {
      setDoneIds((prev) => new Set(prev).add(examId));
      toast.success("Exam marked as done!");
    } else {
      toast.error("Failed to mark exam");
    }
  };

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-0 px-4 pt-3 pb-2">
        <Image src="/Icons/black/exams black.svg" alt="" width={24} height={24} className="shrink-0" />
        <div className="w-px h-4 bg-gray-300 mx-2.5" />
        <span className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white">Exams</span>
      </div>
      {/* Separator below header */}
      <div className="h-px bg-[#2D2D2D]/10" />
      <div className="flex-1 px-4 pb-2 flex flex-col min-h-0">
        <div className="flex-1">
          {exams.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-sm text-[#9A9A9A] dark:text-[#A0A0A0]">No upcoming exams</p>
            </div>
          ) : (
            exams.slice(0, 4).map((e) => {
              const past = isPast(e.exam_date);
              const isDone = doneIds.has(e.id);
              const overdue = past && !isDone;
              return (
                <div key={e.id}>
                  <div className="flex items-center justify-between" style={{ height: 73 }}>
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white truncate">{e.title}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                        <span className="flex items-center gap-0.5"><Image src="/Icons/grey/subject.svg" alt="" width={10} height={10} />{e.subject}</span>
                        <span className="flex items-center gap-0.5"><Image src="/Icons/grey/teacher:person.svg" alt="" width={10} height={10} />{teacherMap[e.created_by] || "Teacher"}</span>
                        <span className="flex items-center gap-0.5"><Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />
                          {new Date(e.exam_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                        </span>
                      </div>
                    </div>
                    <DoneButton
                      done={isDone}
                      overdue={overdue}
                      onClick={() => markExamDone(e.id)}
                      disabled={isDone}
                    />
                  </div>
                  <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
                </div>
              );
            })
          )}
        </div>
        <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
        <Link href="/dashboard/student/assignments" className="block text-center text-[13px] text-[#9A9A9A] hover:text-[#2D2D2D] transition-colors py-2">
          View all ↓
        </Link>
      </div>
    </div>
  );
}

/* ─── Schedule Card ─── */
export function ScheduleCard({
  slots,
  initialDayOffset,
}: {
  slots: Record<number, TimetableSlot[]>;
  initialDayOffset: number;
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
    <div className="dash-card rounded-2xl flex flex-col h-full">
      <div className="flex items-center gap-0 px-4 pt-3 pb-1">
        <Image src="/Icons/black/schedule black.svg" alt="" width={24} height={24} className="shrink-0" />
        <div className="w-px h-4 bg-gray-300 mx-2.5" />
        <span className="text-[16px] font-semibold text-[#2D2D2D]">Schedule</span>
      </div>
      {/* Separator below header */}
      <div className="h-px bg-[#2D2D2D]/10" />
      <div className="flex items-center justify-between px-4 py-1.5">
        <button onClick={() => setDayOffset((d) => d - 1)} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 text-[#9A9A9A]" />
        </button>
        <span className="text-[13px] font-semibold text-[#2D2D2D]">{dayLabel}</span>
        <button onClick={() => setDayOffset((d) => d + 1)} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-[#9A9A9A]" />
        </button>
      </div>
      {/* Separator below "Today" */}
      <div className="h-px bg-[#2D2D2D]/10" />
      <div className="flex-1 px-4 pb-3 overflow-y-auto min-h-0">
        {isWeekend || currentSlots.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-[#9A9A9A]">{isWeekend ? "No school today" : "No classes scheduled"}</p>
          </div>
        ) : (
          <div>
            {currentSlots.map((slot, idx) => (
              <div key={slot.id}>
                <div className="flex items-center gap-3 py-2.5">
                  <span className="text-[13px] font-bold text-[#9A9A9A] w-10 shrink-0 tabular-nums">{slot.start_time?.slice(0, 5)}</span>
                  <p className="text-[14px] font-semibold text-[#2D2D2D] truncate flex-1 min-w-0">{slot.subject_name || "Class"}</p>
                  {slot.teacher_name && (
                    <span className="text-[10px] font-bold text-[#9A9A9A] shrink-0">{slot.teacher_name}</span>
                  )}
                </div>
                <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Planner Card ─── */
export function PlannerCard({
  tasks,
}: {
  tasks: PlannerTask[];
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = (today.getDay() + 6) % 7;
  const mondayBase = new Date(today);
  mondayBase.setDate(mondayBase.getDate() - dayOfWeek + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayBase);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const getTasksForDay = (d: Date) =>
    tasks.filter((t) => {
      const td = new Date(t.due_date);
      return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });

  return (
    <div className="dash-card rounded-2xl flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-0">
          <Image src="/Icons/black/planner black.svg" alt="" width={24} height={24} className="shrink-0" />
          <div className="w-px h-4 bg-gray-300 mx-2.5" />
          <span className="text-[16px] font-semibold text-[#2D2D2D]">Planner</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronLeft className="h-3.5 w-3.5 text-[#9A9A9A]" />
          </button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-[#9A9A9A]" />
          </button>
        </div>
      </div>
      {/* Separator below header */}
      <div className="h-px bg-[#2D2D2D]/10" />
      <div className="flex-1 px-2 pb-3 pt-2 min-h-0">
        <div className="grid grid-cols-7 gap-1.5 h-full">
          {days.map((d, i) => {
            const isTod = isToday(d);
            const dayTasks = getTasksForDay(d);
            return (
              <div key={i} className="flex flex-col min-h-0">
                <div
                  className="text-center py-2.5 rounded-xl text-[24px] font-black text-white"
                  style={{ backgroundColor: "#2D2D2D" }}
                >
                  {isTod ? "Today" : d.getDate()}
                </div>
                <div className="flex-1 mt-1 rounded-lg bg-gray-50 p-1 space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div key={t.id} className="bg-white rounded-lg px-1.5 py-1 border border-gray-100">
                      <p className="text-[10px] font-semibold text-[#2D2D2D] leading-tight line-clamp-3">{t.title}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <Image src="/Icons/grey/subject.svg" alt="" width={8} height={8} />
                        <p className="text-[9px] text-[#9A9A9A] truncate">{t.subject}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Image src="/Icons/grey/teacher:person.svg" alt="" width={8} height={8} />
                        <p className="text-[9px] text-[#9A9A9A] truncate">{t.teacher_name}</p>
                      </div>
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <p className="text-[9px] text-[#9A9A9A] text-center">+{dayTasks.length - 2}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Announcements Card ─── */
export function AnnouncementsCard({
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
        <Image src="/Icons/black/home black.svg" alt="" width={24} height={24} className="shrink-0" />
        <div className="w-px h-4 bg-gray-300 mx-2.5" />
        <span className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white">Announcements</span>
      </div>
      {/* Separator below header */}
      <div className="h-px bg-[#2D2D2D]/10" />
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
                    {a.author_name && <span className="flex items-center gap-0.5"><Image src="/Icons/grey/teacher:person.svg" alt="" width={10} height={10} />{a.author_name}</span>}
                    <span className="flex items-center gap-0.5"><Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />{formatDate(a.created_at)}</span>
                  </div>
                </div>
                <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
              </div>
            ))}
          </div>
        )}
        <div className="-mx-4 h-px bg-[#2D2D2D]/10" />
        <Link href="/dashboard/student/resources" className="block text-center text-[13px] text-[#9A9A9A] hover:text-[#2D2D2D] transition-colors py-2">
          View all ↓
        </Link>
      </div>
    </div>
  );
}

import { ColorOrb } from "@/components/ui/ai-input";

/* ─── Ask AI Button ─── */
export function AskAIButton() {
  return (
    <Link
      href="/dashboard/student/ai-tutor"
      className="dash-card rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
    >
      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        <ColorOrb dimension="32px" tones={{ base: "oklch(22.64% 0 0)" }} />
      </div>
      <div>
        <span className="text-[14px] font-semibold text-[#2D2D2D]">Ask </span>
        <span className="text-[14px] font-libre font-bold" style={{
          background: "radial-gradient(circle at 30% 30%, #92D1FF 0%, #0094FF 50%, #E45C12 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>AI</span>
      </div>
    </Link>
  );
}
