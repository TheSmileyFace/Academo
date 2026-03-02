"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface WellnessCheck {
  id: string;
  mood: number;
  note: string | null;
  created_at: string;
}

interface Props {
  schoolId: string;
  studentId: string;
  existingChecks: WellnessCheck[];
  alreadySubmittedToday: boolean;
}

const MOOD_OPTIONS = [
  { value: 1, emoji: "😢", label: "Really low" },
  { value: 2, emoji: "😟", label: "Not great" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😊", label: "Great" },
];

export default function WellnessClient({ schoolId, studentId, existingChecks, alreadySubmittedToday }: Props) {
  const supabase = createClient();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadySubmittedToday);
  const [checks, setChecks] = useState<WellnessCheck[]>(existingChecks);

  const handleSubmit = async () => {
    if (selectedMood === null) { toast.error("Please select how you're feeling"); return; }
    setSubmitting(true);

    const { data, error } = await supabase
      .from("wellness_checks")
      .insert({
        student_id: studentId,
        school_id: schoolId,
        mood: selectedMood,
        note: note.trim() || null,
      })
      .select("id, mood, note, created_at")
      .single();

    if (error) {
      toast.error("Failed to submit check-in");
    } else {
      setChecks((prev) => [data, ...prev]);
      setSubmitted(true);
      setSelectedMood(null);
      setNote("");
      toast.success("Check-in submitted!");
    }
    setSubmitting(false);
  };

  // Calculate average mood for the last 7 entries
  const recentChecks = checks.slice(0, 7);
  const avgMood = recentChecks.length > 0
    ? (recentChecks.reduce((s, c) => s + c.mood, 0) / recentChecks.length).toFixed(1)
    : null;

  const moodEmoji = (mood: number) => MOOD_OPTIONS.find((m) => m.value === mood)?.emoji || "😐";

  return (
    <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
      {/* Check-in card */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-5 flex flex-col gap-4">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">How are you feeling today?</p>

          {submitted ? (
            <div className="text-center py-6">
              <p className="text-[32px]">✅</p>
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white mt-2">Check-in complete!</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Come back tomorrow to check in again</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between gap-2">
                {MOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedMood(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                      selectedMood === opt.value
                        ? "bg-[#2D2D2D] dark:bg-white scale-105"
                        : "bg-[#2D2D2D]/5 dark:bg-white/5 hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="text-[24px]">{opt.emoji}</span>
                    <span className={`text-[9px] font-bold ${
                      selectedMood === opt.value ? "text-white dark:text-[#2D2D2D]" : "text-[#9A9A9A]"
                    }`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Want to share more? (optional)"
                rows={3}
                className="w-full bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2.5 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none resize-none"
              />

              <button
                onClick={handleSubmit}
                disabled={submitting || selectedMood === null}
                className="bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[13px] font-bold py-2.5 rounded-xl hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit Check-in"}
              </button>
            </>
          )}
        </div>

        {/* Summary */}
        {avgMood && (
          <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4">
            <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wide mb-2">Recent average</p>
            <div className="flex items-center gap-3">
              <span className="text-[28px]">{moodEmoji(Math.round(parseFloat(avgMood)))}</span>
              <div>
                <p className="text-[20px] font-bold text-[#2D2D2D] dark:text-white">{avgMood}/5</p>
                <p className="text-[11px] text-[#9A9A9A]">Last {recentChecks.length} check-ins</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">History</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {checks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No check-ins yet</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Your wellness history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {checks.map((c) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-[22px] shrink-0">{moodEmoji(c.mood)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#2D2D2D] dark:text-white">
                      {new Date(c.created_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    {c.note && (
                      <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5 line-clamp-1">{c.note}</p>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < c.mood ? "bg-green-500" : "bg-[#2D2D2D]/10 dark:bg-white/10"
                        }`}
                      />
                    ))}
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
