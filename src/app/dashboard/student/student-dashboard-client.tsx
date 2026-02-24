"use client";

import { useState } from "react";
import { BookOpen, GraduationCap, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Exam {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  exam_date: string;
  duration_minutes: number;
  created_by: string;
}

/* ─── Assignments Card ─── */
export function AssignmentsCard({
  assignments,
  teacherMap,
  studentId,
}: {
  assignments: Assignment[];
  teacherMap: Record<string, string>;
  studentId: string;
}) {
  const [localAssignments, setLocalAssignments] = useState(assignments);
  const [completingId, setCompletingId] = useState<string | null>(null);
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
    setLocalAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    toast.success("Marked as done!");
    setCompletingId(null);
  };

  const isOverdue = (d: string) => new Date(d) < now;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
              <BookOpen className="h-3.5 w-3.5 text-[#1e3a5f]" />
            </div>
            Assignments
            {localAssignments.length > 0 && (
              <span className="text-[11px] font-bold bg-blue-50 text-[#1e3a5f] rounded-full px-1.5 py-0.5">
                {localAssignments.length}
              </span>
            )}
          </CardTitle>
          <Link href="/dashboard/student/assignments" className="text-[11px] font-medium text-[#1e3a5f] hover:text-[#1e3a5f]">
            View all &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1">
        {localAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <CheckCircle2 className="h-7 w-7 text-gray-200 mb-1.5" />
            <p className="text-xs font-medium text-gray-400">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {localAssignments.slice(0, 4).map((a) => {
              const overdue = isOverdue(a.due_date);
              const completing = completingId === a.id;
              return (
                <div
                  key={a.id}
                  className={`group rounded-lg border px-3 py-2 transition-all ${
                    overdue ? "border-red-200 bg-red-50/40" : "border-gray-100 hover:border-blue-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/student/assignments/${a.id}`}
                          className="text-[13px] font-semibold text-gray-800 hover:text-[#1e3a5f] transition-colors truncate"
                        >
                          {a.title}
                        </Link>
                        {overdue && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-600 rounded px-1 py-0.5">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {a.subject}
                        <span className="mx-1 text-gray-200">&bull;</span>
                        <Clock className="h-2.5 w-2.5 inline" /> {fmt(a.due_date)}
                        <span className="mx-1 text-gray-200">&bull;</span>
                        {teacherMap[a.created_by] || "Teacher"}
                      </p>
                    </div>
                    <button
                      onClick={() => markAsDone(a.id)}
                      disabled={completing}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                        completing ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-[#1e3a5f] hover:bg-blue-100 active:scale-95"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {completing ? "..." : "Done"}
                    </button>
                  </div>
                </div>
              );
            })}
            {localAssignments.length > 4 && (
              <Link href="/dashboard/student/assignments" className="block text-center text-[11px] font-medium text-[#1e3a5f] hover:text-[#1e3a5f] pt-0.5">
                +{localAssignments.length - 4} more
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Exams Card ─── */
export function ExamsCard({
  exams,
  teacherMap,
}: {
  exams: Exam[];
  teacherMap: Record<string, string>;
}) {
  const now = new Date();
  const isOverdue = (d: string) => new Date(d) < now;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
            <GraduationCap className="h-3.5 w-3.5 text-[#1e3a5f]" />
          </div>
          Exams
          {exams.length > 0 && (
            <span className="text-[11px] font-bold bg-blue-50 text-[#1e3a5f] rounded-full px-1.5 py-0.5">
              {exams.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1">
        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <GraduationCap className="h-7 w-7 text-gray-200 mb-1.5" />
            <p className="text-xs font-medium text-gray-400">No upcoming exams</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {exams.slice(0, 3).map((e) => {
              const overdue = isOverdue(e.exam_date);
              const d = new Date(e.exam_date);
              return (
                <div
                  key={e.id}
                  className={`rounded-lg border px-3 py-2 transition-all ${
                    overdue ? "border-gray-200 bg-gray-50/60 opacity-60" : "border-gray-100 hover:border-blue-100"
                  }`}
                >
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{e.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {e.subject}
                    <span className="mx-1 text-gray-200">&bull;</span>
                    {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    <span className="mx-1 text-gray-200">&bull;</span>
                    <span className="text-[#1e3a5f] font-medium">{e.duration_minutes}min</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Calendar Card (monthly view) ─── */
export function CalendarCard() {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDayOfMonth.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const isToday = (d: number | null) =>
    d !== null && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <Card className="border-0 shadow-sm flex-1 flex flex-col">
      <CardHeader className="pb-1 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthOffset((m) => m - 1)} className="p-1 rounded hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <span className="text-xs font-semibold text-gray-600 min-w-[120px] text-center">{monthNames[month]} {year}</span>
            <button onClick={() => setMonthOffset((m) => m + 1)} className="p-1 rounded hover:bg-gray-100 transition-colors">
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1 flex-1">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.slice(0, 35).map((d, i) => (
            <div
              key={i}
              className={`flex items-center justify-center rounded-md h-7 text-xs font-medium transition-colors ${
                d === null
                  ? ""
                  : isToday(d)
                  ? "bg-blue-500 text-white font-bold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
