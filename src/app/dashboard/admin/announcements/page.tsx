"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Loader2, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

const PRIORITIES = [
  { value: "normal", label: "Normal", color: "bg-slate-100 text-slate-700" },
  { value: "high", label: "High", color: "bg-amber-50 text-amber-700" },
  { value: "urgent", label: "Urgent", color: "bg-red-50 text-red-700" },
];

export default function AnnouncementsPage() {
  const supabase = createClient();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("school_id", sid)
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
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

  const createAnnouncement = async () => {
    if (!schoolId || !userId || !title.trim() || !content.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("announcements").insert({
      school_id: schoolId,
      title: title.trim(),
      content: content.trim(),
      priority,
      created_by: userId,
    });
    if (error) {
      toast.error("Failed to create announcement");
    } else {
      toast.success("Announcement published");
      setTitle("");
      setContent("");
      setPriority("normal");
      await fetchData(schoolId);
    }
    setCreating(false);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!schoolId) return;
    await supabase.from("announcements").delete().eq("id", id);
    toast.success("Announcement deleted");
    await fetchData(schoolId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
        <p className="mt-1 text-gray-500">
          Publish announcements visible to all members of your school.
        </p>
      </div>

      {/* Create Announcement */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Megaphone className="h-5 w-5 text-[#1e3a5f]" />
            New Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Title</Label>
            <Input
              placeholder="e.g. School closure notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Content</Label>
            <Textarea
              placeholder="Write your announcement here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Priority</Label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      priority === p.value
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={createAnnouncement}
              disabled={creating || !title.trim() || !content.trim()}
              className="bg-[#1e3a5f] hover:bg-[#162d4a] ml-auto"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Announcements */}
      {announcements.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <Megaphone className="h-7 w-7 text-gray-300" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-400">No announcements yet</p>
            <p className="mt-1 text-xs text-gray-300">Create your first announcement above</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const prioConfig = PRIORITIES.find((p) => p.value === a.priority) || PRIORITIES[0];
            return (
              <Card key={a.id} className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-900">{a.title}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${prioConfig.color}`}>
                          {prioConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(a.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAnnouncement(a.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors shrink-0 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
