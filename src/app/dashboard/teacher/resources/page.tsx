"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ResourcePage {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  published: boolean;
  updated_at: string;
  block_count: number;
}

interface YearGroupOption {
  id: string;
  name: string;
  classes: { id: string; name: string }[];
}

export default function TeacherResources() {
  const supabase = createClient();
  const router = useRouter();
  const [pages, setPages] = useState<ResourcePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [yearGroupId, setYearGroupId] = useState<string>("none");
  const [classId, setClassId] = useState<string>("none");
  const [yearGroups, setYearGroups] = useState<YearGroupOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teacherSubject, setTeacherSubject] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id, subject_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) { setLoading(false); return; }
      setSchoolId(profile.school_id);

      if (profile.subject_id) {
        const { data: sub } = await supabase
          .from("subjects")
          .select("name")
          .eq("id", profile.subject_id)
          .single();
        if (sub) {
          setTeacherSubject(sub.name);
          setSubject(sub.name);
        }
      }

      // Fetch teacher's resource pages
      const { data: resourcePages } = await supabase
        .from("resource_pages")
        .select("id, title, subject, description, published, updated_at")
        .eq("created_by", user.id)
        .order("updated_at", { ascending: false });

      // Get block counts
      const pageIds = (resourcePages || []).map((p) => p.id);
      let blockCounts: Record<string, number> = {};
      if (pageIds.length > 0) {
        const { data: blocks } = await supabase
          .from("resource_blocks")
          .select("resource_page_id")
          .in("resource_page_id", pageIds);
        (blocks || []).forEach((b) => {
          blockCounts[b.resource_page_id] = (blockCounts[b.resource_page_id] || 0) + 1;
        });
      }

      setPages((resourcePages || []).map((p) => ({
        ...p,
        block_count: blockCounts[p.id] || 0,
      })));

      // Fetch year groups + classes for the create form
      const { data: ygData } = await supabase
        .from("year_groups")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("sort_order");

      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, year_group_id")
        .eq("school_id", profile.school_id)
        .order("name");

      const ygs: YearGroupOption[] = (ygData || []).map((yg) => ({
        id: yg.id,
        name: yg.name,
        classes: (classData || []).filter((c) => c.year_group_id === yg.id),
      }));
      setYearGroups(ygs);

      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schoolId) { setCreating(false); return; }

    const { data: page, error } = await supabase
      .from("resource_pages")
      .insert({
        title: title.trim(),
        subject: subject || teacherSubject || null,
        description: description.trim() || null,
        created_by: user.id,
        school_id: schoolId,
        year_group_id: yearGroupId && yearGroupId !== "none" ? yearGroupId : null,
        class_id: classId && classId !== "none" ? classId : null,
        published: false,
      })
      .select("id")
      .single();

    if (error || !page) {
      toast.error("Failed to create: " + (error?.message || "Unknown error"));
      setCreating(false);
      return;
    }

    toast.success("Resource page created!");
    router.push(`/dashboard/teacher/resources/${page.id}`);
  };

  const filtered = pages.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || (p.subject || "").toLowerCase().includes(q);
  });

  const publishedCount = pages.filter((p) => p.published).length;
  const draftCount = pages.length - publishedCount;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-10 w-10 bg-[#2D2D2D]/10 rounded-full"></div>
          <div className="h-4 w-24 bg-[#2D2D2D]/10 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[24px] font-bold text-[#2D2D2D]">Resources</h1>
          <p className="text-[13px] text-[#9A9A9A] mt-1">
            {pages.length} total • {publishedCount} published • {draftCount} draft{draftCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[13px] font-bold text-white bg-[#2D2D2D] px-5 py-2.5 rounded-xl hover:bg-[#2D2D2D]/90 transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Resource"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-[#2D2D2D]/5 rounded-2xl p-6 border border-[#2D2D2D]/5 space-y-5">
          <h2 className="text-[16px] font-bold text-[#2D2D2D]">Create Resource Page</h2>
          <div>
            <label className="text-[12px] font-bold text-[#2D2D2D]/70 mb-2 block">Title *</label>
            <input
              placeholder="e.g. Photosynthesis Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[14px] text-[#2D2D2D] bg-white border border-[#2D2D2D]/10 rounded-xl px-4 py-3 outline-none focus:border-[#2D2D2D]/30 transition-colors"
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#2D2D2D]/70 mb-2 block">Description</label>
            <textarea
              placeholder="Brief description of this resource..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full text-[14px] text-[#2D2D2D] bg-white border border-[#2D2D2D]/10 rounded-xl px-4 py-3 resize-none outline-none focus:border-[#2D2D2D]/30 transition-colors"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-[12px] font-bold text-[#2D2D2D]/70 mb-2 block">Subject</label>
              <input
                placeholder="e.g. Biology"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-[14px] text-[#2D2D2D] bg-white border border-[#2D2D2D]/10 rounded-xl px-4 py-3 outline-none focus:border-[#2D2D2D]/30 transition-colors"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-[#2D2D2D]/70 mb-2 block">Year Group (optional)</label>
              <Select value={yearGroupId} onValueChange={setYearGroupId}>
                <SelectTrigger className="w-full h-[46px] rounded-xl border-[#2D2D2D]/10 bg-white text-[#2D2D2D] text-[14px]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any</SelectItem>
                  {yearGroups.map((yg) => (
                    <SelectItem key={yg.id} value={yg.id}>{yg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-bold text-[#2D2D2D]/70 mb-2 block">Class (optional)</label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-full h-[46px] rounded-xl border-[#2D2D2D]/10 bg-white text-[#2D2D2D] text-[14px]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any</SelectItem>
                  {yearGroups
                    .filter((yg) => !yearGroupId || yearGroupId === "none" || yg.id === yearGroupId)
                    .flatMap((yg) => yg.classes)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="text-[13px] font-bold text-white bg-[#2D2D2D] px-6 py-3 rounded-xl hover:bg-[#2D2D2D]/90 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create & Edit"}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {pages.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9A9A]" />
          <input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[14px] text-[#2D2D2D] bg-white border border-[#2D2D2D]/10 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-[#2D2D2D]/30 transition-colors"
          />
        </div>
      )}

      {/* Resource List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#2D2D2D]/10 rounded-2xl flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[15px] font-bold text-[#2D2D2D]">
            {pages.length === 0 ? "No resources created yet" : "No matching resources"}
          </p>
          {pages.length === 0 && (
            <p className="text-[13px] text-[#9A9A9A] mt-2">Create your first resource page to share materials with students</p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#2D2D2D]/10 rounded-2xl overflow-hidden divide-y divide-black/5">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/teacher/resources/${p.id}`}
              className="flex items-center justify-between p-5 hover:bg-[#2D2D2D]/[0.02] transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[16px] font-bold text-[#2D2D2D] truncate">{p.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    p.published ? "bg-[#2D2D2D]/5 text-[#2D2D2D]" : "bg-[#2D2D2D]/5 text-[#9A9A9A]"
                  }`}>
                    {p.published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-medium text-[#9A9A9A]">
                  {p.subject && <span>{p.subject}</span>}
                  {p.subject && <span>•</span>}
                  <span>{p.block_count} block{p.block_count !== 1 ? "s" : ""}</span>
                  <span>•</span>
                  <span>Updated {new Date(p.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
