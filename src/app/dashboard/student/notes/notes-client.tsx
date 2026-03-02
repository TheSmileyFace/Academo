"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string | null;
  note_type: string;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  userId: string;
  schoolId: string;
  initialNotes: Note[];
}

export default function NotesClient({ userId, schoolId, initialNotes }: Props) {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id || null);
  const [editTitle, setEditTitle] = useState(notes[0]?.title || "");
  const [editContent, setEditContent] = useState(notes[0]?.content || "");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedNote = notes.find((n) => n.id === selectedId);

  const selectNote = (note: Note) => {
    setSelectedId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || "");
  };

  const createNote = async (type: "text" | "voice" = "text") => {
    setCreating(true);
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        school_id: schoolId,
        title: "Untitled",
        content: "",
        note_type: type,
      })
      .select("id, title, content, note_type, audio_url, created_at, updated_at")
      .single();

    if (error) {
      toast.error("Failed to create note");
    } else {
      setNotes((prev) => [data, ...prev]);
      selectNote(data);
    }
    setCreating(false);
  };

  const saveNote = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase
      .from("notes")
      .update({ title: editTitle, content: editContent, updated_at: new Date().toISOString() })
      .eq("id", selectedId);

    if (error) toast.error("Failed to save");
    else {
      setNotes((prev) =>
        prev.map((n) => n.id === selectedId ? { ...n, title: editTitle, content: editContent, updated_at: new Date().toISOString() } : n)
      );
    }
    setSaving(false);
  };

  const autoSave = (title: string, content: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (selectedId) {
        supabase
          .from("notes")
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq("id", selectedId)
          .then(() => {
            setNotes((prev) =>
              prev.map((n) => n.id === selectedId ? { ...n, title, content, updated_at: new Date().toISOString() } : n)
            );
          });
      }
    }, 1500);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (!error) {
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (selectedId === id) {
        if (remaining.length > 0) selectNote(remaining[0]);
        else { setSelectedId(null); setEditTitle(""); setEditContent(""); }
      }
      toast.success("Note deleted");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());

        // Convert to text description since we can't store audio without storage bucket
        const text = `[Voice note recorded at ${new Date().toLocaleTimeString()}]\n\n(Audio recording — ${Math.round(blob.size / 1024)}KB)`;
        if (selectedId) {
          const newContent = editContent ? `${editContent}\n\n${text}` : text;
          setEditContent(newContent);
          autoSave(editTitle, newContent);
        }
        toast.success("Voice note added");
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setRecording(false);
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
      {/* Sidebar list */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => createNote("text")}
            disabled={creating}
            className="flex-1 bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            + New Note
          </button>
          <button
            onClick={() => { createNote("voice"); }}
            disabled={creating}
            className="bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A] text-[12px] font-bold px-3 py-2 rounded-xl hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10 transition-colors"
          >
            + Voice
          </button>
        </div>

        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">No notes yet</p>
                <p className="text-[11px] text-[#9A9A9A] mt-1">Create your first note above</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => selectNote(n)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedId === n.id ? "bg-[#2D2D2D]/[0.04] dark:bg-white/[0.04]" : "hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white truncate">
                        {n.note_type === "voice" ? "🎙 " : ""}{n.title || "Untitled"}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                        className="text-[10px] text-[#9A9A9A] hover:text-red-500 dark:hover:text-red-400 shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-[#9A9A9A] mt-0.5 line-clamp-1">
                      {n.content?.slice(0, 60) || "Empty note"}
                    </p>
                    <p className="text-[10px] text-[#9A9A9A]/60 mt-0.5">{fmtDate(n.updated_at)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        {selectedNote ? (
          <>
            <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 flex items-center gap-3">
              <input
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); autoSave(e.target.value, editContent); }}
                placeholder="Note title..."
                className="flex-1 text-[16px] font-bold text-[#2D2D2D] dark:text-white bg-transparent border-0 outline-none placeholder:text-[#9A9A9A]"
              />
              <div className="flex items-center gap-2 shrink-0">
                {selectedNote.note_type === "voice" && (
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                      recording
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A] hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10"
                    }`}
                  >
                    {recording ? "Stop Recording" : "Record"}
                  </button>
                )}
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="text-[11px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white transition-colors"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => { setEditContent(e.target.value); autoSave(editTitle, e.target.value); }}
              placeholder="Start writing..."
              className="flex-1 px-5 py-4 text-[14px] text-[#2D2D2D] dark:text-white bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-[#9A9A9A]"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-5">
            <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Select or create a note</p>
            <p className="text-[12px] text-[#9A9A9A] mt-1">Your notes are auto-saved as you type</p>
          </div>
        )}
      </div>
    </div>
  );
}
