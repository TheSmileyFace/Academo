"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Loader2, Check, Users, ChevronDown, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface YearGroup {
  id: string;
  name: string;
  classes: ClassItem[];
}

interface ClassItem {
  id: string;
  name: string;
  year_group_id: string;
  year_group_name: string;
}

interface StudentOption {
  id: string;
  full_name: string;
  email: string;
}

export default function CreateExam() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examDate, setExamDate] = useState("");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [expandedYearGroups, setExpandedYearGroups] = useState<Set<string>>(new Set());

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teacherSubject, setTeacherSubject] = useState<string>("");

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id, subject_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) { setLoading(false); return; }
      setSchoolId(profile.school_id);

      if (profile.subject_id) {
        const { data: sub } = await supabase
          .from("subjects")
          .select("name")
          .eq("id", profile.subject_id)
          .single();
        if (sub) setTeacherSubject(sub.name);
      }

      const { data: ygData } = await supabase
        .from("year_groups")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("name");

      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, year_group_id")
        .eq("school_id", profile.school_id)
        .order("name");

      const ygs: YearGroup[] = (ygData || []).map((yg) => ({
        id: yg.id,
        name: yg.name,
        classes: (classData || [])
          .filter((c) => c.year_group_id === yg.id)
          .map((c) => ({ id: c.id, name: c.name, year_group_id: yg.id, year_group_name: yg.name })),
      }));

      setYearGroups(ygs);
      setExpandedYearGroups(new Set(ygs.map((yg) => yg.id)));
      setLoading(false);
    }
    init();
  }, [supabase]);

  const allClasses = yearGroups.flatMap((yg) => yg.classes);

  const toggleExpand = (ygId: string) => {
    setExpandedYearGroups((prev) => {
      const next = new Set(prev);
      if (next.has(ygId)) next.delete(ygId); else next.add(ygId);
      return next;
    });
  };

  const toggleYearGroup = (yg: YearGroup) => {
    const ids = yg.classes.map((c) => c.id);
    const all = ids.every((id) => selectedClassIds.has(id));
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (all) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId); else next.add(classId);
      return next;
    });
  };

  const fetchStudentsForClasses = useCallback(async (classIds: string[]) => {
    if (classIds.length === 0) { setStudents([]); setSelectedStudents(new Set()); return; }
    setLoadingStudents(true);
    const { data: enrollments } = await supabase
      .from("student_enrollments").select("student_id").in("class_id", classIds);
    if (!enrollments || enrollments.length === 0) { setStudents([]); setSelectedStudents(new Set()); setLoadingStudents(false); return; }
    const uniqueIds = [...new Set(enrollments.map((e) => e.student_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", uniqueIds).eq("role", "student");
    const list = profiles || [];
    setStudents(list);
    setSelectedStudents(new Set(list.map((s) => s.id)));
    setLoadingStudents(false);
  }, [supabase]);

  useEffect(() => { fetchStudentsForClasses(Array.from(selectedClassIds)); }, [selectedClassIds, fetchStudentsForClasses]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleAllStudents = () => {
    if (selectedStudents.size === students.length) setSelectedStudents(new Set());
    else setSelectedStudents(new Set(students.map((s) => s.id)));
  };

  const handleCreate = async () => {
    if (!title || !examDate) { toast.error("Please fill in title and exam date"); return; }
    if (selectedClassIds.size === 0) { toast.error("Please select at least one class"); return; }

    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schoolId) { setCreating(false); return; }

    const selectedClasses = allClasses.filter((c) => selectedClassIds.has(c.id));
    const classLabel = selectedClasses.map((c) => `${c.year_group_name} ${c.name}`).join(", ");
    const primaryClassId = selectedClasses[0]?.id || null;

    const { data: exam, error: examErr } = await supabase
      .from("exams")
      .insert({
        title,
        description,
        subject: teacherSubject || "General",
        class_id: primaryClassId,
        class_name: classLabel,
        exam_date: new Date(examDate).toISOString(),
        duration_minutes: parseInt(duration) || 60,
        created_by: user.id,
        school_id: schoolId,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (examErr || !exam) {
      toast.error("Failed to create exam: " + (examErr?.message || "Unknown error"));
      setCreating(false);
      return;
    }

    const studentRows = Array.from(selectedStudents).map((sid) => ({ exam_id: exam.id, student_id: sid }));
    if (studentRows.length > 0) {
      const { error: studErr } = await supabase.from("exam_students").insert(studentRows);
      if (studErr) { toast.error("Exam created but failed to assign students: " + studErr.message); setCreating(false); return; }
    }

    toast.success(`Exam scheduled for ${selectedStudents.size} student${selectedStudents.size === 1 ? "" : "s"}!`);
    router.push("/dashboard/teacher");
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Schedule Exam</h1>
        <p className="mt-1 text-gray-500">{teacherSubject ? `${teacherSubject} Department` : "Create and schedule an exam for your students"}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 space-y-5">
          <div>
            <Label className="text-sm font-medium text-gray-700">Exam Title *</Label>
            <Input placeholder="e.g., Mid-Term Mathematics Exam" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 rounded-xl border-gray-200" />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">Description / Instructions</Label>
            <Textarea placeholder="Exam instructions, topics covered, allowed materials..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1.5 rounded-xl border-gray-200" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">Exam Date *</Label>
              <Input type="datetime-local" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1.5 rounded-xl border-gray-200" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Duration (minutes)</Label>
              <Input type="number" min="10" max="300" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1.5 rounded-xl border-gray-200" />
            </div>
          </div>

          {/* Year Group & Class Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" /> Select Classes *
              {selectedClassIds.size > 0 && <span className="text-xs font-bold bg-blue-50 text-[#1e3a5f] rounded-full px-2 py-0.5">{selectedClassIds.size} selected</span>}
            </Label>

            {yearGroups.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-[#1e3a5f] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#1e3a5f]">No year groups or classes set up yet</p>
                <p className="text-xs text-[#1e3a5f] mt-1 mb-3">Your school admin needs to create year groups and classes first.</p>
                <Link href="/dashboard/admin/onboarding" className="text-xs font-semibold text-[#1e3a5f] hover:text-[#1e3a5f] underline">Go to School Setup</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {yearGroups.map((yg) => {
                  const ygClassIds = yg.classes.map((c) => c.id);
                  const allSel = ygClassIds.length > 0 && ygClassIds.every((id) => selectedClassIds.has(id));
                  const someSel = ygClassIds.some((id) => selectedClassIds.has(id));
                  const isExpanded = expandedYearGroups.has(yg.id);
                  return (
                    <div key={yg.id} className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <button onClick={() => toggleYearGroup(yg)} className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all shrink-0 ${allSel ? "border-[#1e3a5f] bg-blue-500" : someSel ? "border-blue-300 bg-blue-50" : "border-gray-300"}`}>
                          {allSel && <Check className="h-3.5 w-3.5 text-white" />}
                          {someSel && !allSel && <div className="h-2 w-2 rounded-sm bg-blue-500" />}
                        </button>
                        <button onClick={() => toggleYearGroup(yg)} className="flex-1 text-left">
                          <span className="text-sm font-bold text-gray-900">{yg.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{yg.classes.length} class{yg.classes.length !== 1 ? "es" : ""}</span>
                        </button>
                        <button onClick={() => toggleExpand(yg.id)} className="p-1 rounded-lg hover:bg-gray-200 transition-colors">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                      {isExpanded && yg.classes.length > 0 && (
                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                          {yg.classes.map((cls) => {
                            const isSel = selectedClassIds.has(cls.id);
                            return (
                              <button key={cls.id} onClick={() => toggleClass(cls.id)} className={`flex items-center gap-3 w-full p-3 pl-6 text-left transition-colors ${isSel ? "bg-blue-50/50" : "hover:bg-gray-50"}`}>
                                <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all shrink-0 ${isSel ? "border-[#1e3a5f] bg-blue-500" : "border-gray-300"}`}>
                                  {isSel && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">{cls.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Student Selection */}
          {selectedClassIds.size > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Users className="h-4 w-4" /> Students ({selectedStudents.size}/{students.length})</Label>
                {students.length > 0 && <button onClick={toggleAllStudents} className="text-xs font-semibold text-[#1e3a5f] hover:text-[#1e3a5f]">{selectedStudents.size === students.length ? "Deselect All" : "Select All"}</button>}
              </div>
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : students.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                  <p className="text-sm text-gray-400">No students enrolled in the selected classes</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {students.map((s) => {
                    const sel = selectedStudents.has(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleStudent(s.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${sel ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${sel ? "border-[#1e3a5f] bg-blue-500" : "border-gray-300"}`}>
                          {sel && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.full_name || "Unnamed"}</p>
                          <p className="text-xs text-gray-400 truncate">{s.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button onClick={handleCreate} disabled={creating} className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl h-11 px-6">
              {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</> : <>Schedule Exam <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
