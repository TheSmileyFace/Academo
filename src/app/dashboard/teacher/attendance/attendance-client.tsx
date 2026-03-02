"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Image from "next/image";

interface ClassItem {
  id: string;
  name: string;
  year_group_name: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
  notes: string;
  saved: boolean;
}

interface Props {
  classes: ClassItem[];
  teacherId: string;
  schoolId: string;
}

const STATUS_LABELS: Record<AttendanceStatus, { label: string; bg: string; text: string; activeBg: string; activeText: string }> = {
  present: { label: "P", bg: "bg-[#2D2D2D]/5 dark:bg-white/5", text: "text-[#9A9A9A]", activeBg: "bg-green-500", activeText: "text-white" },
  late: { label: "L", bg: "bg-[#2D2D2D]/5 dark:bg-white/5", text: "text-[#9A9A9A]", activeBg: "bg-amber-500", activeText: "text-white" },
  absent: { label: "A", bg: "bg-[#2D2D2D]/5 dark:bg-white/5", text: "text-[#9A9A9A]", activeBg: "bg-red-500", activeText: "text-white" },
  excused: { label: "E", bg: "bg-[#2D2D2D]/5 dark:bg-white/5", text: "text-[#9A9A9A]", activeBg: "bg-[#9A9A9A]", activeText: "text-white" },
};

export default function AttendanceClient({ classes, teacherId, schoolId }: Props) {
  const supabase = createClient();

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allSaved, setAllSaved] = useState(false);

  const loadStudentsAndAttendance = useCallback(async (classId: string, date: string) => {
    if (!classId) return;
    setLoadingStudents(true);

    // Get enrolled students
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id, profiles(id, full_name, email, avatar_url)")
      .eq("class_id", classId);

    const loadedStudents: Student[] = (enrollments || []).map((e) => {
      const p = e.profiles as any;
      return { id: p.id, full_name: p.full_name || "Unnamed", email: p.email || "", avatar_url: p.avatar_url || null };
    });
    loadedStudents.sort((a, b) => a.full_name.localeCompare(b.full_name));
    setStudents(loadedStudents);

    // Load existing attendance for this date
    const studentIds = loadedStudents.map((s) => s.id);
    let existingMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
    if (studentIds.length > 0) {
      const { data: existing } = await supabase
        .from("attendance")
        .select("student_id, status, notes")
        .in("student_id", studentIds)
        .eq("date", date)
        .eq("class_id", classId);

      (existing || []).forEach((r) => {
        existingMap[r.student_id] = { status: r.status as AttendanceStatus, notes: r.notes || "" };
      });
    }

    const initialRecords: Record<string, AttendanceRecord> = {};
    loadedStudents.forEach((s) => {
      initialRecords[s.id] = {
        student_id: s.id,
        status: existingMap[s.id]?.status || "present",
        notes: existingMap[s.id]?.notes || "",
        saved: !!existingMap[s.id],
      };
    });
    setRecords(initialRecords);
    setAllSaved(Object.values(initialRecords).every((r) => r.saved));
    setLoadingStudents(false);
  }, [supabase]);

  useEffect(() => {
    if (selectedClassId) loadStudentsAndAttendance(selectedClassId, selectedDate);
  }, [selectedClassId, selectedDate, loadStudentsAndAttendance]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status, saved: false } }));
    setAllSaved(false);
  };

  const setNotes = (studentId: string, notes: string) => {
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], notes, saved: false } }));
  };

  const markAll = (status: AttendanceStatus) => {
    setRecords((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => { next[id] = { ...next[id], status, saved: false }; });
      return next;
    });
    setAllSaved(false);
  };

  const saveAll = async () => {
    if (students.length === 0) return;
    setSaving(true);

    const rows = students.map((s) => ({
      student_id: s.id,
      class_id: selectedClassId,
      school_id: schoolId,
      date: selectedDate,
      status: records[s.id]?.status || "present",
      notes: records[s.id]?.notes || null,
      recorded_by: teacherId,
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" });

    if (error) {
      toast.error("Failed to save attendance");
    } else {
      setRecords((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => { next[id] = { ...next[id], saved: true }; });
        return next;
      });
      setAllSaved(true);
      toast.success("Attendance saved");
    }
    setSaving(false);
  };

  const presentCount = Object.values(records).filter((r) => r.status === "present").length;
  const absentCount = Object.values(records).filter((r) => r.status === "absent").length;
  const lateCount = Object.values(records).filter((r) => r.status === "late").length;

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      {/* Controls */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#2D2D2D] dark:text-white outline-none cursor-pointer"
            />
          </div>

          {/* Class picker */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Class</label>
            <div className="flex gap-2 flex-wrap">
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${
                    selectedClassId === c.id
                      ? "bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D]"
                      : "bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A] hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10"
                  }`}
                >
                  {c.year_group_name ? `${c.year_group_name} ${c.name}` : c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mark register */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <Image src="/Icons/black/schedule black.svg" alt="" width={18} height={18} className="dark:invert opacity-60" />
            <span className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">
              Register · {students.length} students
            </span>
            {students.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="text-green-600 dark:text-green-400">{presentCount}P</span>
                <span className="text-amber-600 dark:text-amber-400">{lateCount}L</span>
                <span className="text-red-500 dark:text-red-400">{absentCount}A</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Quick mark all */}
            <button onClick={() => markAll("present")} className="text-[11px] font-bold text-green-600 dark:text-green-400 hover:underline">All P</button>
            <span className="text-[#9A9A9A]">·</span>
            <button onClick={() => markAll("absent")} className="text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline">All A</button>
            <div className="w-px h-4 bg-[#2D2D2D]/10 dark:bg-white/10 mx-1" />
            <button
              onClick={saveAll}
              disabled={saving || allSaved || students.length === 0}
              className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                allSaved
                  ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default"
                  : "bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] hover:opacity-80 disabled:opacity-40"
              }`}
            >
              {saving ? "Saving…" : allSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingStudents ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-[#2D2D2D]/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No students enrolled</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Add students to this class from the admin setup</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {students.map((s) => {
                const rec = records[s.id];
                if (!rec) return null;
                const initials = s.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-bold text-[#9A9A9A]">{initials}</span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white truncate">{s.full_name}</p>
                    </div>

                    {/* Status buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(Object.entries(STATUS_LABELS) as [AttendanceStatus, typeof STATUS_LABELS[AttendanceStatus]][]).map(([status, cfg]) => (
                        <button
                          key={status}
                          onClick={() => setStatus(s.id, status)}
                          className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${
                            rec.status === status ? `${cfg.activeBg} ${cfg.activeText}` : `${cfg.bg} ${cfg.text} hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10`
                          }`}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>

                    {/* Saved indicator */}
                    {rec.saved && (
                      <span className="text-[10px] font-bold text-green-500 shrink-0">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
