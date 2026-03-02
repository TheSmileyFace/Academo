"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  Circle,
  BookOpen,
  FileText,
  GraduationCap,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Trash2,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  getDay,
} from "date-fns";

// Types
interface PersonalTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_done: boolean;
  created_at: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  is_done: boolean;
}

interface ExamItem {
  id: string;
  title: string;
  subject: string | null;
  exam_date: string;
}

interface TimetableItem {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_name: string;
  teacher_name: string;
}

interface EventItem {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  event_type: string;
}

// Combined planner item for rendering
interface PlannerItem {
  id: string;
  type: "class" | "assignment" | "exam" | "event" | "personal";
  title: string;
  subtitle?: string;
  time?: string;
  isDone?: boolean;
  originalId?: string;
}

function getItemIcon(type: PlannerItem["type"]) {
  switch (type) {
    case "class": return <Clock className="h-3 w-3" />;
    case "assignment": return <FileText className="h-3 w-3" />;
    case "exam": return <GraduationCap className="h-3 w-3" />;
    case "event": return <Star className="h-3 w-3" />;
    case "personal": return <CheckCircle2 className="h-3 w-3" />;
  }
}

function getItemStyle(type: PlannerItem["type"]) {
  switch (type) {
    case "class": return "bg-[#2D2D2D]/5 border-[#2D2D2D]/10";
    case "assignment": return "bg-blue-50 border-blue-100";
    case "exam": return "bg-amber-50 border-amber-100";
    case "event": return "bg-purple-50 border-purple-100";
    case "personal": return "bg-emerald-50 border-emerald-100";
  }
}

export default function PlannerPage() {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  // UI state
  const [addingTaskDate, setAddingTaskDate] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Navigation
  const goToToday = () => setCurrentDate(new Date());
  const goPrev = () => setCurrentDate(viewMode === "week" ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  const goNext = () => setCurrentDate(viewMode === "week" ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));

  // Week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Personal tasks
    const { data: tasks } = await supabase
      .from("student_personal_tasks")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setPersonalTasks(tasks || []);

    // Assignment links + details
    const { data: links } = await supabase
      .from("assignment_students")
      .select("assignment_id, completed_at")
      .eq("student_id", user.id);

    if (links && links.length > 0) {
      const ids = links.map((l) => l.assignment_id);
      const completedIds = new Set(links.filter((l) => l.completed_at).map((l) => l.assignment_id));
      const { data: asgn } = await supabase
        .from("assignments")
        .select("id, title, subject, due_date")
        .in("id", ids)
        .eq("status", "active");
      setAssignments((asgn || []).map((a) => ({
        id: a.id,
        title: a.title,
        subject: a.subject || "General",
        due_date: a.due_date,
        is_done: completedIds.has(a.id),
      })));
    }

    // Exams
    const { data: examLinks } = await supabase
      .from("exam_students")
      .select("exam_id")
      .eq("student_id", user.id);
    if (examLinks && examLinks.length > 0) {
      const examIds = examLinks.map((e) => e.exam_id);
      const { data: examData } = await supabase
        .from("exams")
        .select("id, title, subject, exam_date")
        .in("id", examIds);
      setExams(examData || []);
    }

    // Timetable - get student enrollment to find class
    const { data: enrollment } = await supabase
      .from("student_enrollments")
      .select("class_id")
      .eq("student_id", user.id)
      .limit(1)
      .maybeSingle();

    if (enrollment) {
      const { data: classSubjects } = await supabase
        .from("class_subjects")
        .select("id, subject:subjects(name), teacher:profiles(full_name)")
        .eq("class_id", enrollment.class_id);

      if (classSubjects && classSubjects.length > 0) {
        const csIds = classSubjects.map((cs) => cs.id);
        const csMap: Record<string, { subject_name: string; teacher_name: string }> = {};
        classSubjects.forEach((cs: any) => {
          csMap[cs.id] = {
            subject_name: cs.subject?.name || "Subject",
            teacher_name: cs.teacher?.full_name || "Teacher",
          };
        });

        const { data: slots } = await supabase
          .from("timetable_slots")
          .select("id, day_of_week, start_time, end_time, room, class_subject_id")
          .in("class_subject_id", csIds);

        setTimetable((slots || []).map((s) => ({
          id: s.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          room: s.room,
          subject_name: csMap[s.class_subject_id]?.subject_name || "Subject",
          teacher_name: csMap[s.class_subject_id]?.teacher_name || "Teacher",
        })));
      }
    }

    // Events
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    if (profile?.school_id) {
      const { data: evts } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, event_type")
        .eq("school_id", profile.school_id);
      setEvents(evts || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build items for a specific day
  const getItemsForDay = useCallback((day: Date): PlannerItem[] => {
    const items: PlannerItem[] = [];
    const dayOfWeek = getDay(day); // 0=Sunday

    // Timetable slots
    timetable
      .filter((t) => t.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .forEach((t) => {
        items.push({
          id: `tt-${t.id}`,
          type: "class",
          title: t.subject_name,
          subtitle: t.room ? `Room ${t.room}` : t.teacher_name,
          time: `${t.start_time.slice(0, 5)} - ${t.end_time.slice(0, 5)}`,
        });
      });

    // Assignments due this day
    assignments
      .filter((a) => isSameDay(new Date(a.due_date), day))
      .forEach((a) => {
        items.push({
          id: `asgn-${a.id}`,
          type: "assignment",
          title: a.title,
          subtitle: a.subject,
          isDone: a.is_done,
          originalId: a.id,
        });
      });

    // Exams
    exams
      .filter((e) => isSameDay(new Date(e.exam_date), day))
      .forEach((e) => {
        items.push({
          id: `exam-${e.id}`,
          type: "exam",
          title: e.title,
          subtitle: e.subject || undefined,
        });
      });

    // Events
    events
      .filter((e) => {
        const start = new Date(e.start_date);
        const end = e.end_date ? new Date(e.end_date) : start;
        return day >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
               day <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
      })
      .forEach((e) => {
        items.push({
          id: `evt-${e.id}`,
          type: "event",
          title: e.title,
          subtitle: e.event_type,
        });
      });

    // Personal tasks
    personalTasks
      .filter((t) => t.due_date && isSameDay(new Date(t.due_date), day))
      .forEach((t) => {
        items.push({
          id: `pt-${t.id}`,
          type: "personal",
          title: t.title,
          isDone: t.is_done,
          originalId: t.id,
        });
      });

    return items;
  }, [timetable, assignments, exams, events, personalTasks]);

  // Personal tasks without due date
  const unscheduledTasks = personalTasks.filter((t) => !t.due_date);

  // Add personal task
  const addPersonalTask = async (dateStr: string | null) => {
    if (!newTaskTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("student_personal_tasks").insert({
      student_id: user.id,
      title: newTaskTitle.trim(),
      due_date: dateStr ? new Date(dateStr).toISOString() : null,
    });

    if (error) { toast.error("Failed to add task"); return; }
    toast.success("Task added!");
    setNewTaskTitle("");
    setAddingTaskDate(null);
    fetchData();
  };

  // Toggle personal task done
  const togglePersonalTask = async (taskId: string) => {
    const task = personalTasks.find((t) => t.id === taskId);
    if (!task) return;
    await supabase.from("student_personal_tasks").update({ is_done: !task.is_done }).eq("id", taskId);
    setPersonalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, is_done: !t.is_done } : t));
  };

  // Delete personal task
  const deletePersonalTask = async (taskId: string) => {
    await supabase.from("student_personal_tasks").delete().eq("id", taskId);
    setPersonalTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast.success("Task deleted");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]" />
      </div>
    );
  }

  const dayLabel = viewMode === "week"
    ? `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`
    : format(currentDate, "MMMM yyyy");

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="shrink-0 pt-2 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#2D2D2D]">Planner</h1>
          <p className="text-[12px] text-[#9A9A9A] mt-0.5">Your command center for everything school</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#2D2D2D]/10 overflow-hidden">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${viewMode === "week" ? "bg-[#2D2D2D] text-white" : "text-[#9A9A9A] hover:bg-gray-50"}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${viewMode === "month" ? "bg-[#2D2D2D] text-white" : "text-[#9A9A9A] hover:bg-gray-50"}`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft className="h-4 w-4 text-[#2D2D2D]" />
          </button>
          <span className="text-[14px] font-semibold text-[#2D2D2D] min-w-[180px] text-center">{dayLabel}</span>
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronRight className="h-4 w-4 text-[#2D2D2D]" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="text-[11px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D] px-3 py-1.5 rounded-lg border border-[#2D2D2D]/10 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Week View */}
      {viewMode === "week" && (
        <div className="flex-1 grid grid-cols-7 gap-2 min-h-0">
          {weekDays.map((day) => {
            const dayItems = getItemsForDay(day);
            const dateStr = format(day, "yyyy-MM-dd");
            const today = isToday(day);

            return (
              <div
                key={dateStr}
                className={`dash-card rounded-2xl flex flex-col min-h-[200px] ${today ? "ring-2 ring-[#2D2D2D]" : ""}`}
              >
                {/* Day header */}
                <div className="px-2.5 pt-2.5 pb-1.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#9A9A9A] uppercase">{format(day, "EEE")}</p>
                    <p className={`text-[18px] font-bold ${today ? "text-[#2D2D2D]" : "text-[#2D2D2D]"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  <button
                    onClick={() => { setAddingTaskDate(dateStr); setNewTaskTitle(""); }}
                    className="p-1 rounded-md hover:bg-[#2D2D2D]/5 transition-colors text-[#9A9A9A] hover:text-[#2D2D2D]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="h-px bg-[#2D2D2D]/10" />

                {/* Items */}
                <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border px-2 py-1.5 ${getItemStyle(item.type)} ${item.isDone ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-1.5">
                        {item.type === "personal" && item.originalId ? (
                          <button
                            onClick={() => togglePersonalTask(item.originalId!)}
                            className="shrink-0 mt-0.5"
                          >
                            {item.isDone ? (
                              <CheckCircle2 className="h-3 w-3 text-[#2D2D2D]" />
                            ) : (
                              <Circle className="h-3 w-3 text-[#9A9A9A]" />
                            )}
                          </button>
                        ) : (
                          <span className="shrink-0 mt-0.5">{getItemIcon(item.type)}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-semibold truncate ${item.isDone ? "line-through text-[#9A9A9A]" : "text-[#2D2D2D]"}`}>
                            {item.title}
                          </p>
                          {item.time && (
                            <p className="text-[8px] font-bold text-[#9A9A9A]">{item.time}</p>
                          )}
                          {item.subtitle && !item.time && (
                            <p className="text-[8px] font-bold text-[#9A9A9A]">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Quick add task inline */}
                  {addingTaskDate === dateStr && (
                    <div className="rounded-lg border border-[#2D2D2D]/20 bg-white p-1.5">
                      <Input
                        autoFocus
                        placeholder="Task name..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addPersonalTask(dateStr);
                          if (e.key === "Escape") setAddingTaskDate(null);
                        }}
                        className="h-6 text-[10px] border-0 p-0 shadow-none focus-visible:ring-0"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => addPersonalTask(dateStr)}
                          className="text-[9px] font-bold text-white bg-[#2D2D2D] rounded px-2 py-0.5 hover:bg-[#2D2D2D]"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingTaskDate(null)}
                          className="text-[9px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-[#9A9A9A] uppercase py-1">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
            {monthDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayItems = getItemsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const hasItems = dayItems.length > 0;
              const isSelected = selectedDay && isSameDay(day, selectedDay);

              // Count by type
              const typeCounts = dayItems.reduce<Record<string, number>>((acc, item) => {
                acc[item.type] = (acc[item.type] || 0) + 1;
                return acc;
              }, {});

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay || new Date(0)) ? null : day)}
                  className={`dash-card rounded-xl p-1.5 flex flex-col items-start transition-all text-left ${
                    !inMonth ? "opacity-30" : ""
                  } ${today ? "ring-2 ring-[#2D2D2D]" : ""} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                >
                  <span className={`text-[11px] font-bold ${today ? "text-[#2D2D2D]" : "text-[#2D2D2D]"}`}>
                    {format(day, "d")}
                  </span>
                  {hasItems && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {typeCounts["class"] && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2D2D2D]" title={`${typeCounts["class"]} class(es)`} />
                      )}
                      {typeCounts["assignment"] && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${typeCounts["assignment"]} assignment(s)`} />
                      )}
                      {typeCounts["exam"] && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`${typeCounts["exam"]} exam(s)`} />
                      )}
                      {typeCounts["event"] && (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title={`${typeCounts["event"]} event(s)`} />
                      )}
                      {typeCounts["personal"] && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${typeCounts["personal"]} task(s)`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Detail Panel (for month view) */}
      {viewMode === "month" && selectedDay && (
        <div className="dash-card rounded-2xl">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#2D2D2D]" />
              <span className="text-[14px] font-semibold text-[#2D2D2D]">
                {format(selectedDay, "EEEE, d MMMM")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setAddingTaskDate(format(selectedDay, "yyyy-MM-dd")); setNewTaskTitle(""); }}
                className="p-1.5 rounded-lg hover:bg-[#2D2D2D]/5 text-[#9A9A9A] hover:text-[#2D2D2D]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-[#2D2D2D]/5 text-[#9A9A9A] hover:text-[#2D2D2D]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="h-px bg-[#2D2D2D]/10" />
          <div className="px-4 py-3 space-y-2">
            {getItemsForDay(selectedDay).length === 0 && !addingTaskDate ? (
              <p className="text-[12px] text-[#9A9A9A] text-center py-4">Nothing scheduled for this day</p>
            ) : (
              getItemsForDay(selectedDay).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3 py-2 flex items-center gap-2.5 ${getItemStyle(item.type)} ${item.isDone ? "opacity-50" : ""}`}
                >
                  {item.type === "personal" && item.originalId ? (
                    <button onClick={() => togglePersonalTask(item.originalId!)} className="shrink-0">
                      {item.isDone ? <CheckCircle2 className="h-4 w-4 text-[#2D2D2D]" /> : <Circle className="h-4 w-4 text-[#9A9A9A]" />}
                    </button>
                  ) : (
                    <span className="shrink-0">{getItemIcon(item.type)}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold truncate ${item.isDone ? "line-through text-[#9A9A9A]" : "text-[#2D2D2D]"}`}>
                      {item.title}
                    </p>
                    {(item.time || item.subtitle) && (
                      <p className="text-[10px] font-bold text-[#9A9A9A]">{item.time || item.subtitle}</p>
                    )}
                  </div>
                  {item.type === "personal" && item.originalId && (
                    <button onClick={() => deletePersonalTask(item.originalId!)} className="shrink-0 text-[#9A9A9A] hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
            {/* Inline add for month detail panel */}
            {addingTaskDate === format(selectedDay, "yyyy-MM-dd") && (
              <div className="rounded-xl border border-[#2D2D2D]/20 bg-white p-3">
                <Input
                  autoFocus
                  placeholder="Task name..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addPersonalTask(addingTaskDate);
                    if (e.key === "Escape") setAddingTaskDate(null);
                  }}
                  className="h-8 text-[12px] rounded-lg border-[#2D2D2D]/10"
                />
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    onClick={() => addPersonalTask(addingTaskDate)}
                    size="sm"
                    className="bg-[#2D2D2D] hover:bg-[#2D2D2D] text-white text-[11px] h-7 rounded-lg"
                  >
                    Add task
                  </Button>
                  <button onClick={() => setAddingTaskDate(null)} className="text-[11px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D]">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unscheduled personal tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="dash-card rounded-2xl">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#2D2D2D]" />
            <span className="text-[14px] font-semibold text-[#2D2D2D]">Quick Tasks</span>
            <span className="text-[10px] font-bold text-[#9A9A9A] ml-auto">{unscheduledTasks.filter((t) => !t.is_done).length} pending</span>
          </div>
          <div className="h-px bg-[#2D2D2D]/10" />
          <div className="px-4 py-2">
            {unscheduledTasks.map((task, idx) => (
              <div key={task.id}>
                <div className="flex items-center gap-2.5 py-2">
                  <button onClick={() => togglePersonalTask(task.id)} className="shrink-0">
                    {task.is_done ? <CheckCircle2 className="h-4 w-4 text-[#2D2D2D]" /> : <Circle className="h-4 w-4 text-[#9A9A9A]/40" />}
                  </button>
                  <p className={`text-[13px] flex-1 truncate ${task.is_done ? "line-through text-[#9A9A9A]" : "font-semibold text-[#2D2D2D]"}`}>
                    {task.title}
                  </p>
                  <button onClick={() => deletePersonalTask(task.id)} className="shrink-0 text-[#9A9A9A] hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {idx < unscheduledTasks.length - 1 && <div className="h-px bg-[#2D2D2D]/10" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick add unscheduled task */}
      {addingTaskDate === "none" ? (
        <div className="dash-card rounded-2xl px-4 py-3">
          <Input
            autoFocus
            placeholder="Quick task name..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPersonalTask(null);
              if (e.key === "Escape") setAddingTaskDate(null);
            }}
            className="h-9 text-[13px] rounded-xl border-[#2D2D2D]/10 mb-2"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => addPersonalTask(null)}
              size="sm"
              className="bg-[#2D2D2D] hover:bg-[#2D2D2D] text-white text-[11px] h-8 rounded-lg"
            >
              Add quick task
            </Button>
            <button onClick={() => setAddingTaskDate(null)} className="text-[11px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setAddingTaskDate("none"); setNewTaskTitle(""); }}
          className="dash-card rounded-2xl px-4 py-3 flex items-center gap-2 text-[#9A9A9A] hover:text-[#2D2D2D] transition-colors w-full"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[13px] font-semibold">Add a quick task</span>
        </button>
      )}
    </div>
  );
}
