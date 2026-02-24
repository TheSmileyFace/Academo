"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ArrowLeft, Clock, User, Upload, FileText, Send, Loader2, CheckCircle2, Paperclip, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-gray-400">Assignment not found</p>
        <Link href="/dashboard/student" className="mt-3 text-sm text-[#1e3a5f] hover:text-[#1e3a5f]">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/dashboard/student"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 shrink-0">
            <BookOpen className="h-6 w-6 text-[#1e3a5f]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                <BookOpen className="h-3 w-3" /> {assignment.subject}
              </span>
              {assignment.class_name && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                  {assignment.class_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                <User className="h-3 w-3" /> {teacherName}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 ${
                isOverdue
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-50 text-[#1e3a5f]"
              }`}>
                <Clock className="h-3 w-3" />
                {isOverdue ? "Overdue" : "Due"} {new Date(assignment.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {isSubmitted && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 bg-blue-100 text-[#1e3a5f]">
                  <CheckCircle2 className="h-3 w-3" /> Submitted
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Instructions</h2>
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
            {assignment.description}
          </div>
        </CardContent>
      </Card>

      {/* Submission Area */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Send className="h-4 w-4 text-[#1e3a5f]" />
            Your Submission
          </h2>

          {isSubmitted && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-[#1e3a5f]" />
                <p className="text-sm font-semibold text-[#1e3a5f]">
                  Submitted on {new Date(submission!.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {submission!.file_name && (
                <p className="text-xs text-[#1e3a5f] flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {submission!.file_name}
                </p>
              )}
              <p className="text-xs text-[#1e3a5f] mt-1">You can resubmit to update your answer.</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-gray-600">Written Answer</Label>
            <Textarea
              placeholder="Type your answer here..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={6}
              className="mt-1.5 rounded-xl border-gray-200"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-600">Upload File</Label>
            <div className="mt-1.5">
              {selectedFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <FileText className="h-5 w-5 text-[#1e3a5f] shrink-0" />
                  <span className="text-sm text-[#1e3a5f] truncate flex-1">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 transition-colors hover:border-blue-300 hover:bg-blue-50/30">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-400">Click to upload a file</span>
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
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl h-11 px-6"
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
        </CardContent>
      </Card>
    </div>
  );
}
