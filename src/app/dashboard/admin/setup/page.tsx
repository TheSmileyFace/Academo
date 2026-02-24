"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Layers, FolderOpen, BookOpen, Plus, Trash2, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface YearGroup {
  id: string;
  name: string;
  sort_order: number;
}

interface ClassItem {
  id: string;
  name: string;
  year_group_id: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

const SUBJECT_COLORS = [
  "#059669", "#0891b2", "#7c3aed", "#dc2626", "#ea580c",
  "#ca8a04", "#2563eb", "#c026d3", "#475569", "#16a34a",
];

export default function AdminSetupPage() {
  const supabase = createClient();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Year groups
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [newYearGroupName, setNewYearGroupName] = useState("");
  const [addingYearGroup, setAddingYearGroup] = useState(false);

  // Classes
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedYearGroup, setSelectedYearGroup] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [addingClass, setAddingClass] = useState(false);

  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [addingSubject, setAddingSubject] = useState(false);

  const fetchData = useCallback(async (sid: string) => {
    const [ygRes, clRes, subRes] = await Promise.all([
      supabase.from("year_groups").select("*").eq("school_id", sid).order("sort_order"),
      supabase.from("classes").select("*").eq("school_id", sid).order("name"),
      supabase.from("subjects").select("*").eq("school_id", sid).order("name"),
    ]);
    setYearGroups(ygRes.data || []);
    setClasses(clRes.data || []);
    setSubjects(subRes.data || []);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        await fetchData(profile.school_id);
      }
      setLoading(false);
    }
    init();
  }, [supabase, fetchData]);

  // ── Year Groups ──
  const addYearGroup = async () => {
    if (!schoolId || !newYearGroupName.trim()) return;
    setAddingYearGroup(true);
    const { error } = await supabase.from("year_groups").insert({
      school_id: schoolId,
      name: newYearGroupName.trim(),
      sort_order: yearGroups.length,
    });
    if (!error) {
      setNewYearGroupName("");
      await fetchData(schoolId);
    }
    setAddingYearGroup(false);
  };

  const deleteYearGroup = async (id: string) => {
    if (!schoolId) return;
    // Delete invite codes for classes in this year group
    const ygClasses = classes.filter((c) => c.year_group_id === id);
    for (const cl of ygClasses) {
      await supabase.from("school_invite_codes").delete().eq("class_id", cl.id);
    }
    await supabase.from("classes").delete().eq("year_group_id", id);
    await supabase.from("year_groups").delete().eq("id", id);
    if (selectedYearGroup === id) setSelectedYearGroup(null);
    await fetchData(schoolId);
  };

  // ── Classes ──
  const addClass = async () => {
    if (!schoolId || !userId || !selectedYearGroup || !newClassName.trim()) return;
    setAddingClass(true);
    const { data: newClass } = await supabase.from("classes").insert({
      school_id: schoolId,
      year_group_id: selectedYearGroup,
      name: newClassName.trim(),
    }).select("id").single();
    // Auto-create student invite code for this class
    if (newClass) {
      await supabase.from("school_invite_codes").insert({
        school_id: schoolId,
        role: "student",
        class_id: newClass.id,
        created_by: userId,
      });
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
  };

  // ── Subjects ──
  const addSubject = async () => {
    if (!schoolId || !newSubjectName.trim()) return;
    setAddingSubject(true);
    const { error } = await supabase.from("subjects").insert({
      school_id: schoolId,
      name: newSubjectName.trim(),
      color: newSubjectColor,
    });
    if (!error) {
      setNewSubjectName("");
      setNewSubjectColor(SUBJECT_COLORS[(subjects.length + 1) % SUBJECT_COLORS.length]);
      await fetchData(schoolId);
    }
    setAddingSubject(false);
  };

  const deleteSubject = async (id: string) => {
    if (!schoolId) return;
    await supabase.from("subjects").delete().eq("id", id);
    await fetchData(schoolId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  const selectedYGClasses = classes.filter((c) => c.year_group_id === selectedYearGroup);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">School Setup</h1>
        <p className="mt-1 text-gray-500">
          Create year groups, add classes, and define the subjects your school teaches.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Year Groups ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Layers className="h-5 w-5 text-[#1e3a5f]" />
              Year Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Year 7"
                value={newYearGroupName}
                onChange={(e) => setNewYearGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addYearGroup()}
                className="flex-1"
              />
              <Button
                onClick={addYearGroup}
                disabled={addingYearGroup || !newYearGroupName.trim()}
                className="bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
              >
                {addingYearGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {yearGroups.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No year groups yet. Add your first one above.</p>
            ) : (
              <div className="space-y-1.5">
                {yearGroups.map((yg) => (
                  <div
                    key={yg.id}
                    onClick={() => setSelectedYearGroup(yg.id)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
                      selectedYearGroup === yg.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`h-4 w-4 transition-transform ${selectedYearGroup === yg.id ? "rotate-90 text-[#1e3a5f]" : "text-gray-300"}`} />
                      <span className="text-sm font-medium text-gray-900">{yg.name}</span>
                      <span className="text-xs text-gray-400">
                        {classes.filter((c) => c.year_group_id === yg.id).length} classes
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteYearGroup(yg.id); }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Classes ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <FolderOpen className="h-5 w-5 text-[#1e3a5f]" />
              Classes
              {selectedYearGroup && (
                <span className="text-sm font-normal text-gray-400">
                  — {yearGroups.find((yg) => yg.id === selectedYearGroup)?.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedYearGroup ? (
              <p className="text-sm text-gray-400 text-center py-6">Select a year group on the left to manage its classes.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 7A"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addClass()}
                    className="flex-1"
                  />
                  <Button
                    onClick={addClass}
                    disabled={addingClass || !newClassName.trim()}
                    className="bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
                  >
                    {addingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>

                {selectedYGClasses.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No classes in this year group yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedYGClasses.map((cl) => (
                      <div
                        key={cl.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
                      >
                        <span className="text-sm font-medium text-gray-900">{cl.name}</span>
                        <button
                          onClick={() => deleteClass(cl.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Subjects ── */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BookOpen className="h-5 w-5 text-[#1e3a5f]" />
              Subjects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Mathematics"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                className="flex-1"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <Label className="text-xs text-gray-400 sr-only">Color</Label>
                <div className="flex gap-1">
                  {SUBJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewSubjectColor(color)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        newSubjectColor === color ? "border-gray-900 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={addSubject}
                disabled={addingSubject || !newSubjectName.trim()}
                className="bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
              >
                {addingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No subjects yet. Add your school&apos;s subjects above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    className="group inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white pl-3 pr-1.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                    <button
                      onClick={() => deleteSubject(s.id)}
                      className="ml-0.5 rounded-full p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
