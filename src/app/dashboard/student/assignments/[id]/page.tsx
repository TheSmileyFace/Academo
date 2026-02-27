"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ArrowLeft, Clock, User, Upload, FileText, Send, Loader2, CheckCircle2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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

  const isOverdue = assignment ? new Date(assignment.due_date) < new Date() : false;
  const isSubmitted = !!submission;

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
        <Link href="/dashboard/student" className="mt-3 text-[13px] font-semibold text-black hover:opacity-70">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pt-2">
      <Link
        href="/dashboard/student/assignments"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9A9A9A] hover:text-black transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tasks
      </Link>

      {/* Header Card */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-[20px] font-bold text-black">{assignment.title}</h1>
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
      </div>

      {/* Description */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 pt-3 pb-2">
          <span className="text-[14px] font-semibold text-black">Instructions</span>
        </div>
        <div className="h-px bg-black/10" />
        <div className="px-4 py-3">
          <div className="text-[13px] text-[#9A9A9A] leading-relaxed whitespace-pre-wrap">
            {assignment.description}
          </div>
        </div>
      </div>

      {/* Submission Area */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <Send className="h-4 w-4 text-[#2D2D2D]" />
          <span className="text-[14px] font-semibold text-black">Your Submission</span>
        </div>
        <div className="h-px bg-black/10" />
        <div className="px-4 py-3 space-y-4">
          {isSubmitted && (
            <div className="rounded-xl bg-[#2D2D2D]/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#2D2D2D]" />
                <p className="text-[13px] font-semibold text-black">
                  Submitted on {new Date(submission!.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {submission!.file_name && (
                <p className="text-[10px] text-[#9A9A9A] flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {submission!.file_name}
                </p>
              )}
              <p className="text-[10px] text-[#9A9A9A] mt-1">You can resubmit to update your answer.</p>
            </div>
          )}

          <div>
            <p className="text-[13px] font-semibold text-black mb-1.5">Written Answer</p>
            <Textarea
              placeholder="Type your answer here..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={6}
              className="rounded-xl border-black/10 text-[13px]"
            />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-black mb-1.5">Upload File</p>
            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#2D2D2D]/5 p-3">
                <FileText className="h-5 w-5 text-[#2D2D2D] shrink-0" />
                <span className="text-[13px] text-black truncate flex-1">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-[#9A9A9A] hover:text-black">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/10 py-8 transition-colors hover:border-[#2D2D2D]/30 hover:bg-[#2D2D2D]/5">
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
