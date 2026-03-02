"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

interface Submission {
  id: string;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  assignment_title: string;
  subject: string;
  due_date: string;
}

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  notes: string | null;
}

interface BehaviorRow {
  id: string;
  type: string;
  reason: string;
  points: number;
  created_at: string;
  creator_name: string;
}

interface Props {
  studentId: string;
  teacherId: string;
  submissions: Submission[];
  attendanceData: AttendanceRow[];
  behaviorData: BehaviorRow[];
  pendingCount: number;
  totalCautions: number;
  totalRewards: number;
  totalPoints: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

type Tab = "submissions" | "attendance" | "behavior";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function StudentProfileClient({
  studentId,
  submissions,
  attendanceData,
  behaviorData,
  pendingCount,
  totalCautions,
  totalRewards,
  totalPoints,
  presentCount,
  absentCount,
  lateCount,
}: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("submissions");

  // Behavior form state
  const [showBehaviorForm, setShowBehaviorForm] = useState(false);
  const [behaviorType, setBehaviorType] = useState<"caution" | "reward">("caution");
  const [behaviorReason, setBehaviorReason] = useState("");
  const [behaviorPoints, setBehaviorPoints] = useState("0");
  const [savingBehavior, setSavingBehavior] = useState(false);
  const [localBehavior, setLocalBehavior] = useState<BehaviorRow[]>(behaviorData);

  const handleAddBehavior = async () => {
    if (!behaviorReason.trim()) { toast.error("Please enter a reason"); return; }
    setSavingBehavior(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingBehavior(false); return; }

    const { data: profile } = await supabase.from("profiles").select("school_id, full_name").eq("id", user.id).single();
    if (!profile?.school_id) { setSavingBehavior(false); return; }

    const { data: newEvent, error } = await supabase.from("behavior_events").insert({
      student_id: studentId,
      school_id: profile.school_id,
      type: behaviorType,
      reason: behaviorReason.trim(),
      points: behaviorType === "reward" ? parseInt(behaviorPoints) || 0 : 0,
      created_by: user.id,
    }).select("id, type, reason, points, created_at").single();

    if (error) { toast.error("Failed to save"); setSavingBehavior(false); return; }

    setLocalBehavior((prev) => [{
      id: newEvent.id,
      type: newEvent.type,
      reason: newEvent.reason,
      points: newEvent.points,
      created_at: newEvent.created_at,
      creator_name: profile.full_name || "You",
    }, ...prev]);

    setBehaviorReason("");
    setBehaviorPoints("0");
    setShowBehaviorForm(false);
    toast.success(behaviorType === "caution" ? "Caution logged" : "Reward given");
    setSavingBehavior(false);
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "submissions", label: "Submissions", badge: pendingCount },
    { id: "attendance", label: "Attendance" },
    { id: "behavior", label: "Behavior" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab bar */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex items-center px-5 pt-4 gap-5 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative pb-3 text-[14px] font-semibold transition-colors ${
                tab === t.id ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white"
              }`}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="ml-1.5 text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D2D2D] dark:bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
        <div className="h-px bg-[#2D2D2D]/10 dark:bg-white/10 shrink-0" />

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* SUBMISSIONS */}
          {tab === "submissions" && (
            <div>
              {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No submissions yet</p>
                  <p className="text-[12px] text-[#9A9A9A] mt-1">This student hasn't submitted to any of your assignments</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {submissions.map((s) => (
                    <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white truncate">{s.assignment_title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                          <span>{s.subject}</span>
                          <span>·</span>
                          <span>{fmtShort(s.submitted_at)}</span>
                        </div>
                        {s.feedback && (
                          <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-1 italic line-clamp-1">"{s.feedback}"</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.status === "graded"
                            ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}>
                          {s.status === "graded" ? "Graded" : "Pending"}
                        </span>
                        {s.status === "graded" && s.grade != null && (
                          <span className="text-[16px] font-bold text-[#2D2D2D] dark:text-white">{s.grade}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-5 pb-4 pt-2 border-t border-[#2D2D2D]/5 dark:border-white/5">
                <Link
                  href={`/dashboard/teacher/submissions`}
                  className="text-[12px] font-semibold text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors"
                >
                  View all submissions →
                </Link>
              </div>
            </div>
          )}

          {/* ATTENDANCE */}
          {tab === "attendance" && (
            <div>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-[#2D2D2D]/5 dark:border-white/5">
                {[
                  { label: "Present", value: presentCount, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
                  { label: "Absent", value: absentCount, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
                  { label: "Late", value: lateCount, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2 text-center`}>
                    <p className={`text-[18px] font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">{s.label}</p>
                  </div>
                ))}
              </div>

              {attendanceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                  <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No attendance records</p>
                  <p className="text-[12px] text-[#9A9A9A] mt-1">Last 30 days · Mark attendance on the Attendance page</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {attendanceData.map((a) => (
                    <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-[#2D2D2D] dark:text-white">
                          {new Date(a.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                        {a.notes && <p className="text-[11px] text-[#9A9A9A] mt-0.5 italic">{a.notes}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                        a.status === "present" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                          : a.status === "absent" ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                          : a.status === "late" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-[#2D2D2D]/5 text-[#9A9A9A] dark:bg-white/5 dark:text-[#A0A0A0]"
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BEHAVIOR */}
          {tab === "behavior" && (
            <div>
              {/* Summary + add button */}
              <div className="px-5 py-4 border-b border-[#2D2D2D]/5 dark:border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[16px] font-bold text-red-500 dark:text-red-400">{totalCautions}</p>
                    <p className="text-[10px] font-bold text-[#9A9A9A]">Cautions</p>
                  </div>
                  <div className="w-px h-8 bg-[#2D2D2D]/10 dark:bg-white/10" />
                  <div className="text-center">
                    <p className="text-[16px] font-bold text-green-600 dark:text-green-400">{totalRewards}</p>
                    <p className="text-[10px] font-bold text-[#9A9A9A]">Rewards</p>
                  </div>
                  <div className="w-px h-8 bg-[#2D2D2D]/10 dark:bg-white/10" />
                  <div className="text-center">
                    <p className="text-[16px] font-bold text-[#2D2D2D] dark:text-white">{totalPoints}</p>
                    <p className="text-[10px] font-bold text-[#9A9A9A]">Points</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBehaviorForm((v) => !v)}
                  className="text-[12px] font-semibold bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                >
                  + Log Event
                </button>
              </div>

              {/* Inline form */}
              {showBehaviorForm && (
                <div className="px-5 py-4 bg-[#2D2D2D]/[0.02] dark:bg-white/[0.02] border-b border-[#2D2D2D]/5 dark:border-white/5 space-y-3">
                  <div className="flex gap-2">
                    {(["caution", "reward"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setBehaviorType(t)}
                        className={`flex-1 py-2 rounded-lg text-[12px] font-bold capitalize transition-colors ${
                          behaviorType === t
                            ? t === "caution"
                              ? "bg-red-500 text-white"
                              : "bg-green-600 text-white"
                            : "bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    className="w-full bg-white dark:bg-[#2D2D2D] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none focus:border-[#2D2D2D]/30 dark:focus:border-white/30"
                    placeholder="Reason..."
                    value={behaviorReason}
                    onChange={(e) => setBehaviorReason(e.target.value)}
                  />
                  {behaviorType === "reward" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#9A9A9A]">Points:</span>
                      <input
                        type="number"
                        min="0"
                        className="w-20 bg-white dark:bg-[#2D2D2D] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-[#2D2D2D] dark:text-white outline-none"
                        value={behaviorPoints}
                        onChange={(e) => setBehaviorPoints(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddBehavior}
                      disabled={savingBehavior}
                      className="flex-1 bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      {savingBehavior ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setShowBehaviorForm(false)}
                      className="px-4 bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A] text-[12px] font-bold py-2 rounded-lg hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {localBehavior.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                  <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No behavior events</p>
                  <p className="text-[12px] text-[#9A9A9A] mt-1">Log a caution or reward using the button above</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {localBehavior.map((b) => (
                    <div key={b.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${b.type === "caution" ? "bg-red-500" : "bg-green-500"}`} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#2D2D2D] dark:text-white leading-snug">{b.reason}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#9A9A9A] mt-0.5">
                            <span>{b.creator_name}</span>
                            <span>·</span>
                            <span>{fmtShort(b.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          b.type === "caution"
                            ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                            : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        }`}>
                          {b.type}
                        </span>
                        {b.type === "reward" && b.points > 0 && (
                          <span className="text-[11px] font-bold text-[#2D2D2D] dark:text-white">+{b.points}pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
