"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Plus, Trash2, Copy, Check, Loader2, Users, GraduationCap, FolderOpen, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteCode {
  id: string;
  code: string;
  role: string;
  class_id: string | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
}

interface ClassItem {
  id: string;
  name: string;
  year_group_id: string;
}

interface YearGroup {
  id: string;
  name: string;
  sort_order: number;
}

export default function InviteCodesPage() {
  const supabase = createClient();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);

  // Teacher/parent code form
  const [newRole, setNewRole] = useState<"teacher" | "parent">("teacher");
  const [newMaxUses, setNewMaxUses] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async (sid: string) => {
    const [codesRes, classesRes, ygRes] = await Promise.all([
      supabase.from("school_invite_codes").select("*").eq("school_id", sid).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name, year_group_id").eq("school_id", sid).order("name"),
      supabase.from("year_groups").select("*").eq("school_id", sid).order("sort_order"),
    ]);
    setInviteCodes(codesRes.data || []);
    setClasses(classesRes.data || []);
    setYearGroups(ygRes.data || []);
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

  const createTeacherParentCode = async () => {
    if (!schoolId || !userId) return;
    setCreating(true);
    const payload: Record<string, unknown> = {
      school_id: schoolId,
      role: newRole,
      created_by: userId,
    };
    if (newMaxUses && parseInt(newMaxUses) > 0) payload.max_uses = parseInt(newMaxUses);
    const { error } = await supabase.from("school_invite_codes").insert(payload);
    if (!error) {
      setNewMaxUses("");
      await fetchData(schoolId);
    }
    setCreating(false);
  };

  const deleteCode = async (id: string) => {
    if (!schoolId) return;
    await supabase.from("school_invite_codes").delete().eq("id", id);
    await fetchData(schoolId);
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  // Separate student codes (per-class) from teacher/parent codes
  const studentCodes = inviteCodes.filter((c) => c.role === "student" && c.class_id);
  const staffCodes = inviteCodes.filter((c) => c.role !== "student" || !c.class_id);

  // Build class_id → code map
  const classCodeMap: Record<string, InviteCode> = {};
  studentCodes.forEach((c) => {
    if (c.class_id) classCodeMap[c.class_id] = c;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invite Codes</h1>
        <p className="mt-1 text-gray-500">
          Each class has its own student code. Create separate codes for teachers and parents.
        </p>
      </div>

      {/* ── Student Codes (per class, auto-generated) ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <GraduationCap className="h-5 w-5 text-[#1e3a5f]" />
            Student Codes
            <span className="text-xs font-normal text-gray-400 ml-1">One code per class — never expires</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {yearGroups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Set up year groups and classes first to see student codes.
            </p>
          ) : (
            yearGroups.map((yg) => {
              const ygClasses = classes.filter((c) => c.year_group_id === yg.id);
              if (ygClasses.length === 0) return null;
              return (
                <div key={yg.id} className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-600 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-gray-400" />
                    {yg.name}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ygClasses.map((cl) => {
                      const code = classCodeMap[cl.id];
                      return (
                        <div
                          key={cl.id}
                          className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                              <FolderOpen className="h-4 w-4 text-[#1e3a5f]" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">{cl.name}</span>
                              {code ? (
                                <p className="font-mono text-sm font-bold text-[#1e3a5f] tracking-wider">{code.code}</p>
                              ) : (
                                <p className="text-xs text-gray-400">No code</p>
                              )}
                            </div>
                          </div>
                          {code && (
                            <button
                              onClick={() => copyCode(code.id, code.code)}
                              className="text-gray-400 hover:text-[#1e3a5f] transition-colors p-2"
                            >
                              {copiedId === code.id ? (
                                <Check className="h-4 w-4 text-[#1e3a5f]" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── Teacher & Parent Codes ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Users className="h-5 w-5 text-[#1e3a5f]" />
            Teacher & Parent Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Create new code */}
          <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-gray-100">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Role</Label>
              <div className="flex gap-2">
                {(["teacher", "parent"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                      newRole === role
                        ? "bg-[#1e3a5f] text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Max uses (optional)</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                className="w-32"
                min="1"
              />
            </div>

            <Button
              onClick={createTeacherParentCode}
              disabled={creating}
              className="bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Generate Code
            </Button>
          </div>

          {/* Existing teacher/parent codes */}
          {staffCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                <KeyRound className="h-6 w-6 text-gray-300" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-400">No teacher or parent codes yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {staffCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                      <Users className="h-4 w-4 text-[#1e3a5f]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-gray-900 tracking-wider">{code.code}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#1e3a5f] capitalize">
                          {code.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {code.uses_count} use{code.uses_count !== 1 ? "s" : ""}
                        {code.max_uses ? ` / ${code.max_uses} max` : ""}
                        {" · "}Created {new Date(code.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCode(code.id, code.code)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {copiedId === code.id ? (
                        <Check className="h-4 w-4 text-[#1e3a5f]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCode(code.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
