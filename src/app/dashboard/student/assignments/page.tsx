"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Inbox,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  ArrowUpDown,
  X,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  subject: string;
  className: string;
  teacherName: string;
  dueDate: string;
  isDone: boolean;
}

function FilterSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-3 space-y-1">{children}</div>}
    </div>
  );
}

function RadioOption({ label, selected, onClick, count }: { label: string; selected: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${selected ? "bg-blue-50 text-[#1e3a5f] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${selected ? "border-[#1e3a5f]" : "border-gray-300"}`}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
        </div>
        {label}
      </div>
      {count !== undefined && <span className={`text-xs ${selected ? "text-[#1e3a5f]" : "text-gray-400"}`}>{count}</span>}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    todo: { label: "To Do", className: "bg-blue-50 text-[#1e3a5f]" },
    done: { label: "Done", className: "bg-blue-100 text-[#1e3a5f]" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
  };
  const c = config[status] ?? config.todo;
  return <Badge className={`${c.className} text-[11px] font-semibold px-2.5 py-0.5 rounded-md`}>{c.label}</Badge>;
}

export default function StudentAssignments() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("due-date");
  const [progressFilter, setProgressFilter] = useState<"all" | "todo" | "done">("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("any");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [openSections, setOpenSections] = useState({ progress: true, dueDate: true, setBy: true });
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    async function fetchTasks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get all assignment links for this student
      const { data: links } = await supabase
        .from("assignment_students")
        .select("assignment_id, completed_at")
        .eq("student_id", user.id);

      if (!links || links.length === 0) { setLoading(false); return; }

      const completedIds = new Set(links.filter((l) => l.completed_at).map((l) => l.assignment_id));
      const allIds = links.map((l) => l.assignment_id);

      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, subject, class_name, due_date, created_by")
        .in("id", allIds)
        .eq("status", "active")
        .order("due_date", { ascending: true });

      if (!assignments || assignments.length === 0) { setLoading(false); return; }

      // Get teacher names
      const teacherIds = [...new Set(assignments.map((a) => a.created_by).filter(Boolean))];
      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase.from("profiles").select("id, full_name").in("id", teacherIds);
        (teachers || []).forEach((t) => { teacherMap[t.id] = t.full_name || "Teacher"; });
      }

      const taskList: Task[] = assignments.map((a) => ({
        id: a.id,
        title: a.title,
        subject: a.subject || "General",
        className: a.class_name || "",
        teacherName: teacherMap[a.created_by] || "Teacher",
        dueDate: a.due_date,
        isDone: completedIds.has(a.id),
      }));

      setTasks(taskList);
      setDoneTasks(new Set(taskList.filter((t) => t.isDone).map((t) => t.id)));
      setLoading(false);
    }
    fetchTasks();
  }, [supabase]);

  const toggleDone = async (id: string) => {
    const wasDone = doneTasks.has(id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (wasDone) {
      await supabase
        .from("assignment_students")
        .update({ completed_at: null })
        .eq("assignment_id", id)
        .eq("student_id", user.id);
      setDoneTasks((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Unmarked");
    } else {
      await supabase
        .from("assignment_students")
        .update({ completed_at: new Date().toISOString() })
        .eq("assignment_id", id)
        .eq("student_id", user.id);
      setDoneTasks((prev) => new Set([...prev, id]));
      toast.success("Marked as done!");
    }
  };

  const now = new Date();
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && !task.subject.toLowerCase().includes(searchQuery.toLowerCase()) && !task.teacherName.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    const isDone = doneTasks.has(task.id);
    if (progressFilter === "todo" && isDone) return false;
    if (progressFilter === "done" && !isDone) return false;

    const due = new Date(task.dueDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const next7 = new Date(today); next7.setDate(next7.getDate() + 7);
    const next14 = new Date(today); next14.setDate(next14.getDate() + 14);

    if (dueDateFilter === "overdue" && due >= today) return false;
    if (dueDateFilter === "today" && (due < today || due >= tomorrow)) return false;
    if (dueDateFilter === "tomorrow" && (due < tomorrow || due >= new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1))) return false;
    if (dueDateFilter === "next7" && (due < today || due > next7)) return false;
    if (dueDateFilter === "next14" && (due < today || due > next14)) return false;

    if (teacherFilter !== "all" && task.teacherName !== teacherFilter) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "due-date") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "subject") return a.subject.localeCompare(b.subject);
    return 0;
  });

  const hasActiveFilters = progressFilter !== "all" || dueDateFilter !== "any" || teacherFilter !== "all";
  const clearFilters = () => { setProgressFilter("all"); setDueDateFilter("any"); setTeacherFilter("all"); };
  const allTeachers = [...new Set(tasks.map((t) => t.teacherName))].sort();
  const todoCnt = tasks.filter((t) => !doneTasks.has(t.id)).length;
  const doneCnt = tasks.length - todoCnt;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="mt-1 text-gray-500">All your assignments and homework in one place</p>
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <div className="w-56 shrink-0 hidden lg:block">
          <Card className="border-0 shadow-sm sticky top-6">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Filters</span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:text-[#1e3a5f] font-medium">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            <FilterSection title="Progress" open={openSections.progress} onToggle={() => toggleSection("progress")}>
              <RadioOption label="All" selected={progressFilter === "all"} onClick={() => setProgressFilter("all")} count={tasks.length} />
              <RadioOption label="To do" selected={progressFilter === "todo"} onClick={() => setProgressFilter("todo")} count={todoCnt} />
              <RadioOption label="Done" selected={progressFilter === "done"} onClick={() => setProgressFilter("done")} count={doneCnt} />
            </FilterSection>

            <FilterSection title="Due Date" open={openSections.dueDate} onToggle={() => toggleSection("dueDate")}>
              <RadioOption label="Any" selected={dueDateFilter === "any"} onClick={() => setDueDateFilter("any")} />
              <RadioOption label="Overdue" selected={dueDateFilter === "overdue"} onClick={() => setDueDateFilter("overdue")} />
              <RadioOption label="Today" selected={dueDateFilter === "today"} onClick={() => setDueDateFilter("today")} />
              <RadioOption label="Tomorrow" selected={dueDateFilter === "tomorrow"} onClick={() => setDueDateFilter("tomorrow")} />
              <RadioOption label="Next 7 days" selected={dueDateFilter === "next7"} onClick={() => setDueDateFilter("next7")} />
              <RadioOption label="Next 14 days" selected={dueDateFilter === "next14"} onClick={() => setDueDateFilter("next14")} />
            </FilterSection>

            <FilterSection title="Set by" open={openSections.setBy} onToggle={() => toggleSection("setBy")}>
              <RadioOption label="All teachers" selected={teacherFilter === "all"} onClick={() => setTeacherFilter("all")} />
              {allTeachers.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No teachers yet</p>}
              {allTeachers.map((teacher) => (
                <RadioOption key={teacher} label={teacher} selected={teacherFilter === teacher} onClick={() => setTeacherFilter(teacher)} />
              ))}
            </FilterSection>
          </Card>
        </div>

        {/* Task List */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl border-gray-200 bg-white h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{sortedTasks.length} task{sortedTasks.length !== 1 ? "s" : ""}</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 h-9 rounded-xl border-gray-200 text-sm">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due-date">Due Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {sortedTasks.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                  <Inbox className="h-8 w-8 text-gray-300" />
                </div>
                <p className="mt-4 text-base font-medium text-gray-400">No tasks yet</p>
                <p className="mt-1 text-sm text-gray-300">When your teachers assign work, it&apos;ll show up here</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {sortedTasks.map((task) => {
                  const isDone = doneTasks.has(task.id);
                  const due = new Date(task.dueDate);
                  const isOverdue = !isDone && due < now;

                  return (
                    <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50">
                      <button onClick={() => toggleDone(task.id)} className="shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-[#1e3a5f]" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300 hover:text-[#1e3a5f] transition-colors" />
                        )}
                      </button>

                      <Link href={`/dashboard/student/assignments/${task.id}`} className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isDone ? "text-gray-400 line-through" : "text-gray-900 font-semibold"}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {task.subject} &bull; {task.className} &bull; {task.teacherName}
                        </p>
                      </Link>

                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={isDone ? "done" : isOverdue ? "overdue" : "todo"} />
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 w-36 justify-end">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>
                            Due{" "}
                            {due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
