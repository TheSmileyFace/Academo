"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  subject: string;
  status: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  fileUrl: string | null;
}

export function SubmissionsClient({ submissions }: { submissions: Submission[] }) {
  const [search, setSearch] = useState("");
  const [grading, setGrading] = useState<string | null>(null);
  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const filtered = submissions.filter((s) =>
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.assignmentTitle.toLowerCase().includes(search.toLowerCase())
  );

  async function handleGrade(id: string) {
    if (!gradeVal) return;
    setSaving(true);
    await supabase
      .from("submissions")
      .update({
        grade: parseInt(gradeVal),
        feedback: feedbackVal || null,
        status: "graded",
      })
      .eq("id", id);
    setGrading(null);
    setGradeVal("");
    setFeedbackVal("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" />
        <Input
          placeholder="Search by student or assignment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl border-[#2D2D2D]/10 bg-white h-9 text-[13px]"
        />
      </div>

      <Card className="border-0 shadow-none dash-card rounded-2xl overflow-hidden">
        <div className="divide-y divide-black/5">
          {filtered.map((s) => (
            <div key={s.id} className="p-4 hover:bg-[#2D2D2D]/[0.02] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1 min-w-0">
                  <Link href={`/dashboard/teacher/students/${s.studentId}`} className="text-[14px] font-semibold text-[#2D2D2D] truncate hover:underline">{s.studentName}</Link>
                  <div className="flex items-center gap-2 text-[12px] text-[#9A9A9A]">
                    <span className="font-medium text-[#2D2D2D]/70">{s.assignmentTitle}</span>
                    <span className="text-[#9A9A9A]/30">•</span>
                    <span>{s.subject}</span>
                    <span className="text-[#9A9A9A]/30">•</span>
                    <span>{new Date(s.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {s.status === "graded" ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[16px] font-bold text-[#2D2D2D]">
                        {s.grade}%
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2D2D2D]/5 text-[#9A9A9A]">
                        Graded
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2D2D2D]/5 text-[#2D2D2D]">
                        Needs Review
                      </span>
                      <Button
                        size="sm"
                        onClick={() => { setGrading(s.id); setGradeVal(""); setFeedbackVal(""); }}
                        className="bg-[#2D2D2D] hover:bg-[#2D2D2D]/90 text-white rounded-xl text-[12px] h-7 px-4"
                      >
                        Grade
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {s.feedback && s.status === "graded" && (
                <div className="mt-3 p-3 bg-[#2D2D2D]/5 rounded-xl border border-[#2D2D2D]/5">
                  <p className="text-[12px] text-[#2D2D2D]/70 italic">"{s.feedback}"</p>
                </div>
              )}

              {grading === s.id && (
                <div className="mt-4 p-4 rounded-xl bg-[#2D2D2D]/5 border border-[#2D2D2D]/5 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-32">
                      <label className="text-[11px] font-semibold text-[#2D2D2D]/70 mb-1.5 block">Score (0-100)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={gradeVal}
                        onChange={(e) => setGradeVal(e.target.value)}
                        className="rounded-xl border-[#2D2D2D]/10 bg-white h-9 text-[13px]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-[#2D2D2D]/70 mb-1.5 block">Feedback (Optional)</label>
                      <Input
                        placeholder="Add comments..."
                        value={feedbackVal}
                        onChange={(e) => setFeedbackVal(e.target.value)}
                        className="rounded-xl border-[#2D2D2D]/10 bg-white h-9 text-[13px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <Button variant="ghost" size="sm" onClick={() => setGrading(null)} className="text-[12px] h-8 rounded-xl text-[#9A9A9A] hover:text-[#2D2D2D] hover:bg-[#2D2D2D]/5">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleGrade(s.id)}
                      disabled={saving || !gradeVal}
                      className="bg-[#2D2D2D] hover:bg-[#2D2D2D]/90 text-white text-[12px] h-8 rounded-xl px-5"
                    >
                      {saving ? "Saving..." : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[14px] font-medium text-[#2D2D2D]">No submissions found</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Try adjusting your search query</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
