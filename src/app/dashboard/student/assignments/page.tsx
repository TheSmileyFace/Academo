"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Inbox,
  ChevronUp,
  ChevronDown,
  Check,
  ArrowUpDown,
  X,
  Loader2,
  List,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
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
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

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
    <div>
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-[#2D2D2D] hover:bg-gray-50/50 transition-colors">
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[#9A9A9A]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#9A9A9A]" />}
      </button>
      <div className="h-px bg-[#2D2D2D]/10" />
      {open && <div className="px-4 pb-3 pt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function RadioOption({ label, selected, onClick, count }: { label: string; selected: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] transition-colors ${selected ? "bg-[#2D2D2D]/5 text-[#2D2D2D] font-semibold" : "text-[#9A9A9A] hover:bg-gray-50"}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${selected ? "border-[#2D2D2D]" : "border-gray-300"}`}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-[#2D2D2D]" />}
        </div>
        {label}
      </div>
      {count !== undefined && <span className={`text-[11px] font-bold ${selected ? "text-[#2D2D2D]" : "text-[#9A9A9A]"}`}>{count}</span>}
    </button>
  );
}

function DoneButton({ done, overdue, onClick }: { done: boolean; overdue: boolean; onClick?: () => void }) {
  let bg = "#2D2D2D";
  if (done) bg = "linear-gradient(to top, #12E43C, #2D2D2D)";
  else if (overdue) bg = "linear-gradient(to top, #B10707, #2D2D2D)";
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center shrink-0 transition-all active:scale-95"
      style={{ width: 72, height: 32, borderRadius: 49, background: bg }}
    >
      <Check className="h-4 w-4 text-white" strokeWidth={3} />
    </button>
  );
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
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");

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
      const { error } = await supabase
        .from("assignment_students")
        .update({ completed_at: null })
        .eq("assignment_id", id)
        .eq("student_id", user.id);
      if (error) { toast.error("Failed to update"); return; }
      setDoneTasks((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Unmarked");
    } else {
      const { error } = await supabase
        .from("assignment_students")
        .update({ completed_at: new Date().toISOString() })
        .eq("assignment_id", id)
        .eq("student_id", user.id);
      if (error) { toast.error("Failed to update"); return; }
      setDoneTasks((prev) => new Set([...prev, id]));
      toast.success("Marked as done!");

      // Notify the teacher that this student marked the task as done
      const task = tasks.find((t) => t.id === id);
      if (task) {
        const { data: assignment } = await supabase
          .from("assignments")
          .select("created_by")
          .eq("id", id)
          .single();

        if (assignment?.created_by) {
          const { data: studentProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

          const studentName = studentProfile?.full_name || "A student";
          await supabase.from("notifications").insert({
            user_id: assignment.created_by,
            type: "task_completed",
            title: `${studentName} completed "${task.title}"`,
            body: `${studentName} marked "${task.title}" as done.`,
            reference_id: id,
          });
        }
      }
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
  const overdueCnt = tasks.filter((t) => !doneTasks.has(t.id) && new Date(t.dueDate) < now).length;

  // Group tasks by subject for grouped view
  const groupedBySubject = sortedTasks.reduce<Record<string, typeof sortedTasks>>((acc, task) => {
    const key = task.subject || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#2D2D2D]">Tasks</h1>
          <p className="text-[12px] text-[#9A9A9A] mt-0.5">All your assignments and homework</p>
        </div>
        {overdueCnt > 0 && (
          <div className="flex items-center gap-1.5 bg-red-100 text-red-700 rounded-lg px-3 py-1.5 mb-0.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold">{overdueCnt} overdue</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Filter Sidebar */}
        <div className="w-52 shrink-0 hidden lg:block">
          <div className="dash-card rounded-2xl sticky top-6">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A]">Filters</span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] text-[#2D2D2D] font-semibold hover:opacity-70">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <div className="h-px bg-[#2D2D2D]/10" />

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
              {allTeachers.length === 0 && <p className="px-3 py-2 text-[10px] text-[#9A9A9A]">No teachers yet</p>}
              {allTeachers.map((teacher) => (
                <RadioOption key={teacher} label={teacher} selected={teacherFilter === teacher} onClick={() => setTeacherFilter(teacher)} />
              ))}
            </FilterSection>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" />
              <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-xl border-[#2D2D2D]/10 bg-white h-9 text-[13px]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#9A9A9A]">{sortedTasks.length} task{sortedTasks.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center rounded-lg border border-[#2D2D2D]/10 overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-[#2D2D2D] text-white" : "text-[#9A9A9A] hover:bg-gray-50"}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`p-1.5 transition-colors ${viewMode === "grouped" ? "bg-[#2D2D2D] text-white" : "text-[#9A9A9A] hover:bg-gray-50"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-9 rounded-xl border-[#2D2D2D]/10 text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3 text-[#9A9A9A]" />
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
            <div className="dash-card rounded-2xl flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                <Inbox className="h-7 w-7 text-[#9A9A9A]/40" />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-[#9A9A9A]">No tasks yet</p>
              <p className="mt-1 text-[11px] text-[#9A9A9A]/60">When your teachers assign work, it&apos;ll show up here</p>
            </div>
          ) : viewMode === "grouped" ? (
            <div className="space-y-3">
              {Object.entries(groupedBySubject).map(([subject, subjectTasks]) => (
                <div key={subject} className="dash-card rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-[#2D2D2D]">{subject}</span>
                    <span className="text-[10px] font-bold text-[#9A9A9A]">{subjectTasks.length} task{subjectTasks.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-px bg-[#2D2D2D]/10" />
                  <AnimatePresence initial={false}>
                    {subjectTasks.map((task, idx) => {
                      const isDone = doneTasks.has(task.id);
                      const due = new Date(task.dueDate);
                      const isOverdue = !isDone && due < now;
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 73 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="rounded-xl mx-2 overflow-hidden"
                        >
                          <div className="flex items-center gap-3 px-4 transition-colors hover:bg-gray-50/50" style={{ height: 73 }}>
                            <Link href={`/dashboard/student/assignments/${task.id}`} className="flex-1 min-w-0">
                              <p className={`text-[16px] truncate ${isDone ? "text-[#9A9A9A] line-through" : "text-[#2D2D2D] font-semibold"}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] mt-0.5">
                                <span className="flex items-center gap-0.5"><Image src="/Icons/grey/teacher:person.svg" alt="" width={10} height={10} />{task.teacherName}</span>
                                <span className="flex items-center gap-0.5"><Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />
                                  {due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                            </Link>
                            <DoneButton done={isDone} overdue={isOverdue} onClick={() => toggleDone(task.id)} />
                          </div>
                          {idx < subjectTasks.length - 1 && <div className="h-px bg-[#2D2D2D]/10" />}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-card rounded-2xl overflow-hidden">
              <AnimatePresence initial={false}>
                {sortedTasks.map((task, idx) => {
                  const isDone = doneTasks.has(task.id);
                  const due = new Date(task.dueDate);
                  const isOverdue = !isDone && due < now;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl mx-2 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 transition-colors hover:bg-gray-50/50" style={{ height: 73 }}>
                        <Link href={`/dashboard/student/assignments/${task.id}`} className="flex-1 min-w-0">
                          <p className={`text-[16px] truncate ${isDone ? "text-[#9A9A9A] line-through" : "text-[#2D2D2D] font-semibold"}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] mt-0.5">
                            <span className="flex items-center gap-0.5"><Image src="/Icons/grey/subject.svg" alt="" width={10} height={10} />{task.subject}</span>
                            <span className="flex items-center gap-0.5"><Image src="/Icons/grey/teacher:person.svg" alt="" width={10} height={10} />{task.teacherName}</span>
                            <span className="flex items-center gap-0.5"><Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />
                              {due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </Link>
                        <DoneButton done={isDone} overdue={isOverdue} onClick={() => toggleDone(task.id)} />
                      </div>
                      {idx < sortedTasks.length - 1 && <div className="h-px bg-[#2D2D2D]/10" />}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
