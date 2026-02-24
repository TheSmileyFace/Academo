"use client";

import { useState } from "react";
import { FileText, CheckCircle2, Clock, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Submission {
  id: string;
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by student or assignment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl border-gray-200 bg-white"
        />
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filtered.map((s) => (
            <div key={s.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                    s.status === "graded" ? "bg-green-50" : "bg-amber-50"
                  }`}>
                    {s.status === "graded"
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <Clock className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.studentName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{s.assignmentTitle}</span>
                      <span className="text-gray-200">·</span>
                      <span>{s.subject}</span>
                      <span className="text-gray-200">·</span>
                      <span>{new Date(s.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.status === "graded" ? (
                    <span className={`text-sm font-bold ${
                      (s.grade || 0) >= 70 ? "text-green-600" : (s.grade || 0) >= 50 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {s.grade}%
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => { setGrading(s.id); setGradeVal(""); setFeedbackVal(""); }}
                      className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg text-xs h-8"
                    >
                      Grade
                    </Button>
                  )}
                </div>
              </div>

              {s.feedback && s.status === "graded" && (
                <p className="text-xs text-gray-500 mt-1.5 ml-12 italic line-clamp-1">{s.feedback}</p>
              )}

              {grading === s.id && (
                <div className="mt-3 ml-12 space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Grade (0-100)"
                      value={gradeVal}
                      onChange={(e) => setGradeVal(e.target.value)}
                      className="w-32 rounded-lg text-sm"
                    />
                    <Input
                      placeholder="Feedback (optional)"
                      value={feedbackVal}
                      onChange={(e) => setFeedbackVal(e.target.value)}
                      className="flex-1 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setGrading(null)} className="text-xs h-7 rounded-lg">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleGrade(s.id)}
                      disabled={saving || !gradeVal}
                      className="bg-[#1e3a5f] hover:bg-[#162d4a] text-xs h-7 rounded-lg"
                    >
                      {saving ? "Saving..." : "Submit Grade"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400">No matching submissions</div>
          )}
        </div>
      </Card>
    </div>
  );
}
