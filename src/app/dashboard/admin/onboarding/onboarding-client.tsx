"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Check,
  Copy,
  Layers,
  FolderOpen,
  BookOpen,
  PartyPopper,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface YearGroup {
  id: string;
  name: string;
  sort_order: number;
}

interface ClassItem {
  id: string;
  name: string;
  year_group_id: string;
  invite_code?: string;
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

const COMMON_SUBJECTS = [
  { name: "Mathematics", color: "#2563eb" },
  { name: "English", color: "#7c3aed" },
  { name: "Science", color: "#059669" },
  { name: "History", color: "#ea580c" },
  { name: "Geography", color: "#0891b2" },
  { name: "Art", color: "#c026d3" },
  { name: "Music", color: "#ca8a04" },
  { name: "Physical Education", color: "#dc2626" },
  { name: "Computing", color: "#475569" },
  { name: "Languages", color: "#16a34a" },
];

const STEPS = [
  { label: "Year Groups", icon: Layers },
  { label: "Classes", icon: FolderOpen },
  { label: "Subjects", icon: BookOpen },
  { label: "Done", icon: PartyPopper },
];

export default function OnboardingClient() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Form state
  const [newYearGroupName, setNewYearGroupName] = useState("");
  const [addingYG, setAddingYG] = useState(false);
  const [newClassNames, setNewClassNames] = useState<Record<string, string>>({});
  const [addingClass, setAddingClass] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [addingSubject, setAddingSubject] = useState(false);

  // Invite codes per class
  const [classCodes, setClassCodes] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) {
        // Admin has no school yet — create one and link it
        const { data: newSchool } = await supabase
          .from("schools")
          .insert({ name: "My School" })
          .select("id")
          .single();

        if (!newSchool) { router.push("/dashboard/admin"); return; }

        await supabase
          .from("profiles")
          .update({ school_id: newSchool.id })
          .eq("id", user.id);

        setSchoolId(newSchool.id);
        setSchoolName("My School");
      } else {
        setSchoolId(profile.school_id);

        const { data: school } = await supabase
          .from("schools")
          .select("name")
          .eq("id", profile.school_id)
          .single();

        setSchoolName(school?.name || "My School");
      }

      setLoading(false);
    }
    init();
  }, [supabase, router]);

  const fetchAll = useCallback(async () => {
    if (!schoolId) return;
    const [ygRes, clRes, subRes, codesRes] = await Promise.all([
      supabase.from("year_groups").select("*").eq("school_id", schoolId).order("sort_order"),
      supabase.from("classes").select("*").eq("school_id", schoolId).order("name"),
      supabase.from("subjects").select("*").eq("school_id", schoolId).order("name"),
      supabase.from("school_invite_codes").select("code, class_id").eq("school_id", schoolId).eq("role", "student"),
    ]);
    setYearGroups(ygRes.data || []);
    setClasses(clRes.data || []);
    setSubjects(subRes.data || []);

    // Build class_id → code map
    const codeMap: Record<string, string> = {};
    (codesRes.data || []).forEach((c: { code: string; class_id: string | null }) => {
      if (c.class_id) codeMap[c.class_id] = c.code;
    });
    setClassCodes(codeMap);
  }, [supabase, schoolId]);

  // ── Step 0: Year Groups ──
  const addYearGroup = async () => {
    if (!newYearGroupName.trim()) return;
    setAddingYG(true);
    await supabase.from("year_groups").insert({
      school_id: schoolId,
      name: newYearGroupName.trim(),
      sort_order: yearGroups.length,
    });
    setNewYearGroupName("");
    await fetchAll();
    setAddingYG(false);
  };

  const deleteYearGroup = async (id: string) => {
    // Delete invite codes for classes in this year group
    const ygClasses = classes.filter((c) => c.year_group_id === id);
    for (const cl of ygClasses) {
      await supabase.from("school_invite_codes").delete().eq("class_id", cl.id);
    }
    await supabase.from("classes").delete().eq("year_group_id", id);
    await supabase.from("year_groups").delete().eq("id", id);
    await fetchAll();
  };

  // ── Step 1: Classes (auto-generates invite code per class) ──
  const addClass = async (yearGroupId: string) => {
    const name = newClassNames[yearGroupId]?.trim();
    if (!name) return;
    setAddingClass(true);

    // Create the class
    const { data: newClass } = await supabase
      .from("classes")
      .insert({ school_id: schoolId, year_group_id: yearGroupId, name })
      .select("id")
      .single();

    // Auto-create an invite code for this class (student role, no expiry)
    if (newClass) {
      await supabase.from("school_invite_codes").insert({
        school_id: schoolId,
        role: "student",
        class_id: newClass.id,
        created_by: userId,
      });
    }

    setNewClassNames((prev) => ({ ...prev, [yearGroupId]: "" }));
    await fetchAll();
    setAddingClass(false);
  };

  const deleteClass = async (id: string) => {
    await supabase.from("school_invite_codes").delete().eq("class_id", id);
    await supabase.from("classes").delete().eq("id", id);
    await fetchAll();
  };

  // ── Step 2: Subjects ──
  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    setAddingSubject(true);
    await supabase.from("subjects").insert({
      school_id: schoolId,
      name: newSubjectName.trim(),
      color: newSubjectColor,
    });
    setNewSubjectName("");
    setNewSubjectColor(SUBJECT_COLORS[(subjects.length + 1) % SUBJECT_COLORS.length]);
    await fetchAll();
    setAddingSubject(false);
  };

  const addCommonSubject = async (name: string, color: string) => {
    // Don't add if already exists
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    await supabase.from("subjects").insert({ school_id: schoolId, name, color });
    await fetchAll();
  };

  const deleteSubject = async (id: string) => {
    await supabase.from("subjects").delete().eq("id", id);
    await fetchAll();
  };

  const copyCode = (classId: string) => {
    const code = classCodes[classId];
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(classId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Progress bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  i < step
                    ? "bg-[#1e3a5f] text-white"
                    : i === step
                    ? "bg-blue-100 text-[#1e3a5f] ring-2 ring-[#1e3a5f]"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${i === step ? "text-[#1e3a5f]" : "text-gray-400"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-200 mx-1" />
              )}
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#1e3a5f] transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* School name header */}
      <div className="text-center mb-8">
        <div className="inline-flex mb-4">
          <Image src="/academo.png" alt="Academo" width={56} height={56} className="rounded-2xl shadow-lg" />
        </div>
        <h2 className="text-lg text-gray-500">
          Setting up <span className="font-semibold text-gray-900">{schoolName}</span>
        </h2>
      </div>

      {/* ═══════════════ Step 0: Year Groups ═══════════════ */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Create Your Year Groups</h1>
            <p className="mt-2 text-gray-500">
              How is your school organized? Add year groups (e.g. Year 7, Year 8, Year 9).
            </p>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Year 7"
                  value={newYearGroupName}
                  onChange={(e) => setNewYearGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addYearGroup()}
                  className="flex-1 h-11"
                />
                <Button
                  onClick={addYearGroup}
                  disabled={addingYG || !newYearGroupName.trim()}
                  className="bg-[#1e3a5f] hover:bg-[#162d4a] h-11 px-5"
                >
                  {addingYG ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
                </Button>
              </div>

              {yearGroups.length > 0 && (
                <div className="space-y-2 pt-2">
                  {yearGroups.map((yg, i) => (
                    <div
                      key={yg.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-[#1e3a5f]">
                          {i + 1}
                        </div>
                        <span className="font-medium text-gray-900">{yg.name}</span>
                      </div>
                      <button onClick={() => deleteYearGroup(yg.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {yearGroups.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">
                  Add at least one year group to continue.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(1)}
              disabled={yearGroups.length === 0}
              className="bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              Next: Add Classes <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════ Step 1: Classes ═══════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Add Classes</h1>
            <p className="mt-2 text-gray-500">
              For each year group, add the classes. Each class gets its own student invite code automatically.
            </p>
          </div>

          {yearGroups.map((yg) => {
            const ygClasses = classes.filter((c) => c.year_group_id === yg.id);
            return (
              <Card key={yg.id} className="border-0 shadow-sm">
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#1e3a5f]" />
                    {yg.name}
                  </h3>

                  <div className="flex gap-2">
                    <Input
                      placeholder={`e.g. ${yg.name.replace("Year ", "")}A`}
                      value={newClassNames[yg.id] || ""}
                      onChange={(e) => setNewClassNames((prev) => ({ ...prev, [yg.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addClass(yg.id)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => addClass(yg.id)}
                      disabled={addingClass || !(newClassNames[yg.id]?.trim())}
                      className="bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
                    >
                      {addingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>

                  {ygClasses.length > 0 && (
                    <div className="space-y-1.5">
                      {ygClasses.map((cl) => (
                        <div
                          key={cl.id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900">{cl.name}</span>
                            {classCodes[cl.id] && (
                              <span className="font-mono text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded">
                                {classCodes[cl.id]}
                              </span>
                            )}
                          </div>
                          <button onClick={() => deleteClass(cl.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)} className="text-gray-500">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={classes.length === 0}
              className="bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              Next: Subjects <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════ Step 2: Subjects ═══════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Choose Your Subjects</h1>
            <p className="mt-2 text-gray-500">
              Pick from common subjects or add your own.
            </p>
          </div>

          {/* Quick-add common subjects */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Common Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {COMMON_SUBJECTS.map((cs) => {
                  const alreadyAdded = subjects.some((s) => s.name.toLowerCase() === cs.name.toLowerCase());
                  return (
                    <button
                      key={cs.name}
                      onClick={() => !alreadyAdded && addCommonSubject(cs.name, cs.color)}
                      disabled={alreadyAdded}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        alreadyAdded
                          ? "border-blue-200 bg-blue-50 text-[#1e3a5f]"
                          : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                      }`}
                    >
                      {alreadyAdded ? (
                        <Check className="h-3.5 w-3.5 text-[#1e3a5f]" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cs.color }} />
                      )}
                      {cs.name}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom subject */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Add Custom Subject</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Drama"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 shrink-0">
                  {SUBJECT_COLORS.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewSubjectColor(color)}
                      className={`h-6 w-6 rounded-full border-2 transition-all ${
                        newSubjectColor === color ? "border-gray-900 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button
                  onClick={addSubject}
                  disabled={addingSubject || !newSubjectName.trim()}
                  className="bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
                >
                  {addingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>

              {/* Added subjects */}
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {subjects.map((s) => (
                    <div
                      key={s.id}
                      className="group inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white pl-3 pr-1.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.name}
                      <button
                        onClick={() => deleteSubject(s.id)}
                        className="rounded-full p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} className="text-gray-500">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={subjects.length === 0}
              className="bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              Finish Setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════ Step 3: Done ═══════════════ */}
      {step === 3 && (
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <div className="text-5xl">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900">
              {schoolName} is ready!
            </h1>
            <p className="text-gray-500 max-w-md mx-auto">
              Your school is set up with {yearGroups.length} year group{yearGroups.length !== 1 ? "s" : ""},
              {" "}{classes.length} class{classes.length !== 1 ? "es" : ""},
              {" "}and {subjects.length} subject{subjects.length !== 1 ? "s" : ""}.
              Share the codes below to invite students.
            </p>
          </div>

          {/* Class codes summary */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Student Invite Codes</h3>
              <p className="text-sm text-gray-400">Each class has its own unique code. Students use this code to join their class.</p>

              {yearGroups.map((yg) => {
                const ygClasses = classes.filter((c) => c.year_group_id === yg.id);
                if (ygClasses.length === 0) return null;
                return (
                  <div key={yg.id} className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-700">{yg.name}</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ygClasses.map((cl) => (
                        <div
                          key={cl.id}
                          className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-900">{cl.name}</span>
                            <span className="ml-3 font-mono text-sm font-bold text-[#1e3a5f] tracking-wider">
                              {classCodes[cl.id] || "—"}
                            </span>
                          </div>
                          {classCodes[cl.id] && (
                            <button
                              onClick={() => copyCode(cl.id)}
                              className="text-gray-400 hover:text-[#1e3a5f] transition-colors"
                            >
                              {copiedCode === cl.id ? (
                                <Check className="h-4 w-4 text-[#1e3a5f]" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              onClick={() => router.push("/dashboard/admin")}
              className="bg-[#1e3a5f] hover:bg-[#162d4a] h-12 px-8 text-base"
            >
              Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
