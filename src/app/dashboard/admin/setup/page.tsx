"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface YearGroup { id: string; name: string; sort_order: number; }
interface ClassItem { id: string; name: string; year_group_id: string; }
interface Subject { id: string; name: string; color: string; }
interface TeacherProfile { id: string; full_name: string; }
interface ClassSubjectLink { id: string; class_id: string; subject_id: string; teacher_id: string | null; }

const SUBJECT_COLORS = [
  "#059669", "#0891b2", "#7c3aed", "#dc2626", "#ea580c",
  "#ca8a04", "#2563eb", "#c026d3", "#475569", "#16a34a",
];

export default function AdminSetupPage() {
  const supabase = createClient();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [newYearGroupName, setNewYearGroupName] = useState("");
  const [addingYearGroup, setAddingYearGroup] = useState(false);
  const [selectedYearGroup, setSelectedYearGroup] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [addingClass, setAddingClass] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [addingSubject, setAddingSubject] = useState(false);

  // Class-subject-teacher linking
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [classSubjectLinks, setClassSubjectLinks] = useState<ClassSubjectLink[]>([]);
  const [linkClassId, setLinkClassId] = useState("");
  const [linkSubjectId, setLinkSubjectId] = useState("");
  const [linkTeacherId, setLinkTeacherId] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  const fetchData = useCallback(async (sid: string) => {
    const [ygRes, clRes, subRes, teachRes, csRes] = await Promise.all([
      supabase.from("year_groups").select("*").eq("school_id", sid).order("sort_order"),
      supabase.from("classes").select("*").eq("school_id", sid).order("name"),
      supabase.from("subjects").select("*").eq("school_id", sid).order("name"),
      supabase.from("profiles").select("id, full_name").eq("school_id", sid).eq("role", "teacher").order("full_name"),
      supabase.from("class_subjects").select("id, class_id, subject_id, teacher_id").eq("school_id", sid),
    ]);
    setYearGroups(ygRes.data || []);
    setClasses(clRes.data || []);
    setSubjects(subRes.data || []);
    setTeachers(teachRes.data || []);
    setClassSubjectLinks(csRes.data || []);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        await fetchData(profile.school_id);
      }
      setLoading(false);
    }
    init();
  }, [supabase, fetchData]);

  const addYearGroup = async () => {
    if (!schoolId || !newYearGroupName.trim()) return;
    setAddingYearGroup(true);
    const { error } = await supabase.from("year_groups").insert({ school_id: schoolId, name: newYearGroupName.trim(), sort_order: yearGroups.length });
    if (!error) { setNewYearGroupName(""); await fetchData(schoolId); toast.success("Year group added"); }
    else toast.error("Failed to add year group");
    setAddingYearGroup(false);
  };

  const deleteYearGroup = async (id: string) => {
    if (!schoolId) return;
    const ygClasses = classes.filter((c) => c.year_group_id === id);
    for (const cl of ygClasses) await supabase.from("school_invite_codes").delete().eq("class_id", cl.id);
    await supabase.from("classes").delete().eq("year_group_id", id);
    await supabase.from("year_groups").delete().eq("id", id);
    if (selectedYearGroup === id) setSelectedYearGroup(null);
    await fetchData(schoolId);
    toast.success("Year group removed");
  };

  const addClass = async () => {
    if (!schoolId || !userId || !selectedYearGroup || !newClassName.trim()) return;
    setAddingClass(true);
    const { data: newClass } = await supabase.from("classes").insert({ school_id: schoolId, year_group_id: selectedYearGroup, name: newClassName.trim() }).select("id").single();
    if (newClass) {
      await supabase.from("school_invite_codes").insert({ school_id: schoolId, role: "student", class_id: newClass.id, created_by: userId });
      toast.success("Class added");
    }
    setNewClassName("");
    await fetchData(schoolId);
    setAddingClass(false);
  };

  const deleteClass = async (id: string) => {
    if (!schoolId) return;
    await supabase.from("school_invite_codes").delete().eq("class_id", id);
    await supabase.from("classes").delete().eq("id", id);
    await fetchData(schoolId);
    toast.success("Class removed");
  };

  const addSubject = async () => {
    if (!schoolId || !newSubjectName.trim()) return;
    setAddingSubject(true);
    const { error } = await supabase.from("subjects").insert({ school_id: schoolId, name: newSubjectName.trim(), color: newSubjectColor });
    if (!error) {
      setNewSubjectName("");
      setNewSubjectColor(SUBJECT_COLORS[(subjects.length + 1) % SUBJECT_COLORS.length]);
      await fetchData(schoolId);
      toast.success("Subject added");
    } else toast.error("Failed to add subject");
    setAddingSubject(false);
  };

  const deleteSubject = async (id: string) => {
    if (!schoolId) return;
    await supabase.from("subjects").delete().eq("id", id);
    await fetchData(schoolId);
    toast.success("Subject removed");
  };

  const addLink = async () => {
    if (!schoolId || !linkClassId || !linkSubjectId) { toast.error("Select a class and subject"); return; }
    const existing = classSubjectLinks.find((l) => l.class_id === linkClassId && l.subject_id === linkSubjectId);
    if (existing) { toast.error("This class-subject link already exists"); return; }
    setAddingLink(true);
    const { error } = await supabase.from("class_subjects").insert({
      school_id: schoolId,
      class_id: linkClassId,
      subject_id: linkSubjectId,
      teacher_id: linkTeacherId || null,
    });
    if (!error) {
      await fetchData(schoolId);
      setLinkClassId(""); setLinkSubjectId(""); setLinkTeacherId("");
      toast.success("Assignment created");
    } else toast.error("Failed to create assignment");
    setAddingLink(false);
  };

  const deleteLink = async (id: string) => {
    setDeletingLinkId(id);
    await supabase.from("class_subjects").delete().eq("id", id);
    setClassSubjectLinks((prev) => prev.filter((l) => l.id !== id));
    toast.success("Assignment removed");
    setDeletingLinkId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 border-[#2D2D2D]/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
      </div>
    );
  }

  const selectedYGClasses = classes.filter((c) => c.year_group_id === selectedYearGroup);

  const classMap: Record<string, string> = {};
  classes.forEach((c) => { classMap[c.id] = c.name; });
  const subjectMap: Record<string, Subject> = {};
  subjects.forEach((s) => { subjectMap[s.id] = s; });
  const teacherMap: Record<string, string> = {};
  teachers.forEach((t) => { teacherMap[t.id] = t.full_name; });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Admin</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">School Setup</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0 pb-4">
        {/* Year Groups */}
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
            <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Year Groups</p>
          </div>
          <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Year 7"
                value={newYearGroupName}
                onChange={(e) => setNewYearGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addYearGroup()}
                className="flex-1 bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
              />
              <button
                onClick={addYearGroup}
                disabled={addingYearGroup || !newYearGroupName.trim()}
                className="bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold px-4 py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
              >
                {addingYearGroup ? "…" : "+ Add"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {yearGroups.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-[12px] text-[#9A9A9A]">No year groups yet</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {yearGroups.map((yg) => (
                  <div
                    key={yg.id}
                    onClick={() => setSelectedYearGroup(yg.id === selectedYearGroup ? null : yg.id)}
                    className={`px-5 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedYearGroup === yg.id ? "bg-[#2D2D2D]/[0.04] dark:bg-white/[0.04]" : "hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] transition-transform inline-block ${selectedYearGroup === yg.id ? "rotate-90" : ""}`}>▶</span>
                      <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{yg.name}</p>
                      <span className="text-[11px] text-[#9A9A9A]">{classes.filter((c) => c.year_group_id === yg.id).length} classes</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteYearGroup(yg.id); }}
                      className="text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Classes */}
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 flex items-center justify-between">
            <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">
              Classes
              {selectedYearGroup && (
                <span className="text-[12px] font-normal text-[#9A9A9A] ml-1.5">— {yearGroups.find((yg) => yg.id === selectedYearGroup)?.name}</span>
              )}
            </p>
          </div>
          {!selectedYearGroup ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[12px] text-[#9A9A9A] px-8 text-center">Select a year group on the left to manage its classes</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 7A"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addClass()}
                    className="flex-1 bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
                  />
                  <button
                    onClick={addClass}
                    disabled={addingClass || !newClassName.trim()}
                    className="bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold px-4 py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
                  >
                    {addingClass ? "…" : "+ Add"}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {selectedYGClasses.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-[12px] text-[#9A9A9A]">No classes in this year group yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {selectedYGClasses.map((cl) => (
                      <div key={cl.id} className="px-5 py-3 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{cl.name}</p>
                        <button onClick={() => deleteClass(cl.id)} className="text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Subjects */}
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
            <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Subjects</p>
          </div>
          <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                className="flex-1 bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
              />
              <button
                onClick={addSubject}
                disabled={addingSubject || !newSubjectName.trim()}
                className="bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold px-4 py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
              >
                {addingSubject ? "…" : "+ Add"}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {SUBJECT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewSubjectColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${newSubjectColor === color ? "border-[#2D2D2D] dark:border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-3">
            {subjects.length === 0 ? (
              <p className="text-[12px] text-[#9A9A9A] text-center py-6">No subjects yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <div key={s.id} className="group inline-flex items-center gap-2 bg-[#2D2D2D]/5 dark:bg-white/5 rounded-full pl-3 pr-2 py-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[12px] font-semibold text-[#2D2D2D] dark:text-white">{s.name}</span>
                    <button
                      onClick={() => deleteSubject(s.id)}
                      className="text-[10px] font-bold text-[#9A9A9A] hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Class-Subject-Teacher Assignment */}
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
            <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Class · Subject · Teacher</p>
            <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Assign which teacher teaches which subject to which class</p>
          </div>
          {/* Add form */}
          <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <select
                value={linkClassId}
                onChange={(e) => setLinkClassId(e.target.value)}
                className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-2 py-2 text-[12px] text-[#2D2D2D] dark:text-white outline-none"
              >
                <option value="">Class…</option>
                {classes.map((c) => {
                  const yg = yearGroups.find((y) => y.id === c.year_group_id);
                  return <option key={c.id} value={c.id}>{yg ? `${yg.name} ${c.name}` : c.name}</option>;
                })}
              </select>
              <select
                value={linkSubjectId}
                onChange={(e) => setLinkSubjectId(e.target.value)}
                className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-2 py-2 text-[12px] text-[#2D2D2D] dark:text-white outline-none"
              >
                <option value="">Subject…</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                value={linkTeacherId}
                onChange={(e) => setLinkTeacherId(e.target.value)}
                className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-2 py-2 text-[12px] text-[#2D2D2D] dark:text-white outline-none"
              >
                <option value="">Teacher (opt.)</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <button
              onClick={addLink}
              disabled={addingLink || !linkClassId || !linkSubjectId}
              className="w-full bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {addingLink ? "Assigning…" : "Assign"}
            </button>
          </div>
          {/* Existing links */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {classSubjectLinks.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-[12px] text-[#9A9A9A]">No assignments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {classSubjectLinks.map((link) => {
                  const cls = classMap[link.class_id];
                  const sub = subjectMap[link.subject_id];
                  const teacher = link.teacher_id ? teacherMap[link.teacher_id] : null;
                  const yg = classes.find((c) => c.id === link.class_id);
                  const ygName = yg ? yearGroups.find((y) => y.id === yg.year_group_id)?.name : null;
                  return (
                    <div key={link.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {sub && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />}
                        <p className="text-[12px] font-semibold text-[#2D2D2D] dark:text-white truncate">
                          {sub?.name || "Unknown"} — {ygName ? `${ygName} ` : ""}{cls || "Unknown"}
                        </p>
                        {teacher && <span className="text-[10px] text-[#9A9A9A] shrink-0">{teacher}</span>}
                      </div>
                      <button
                        onClick={() => deleteLink(link.id)}
                        disabled={deletingLinkId === link.id}
                        className="text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline disabled:opacity-40 shrink-0"
                      >
                        {deletingLinkId === link.id ? "…" : "Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
