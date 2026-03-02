"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ArrowLeft, Clock, User, Upload, FileText, Send, Loader2, CheckCircle2, Paperclip, X, Timer, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  class_name: string;
  due_date: string;
  status: string;
  created_by: string;
}

interface Submission {
  id: string;
  answer_text: string | null;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string;
  status: string;
}

interface GradeInfo {
  grade: number;
  feedback: string | null;
  status: string;
}

function useCountdown(dueDate: string | undefined) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  return useMemo(() => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  }, [dueDate, now]);
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  const [answerText, setAnswerText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gradeInfo, setGradeInfo] = useState<GradeInfo | null>(null);

  const isOverdue = assignment ? new Date(assignment.due_date) < new Date() : false;
  const isSubmitted = !!submission;
  const countdown = useCountdown(assignment?.due_date);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: a } = await supabase
        .from("assignments")
        .select("id, title, description, subject, class_name, due_date, status, created_by")
        .eq("id", assignmentId)
        .single();

      if (!a) { setLoading(false); return; }
      setAssignment(a);

      const { data: teacher } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", a.created_by)
        .single();
      if (teacher) setTeacherName(teacher.full_name || "Teacher");

      const { data: sub } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (sub) {
        setSubmission(sub);
        setAnswerText(sub.answer_text || "");
      }

      // Fetch grade from submissions table
      const { data: graded } = await supabase
        .from("submissions")
        .select("grade, feedback, status")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .eq("status", "graded")
        .maybeSingle();

      if (graded && graded.grade != null) {
        setGradeInfo({ grade: graded.grade, feedback: graded.feedback, status: graded.status });
      }

      setLoading(false);
    }
    load();
  }, [supabase, assignmentId]);

  const handleSubmit = async () => {
    if (!answerText.trim() && !selectedFile) {
      toast.error("Please write an answer or upload a file");
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop();
      const path = `submissions/${user.id}/${assignmentId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("submissions")
        .upload(path, selectedFile);

      if (uploadErr) {
        toast.error("File upload failed: " + uploadErr.message);
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("submissions")
        .getPublicUrl(path);

      fileUrl = urlData.publicUrl;
      fileName = selectedFile.name;
    }

    const { data: sub, error } = await supabase
      .from("assignment_submissions")
      .upsert({
        assignment_id: assignmentId,
        student_id: user.id,
        answer_text: answerText.trim() || null,
        file_url: fileUrl || submission?.file_url || null,
        file_name: fileName || submission?.file_name || null,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      }, { onConflict: "assignment_id,student_id" })
      .select()
      .single();

    if (error) {
      toast.error("Failed to submit: " + error.message);
      setSubmitting(false);
      return;
    }

    setSubmission(sub);
    setSelectedFile(null);
    toast.success("Assignment submitted!");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-[14px] text-[#9A9A9A]">Assignment not found</p>
        <Link href="/dashboard/student" className="mt-3 text-[13px] font-semibold text-[#2D2D2D] hover:opacity-70">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pt-2">
      <Link
        href="/dashboard/student/assignments"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9A9A9A] hover:text-[#2D2D2D] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tasks
      </Link>

      {/* Header Card */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-[20px] font-bold text-[#2D2D2D]">{assignment.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2.5 py-1">
              <BookOpen className="h-3 w-3" /> {assignment.subject}
            </span>
            {assignment.class_name && (
              <span className="text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2.5 py-1">
                {assignment.class_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2.5 py-1">
              <User className="h-3 w-3" /> {teacherName}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-lg px-2.5 py-1 ${
              isOverdue
                ? "bg-red-100 text-red-700"
                : "bg-[#2D2D2D] text-white"
            }`}>
              <Clock className="h-3 w-3" />
              {isOverdue ? "Overdue" : "Due"} {new Date(assignment.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            {isSubmitted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-lg px-2.5 py-1 bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3" /> Submitted
              </span>
            )}
          </div>
        </div>

        {/* Countdown + Ask AI row */}
        {(countdown || !isOverdue) && (
          <>
            <div className="h-px bg-[#2D2D2D]/10" />
            <div className="px-4 py-2.5 flex items-center justify-between">
              {countdown ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2D2D2D]">
                  <Timer className="h-3.5 w-3.5" /> {countdown}
                </span>
              ) : <span />}
              <Link
                href={`/dashboard/student/ai-tutor?context=${encodeURIComponent(`Help me with this assignment: "${assignment.title}" — ${assignment.subject}. Instructions: ${assignment.description?.slice(0, 200)}`)}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D] transition-colors"
              >
                <div className="w-4 h-4 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #92D1FF 0%, #0094FF 50%, #E45C12 100%)" }} />
                Ask AI for help
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Grade & Feedback Card */}
      {gradeInfo && (
        <div className="dash-card rounded-2xl">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <Image src="/Icons/black/grades black.svg" alt="" width={20} height={20} className="shrink-0" />
            <span className="text-[14px] font-semibold text-[#2D2D2D]">Your Grade</span>
          </div>
          <div className="h-px bg-[#2D2D2D]/10" />
          <div className="px-4 py-4">
            <div className="flex items-center gap-4">
              <div className={`text-[36px] font-black ${
                gradeInfo.grade >= 70 ? "text-green-600" : gradeInfo.grade >= 50 ? "text-amber-600" : "text-red-600"
              }`}>
                {gradeInfo.grade}%
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-[#2D2D2D]/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      gradeInfo.grade >= 70 ? "bg-green-500" : gradeInfo.grade >= 50 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${gradeInfo.grade}%` }}
                  />
                </div>
                <p className="text-[10px] font-bold text-[#9A9A9A] mt-1">
                  {gradeInfo.grade >= 90 ? "Excellent" : gradeInfo.grade >= 70 ? "Good" : gradeInfo.grade >= 50 ? "Needs improvement" : "Below expectations"}
                </p>
              </div>
            </div>
            {gradeInfo.feedback && (
              <>
                <div className="h-px bg-[#2D2D2D]/10 my-3 -mx-4" />
                <div>
                  <p className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-1">Teacher Feedback</p>
                  <p className="text-[13px] text-[#2D2D2D] leading-relaxed whitespace-pre-wrap">{gradeInfo.feedback}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 pt-3 pb-2">
          <span className="text-[14px] font-semibold text-[#2D2D2D]">Instructions</span>
        </div>
        <div className="h-px bg-[#2D2D2D]/10" />
        <div className="px-4 py-3">
          <div className="text-[13px] text-[#9A9A9A] leading-relaxed whitespace-pre-wrap">
            {assignment.description}
          </div>
        </div>
      </div>

      {/* Submission Timeline */}
      {isSubmitted && (
        <div className="dash-card rounded-2xl">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#2D2D2D]" />
            <span className="text-[14px] font-semibold text-[#2D2D2D]">Timeline</span>
          </div>
          <div className="h-px bg-[#2D2D2D]/10" />
          <div className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-[#2D2D2D]" />
                <div className="w-px h-full bg-[#2D2D2D]/10 min-h-[24px]" />
              </div>
              <div className="pb-3">
                <p className="text-[12px] font-semibold text-[#2D2D2D]">Submitted</p>
                <p className="text-[10px] text-[#9A9A9A]">
                  {new Date(submission!.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                {submission!.file_name && (
                  <p className="text-[10px] text-[#9A9A9A] flex items-center gap-1 mt-0.5">
                    <Paperclip className="h-2.5 w-2.5" /> {submission!.file_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full ${gradeInfo ? "bg-green-500" : "bg-[#2D2D2D]/10"}`} />
              </div>
              <div>
                <p className={`text-[12px] font-semibold ${gradeInfo ? "text-[#2D2D2D]" : "text-[#9A9A9A]"}`}>
                  {gradeInfo ? "Graded" : "Awaiting grade"}
                </p>
                {gradeInfo && (
                  <p className="text-[10px] text-[#9A9A9A]">Score: {gradeInfo.grade}%</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Area */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <Send className="h-4 w-4 text-[#2D2D2D]" />
          <span className="text-[14px] font-semibold text-[#2D2D2D]">{isSubmitted ? "Update Submission" : "Your Submission"}</span>
        </div>
        <div className="h-px bg-[#2D2D2D]/10" />
        <div className="px-4 py-3 space-y-4">

          <div>
            <p className="text-[13px] font-semibold text-[#2D2D2D] mb-1.5">Written Answer</p>
            <Textarea
              placeholder="Type your answer here..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={6}
              className="rounded-xl border-[#2D2D2D]/10 text-[13px]"
            />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-[#2D2D2D] mb-1.5">Upload File</p>
            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#2D2D2D]/10 bg-[#2D2D2D]/5 p-3">
                <FileText className="h-5 w-5 text-[#2D2D2D] shrink-0" />
                <span className="text-[13px] text-[#2D2D2D] truncate flex-1">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-[#9A9A9A] hover:text-[#2D2D2D]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2D2D2D]/10 py-8 transition-colors hover:border-[#2D2D2D]/30 hover:bg-[#2D2D2D]/5">
                <Upload className="h-5 w-5 text-[#9A9A9A]" />
                <span className="text-[13px] text-[#9A9A9A]">Click to upload a file</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#2D2D2D] hover:bg-[#1a1a1a] text-white rounded-xl h-10 px-6 text-[13px] font-semibold"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : isSubmitted ? (
                <><Send className="mr-2 h-4 w-4" /> Resubmit</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Submit Assignment</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
