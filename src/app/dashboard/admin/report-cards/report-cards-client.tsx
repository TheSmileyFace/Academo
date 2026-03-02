"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ClassItem { id: string; name: string; year_group_name: string; }
interface Subject { id: string; name: string; }
interface ReportCard {
  id: string;
  student_id: string;
  student_name: string;
  class_id: string | null;
  term: string;
  academic_year: string;
  overall_grade: number | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  grades: any;
  teacher_comment: string | null;
  admin_comment: string | null;
}

interface Props {
  schoolId: string;
  adminId: string;
  classes: ClassItem[];
  subjects: Subject[];
  existingReportCards: ReportCard[];
}

const TERMS = ["Term 1", "Term 2", "Term 3", "Semester 1", "Semester 2", "Annual"];

export default function ReportCardsClient({ schoolId, adminId, classes, subjects, existingReportCards }: Props) {
  const supabase = createClient();
  const [reportCards, setReportCards] = useState<ReportCard[]>(existingReportCards);
  const [view, setView] = useState<"list" | "create">("list");

  // Create form state
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "");
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [gradeEntries, setGradeEntries] = useState<{ subject_id: string; subject_name: string; grade: string; comment: string }[]>([]);
  const [overallGrade, setOverallGrade] = useState("");
  const [teacherComment, setTeacherComment] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  const loadStudents = async (classId: string) => {
    setLoadingStudents(true);
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id, profiles(id, full_name)")
      .eq("class_id", classId);

    const studs = (enrollments || [])
      .map((e) => {
        const p = e.profiles as any;
        return { id: p?.id || e.student_id, full_name: p?.full_name || "Unknown" };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    setStudents(studs);
    if (studs.length > 0) setSelectedStudentId(studs[0].id);
    setLoadingStudents(false);
  };

  const startCreate = () => {
    setView("create");
    setGradeEntries(subjects.map((s) => ({ subject_id: s.id, subject_name: s.name, grade: "", comment: "" })));
    if (selectedClassId) loadStudents(selectedClassId);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    loadStudents(classId);
  };

  const updateGrade = (idx: number, field: "grade" | "comment", value: string) => {
    setGradeEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleSave = async (publish: boolean) => {
    if (!selectedStudentId) { toast.error("Select a student"); return; }
    setSaving(true);

    const gradesJson = gradeEntries.map((e) => ({
      subject_id: e.subject_id,
      subject_name: e.subject_name,
      grade: e.grade ? parseFloat(e.grade) : null,
      comment: e.comment || null,
    }));

    const { data, error } = await supabase
      .from("report_cards")
      .insert({
        student_id: selectedStudentId,
        school_id: schoolId,
        class_id: selectedClassId || null,
        term: selectedTerm,
        academic_year: academicYear,
        grades: gradesJson,
        overall_grade: overallGrade ? parseFloat(overallGrade) : null,
        teacher_comment: teacherComment.trim() || null,
        admin_comment: adminComment.trim() || null,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
        created_by: adminId,
      })
      .select("id, student_id, class_id, term, academic_year, overall_grade, published, published_at, created_at, grades, teacher_comment, admin_comment")
      .single();

    if (error) {
      toast.error("Failed to save report card");
    } else {
      const studentName = students.find((s) => s.id === selectedStudentId)?.full_name || "Unknown";
      setReportCards((prev) => [{ ...data, student_name: studentName }, ...prev]);
      toast.success(publish ? "Report card published!" : "Report card saved as draft");
      setView("list");
      // Reset form
      setGradeEntries(subjects.map((s) => ({ subject_id: s.id, subject_name: s.name, grade: "", comment: "" })));
      setOverallGrade("");
      setTeacherComment("");
      setAdminComment("");
    }
    setSaving(false);
  };

  const togglePublish = async (rc: ReportCard) => {
    setPublishing(rc.id);
    const newPublished = !rc.published;
    const { error } = await supabase
      .from("report_cards")
      .update({
        published: newPublished,
        published_at: newPublished ? new Date().toISOString() : null,
      })
      .eq("id", rc.id);

    if (!error) {
      setReportCards((prev) => prev.map((r) =>
        r.id === rc.id ? { ...r, published: newPublished, published_at: newPublished ? new Date().toISOString() : null } : r
      ));
      toast.success(newPublished ? "Published" : "Unpublished");
    } else {
      toast.error("Failed to update");
    }
    setPublishing(null);
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (view === "create") {
    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setView("list")}
            className="text-[12px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white transition-colors"
          >
            ← Back
          </button>
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Create Report Card</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
          {/* Meta */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
            <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.year_group_name} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Student</label>
                {loadingStudents ? (
                  <p className="text-[12px] text-[#9A9A9A]">Loading…</p>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white outline-none"
                  >
                    {students.length === 0 && <option value="">No students enrolled</option>}
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white outline-none"
                >
                  {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Academic Year</label>
                <input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Overall Grade (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={overallGrade}
                  onChange={(e) => setOverallGrade(e.target.value)}
                  placeholder="e.g. 78"
                  className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
                />
              </div>
            </div>

            {/* Comments */}
            <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Teacher Comment</label>
                <textarea
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  rows={3}
                  placeholder="Overall teacher feedback..."
                  className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2.5 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Admin Comment</label>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  rows={2}
                  placeholder="Head teacher comment..."
                  className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2.5 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1 bg-[#2D2D2D]/5 dark:bg-white/5 text-[#2D2D2D] dark:text-white text-[12px] font-bold py-2.5 rounded-xl hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10 disabled:opacity-40 transition-all"
              >
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex-1 bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold py-2.5 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {saving ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>

          {/* Subject grades */}
          <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Subject Grades</p>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {gradeEntries.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[12px] text-[#9A9A9A]">No subjects set up. Add subjects in School Setup first.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {gradeEntries.map((entry, idx) => (
                    <div key={entry.subject_id} className="px-5 py-3 flex flex-col sm:flex-row gap-3">
                      <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white w-32 shrink-0 pt-1.5">{entry.subject_name}</p>
                      <input
                        type="number" min="0" max="100"
                        value={entry.grade}
                        onChange={(e) => updateGrade(idx, "grade", e.target.value)}
                        placeholder="Grade %"
                        className="w-24 bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-1.5 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none shrink-0"
                      />
                      <input
                        value={entry.comment}
                        onChange={(e) => updateGrade(idx, "comment", e.target.value)}
                        placeholder="Comment (optional)"
                        className="flex-1 bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-1.5 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[13px] text-[#9A9A9A]">{reportCards.length} report card{reportCards.length !== 1 ? "s" : ""}</p>
        <button
          onClick={startCreate}
          className="bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
        >
          + Create Report Card
        </button>
      </div>

      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          {reportCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No report cards yet</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Create the first report card using the button above</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {reportCards.map((rc) => (
                <div key={rc.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{rc.student_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#9A9A9A] mt-0.5">
                      <span>{rc.term}</span>
                      <span>·</span>
                      <span>{rc.academic_year}</span>
                      <span>·</span>
                      <span>{fmtDate(rc.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {rc.overall_grade != null && (
                      <span className={`text-[15px] font-bold ${
                        rc.overall_grade >= 70 ? "text-green-600 dark:text-green-400" : rc.overall_grade >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"
                      }`}>
                        {rc.overall_grade}%
                      </span>
                    )}
                    <button
                      onClick={() => togglePublish(rc)}
                      disabled={publishing === rc.id}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                        rc.published
                          ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-[#2D2D2D]/5 text-[#9A9A9A] dark:bg-white/5 hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10"
                      }`}
                    >
                      {publishing === rc.id ? "…" : rc.published ? "Published" : "Draft"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
