"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  FileText,
  BookOpen,
  Loader2,
  Filter,
  X,
  ChevronRight,
  User,
  Clock,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface ResourcePage {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  created_by: string | null;
  updated_at: string;
  teacher_name?: string;
  block_count?: number;
}

export default function ResourcesPage() {
  const supabase = createClient();
  const [pages, setPages] = useState<ResourcePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  useEffect(() => {
    async function fetchResources() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get student's enrollment to find their year group and class
      const { data: enrollment } = await supabase
        .from("student_enrollments")
        .select("class_id")
        .eq("student_id", user.id)
        .maybeSingle();

      let studentYearGroupId: string | null = null;
      const studentClassId = enrollment?.class_id || null;
      if (studentClassId) {
        const { data: cls } = await supabase
          .from("classes")
          .select("year_group_id")
          .eq("id", studentClassId)
          .single();
        studentYearGroupId = cls?.year_group_id || null;
      }

      // Fetch published resource pages visible to the student
      // Show resources that are: for the whole school (no year_group/class filter),
      // or matching the student's year group, or matching the student's class
      const { data: allPages } = await supabase
        .from("resource_pages")
        .select("id, title, subject, description, created_by, updated_at, year_group_id, class_id")
        .eq("published", true)
        .order("updated_at", { ascending: false });

      const resourcePages = (allPages || []).filter((p) => {
        // No restrictions — visible to all students in the school
        if (!p.year_group_id && !p.class_id) return true;
        // Matches student's class
        if (p.class_id && p.class_id === studentClassId) return true;
        // Matches student's year group (and no specific class restriction)
        if (p.year_group_id && !p.class_id && p.year_group_id === studentYearGroupId) return true;
        return false;
      });

      if (!resourcePages || resourcePages.length === 0) {
        setLoading(false);
        return;
      }

      // Get teacher names
      const teacherIds = [...new Set(resourcePages.map((p) => p.created_by).filter(Boolean))];
      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds);
        (teachers || []).forEach((t) => { teacherMap[t.id] = t.full_name || "Teacher"; });
      }

      // Get block counts per page
      const pageIds = resourcePages.map((p) => p.id);
      const { data: blocks } = await supabase
        .from("resource_blocks")
        .select("resource_page_id")
        .in("resource_page_id", pageIds);

      const blockCounts: Record<string, number> = {};
      (blocks || []).forEach((b) => {
        blockCounts[b.resource_page_id] = (blockCounts[b.resource_page_id] || 0) + 1;
      });

      setPages(resourcePages.map((p) => ({
        ...p,
        teacher_name: p.created_by ? teacherMap[p.created_by] || "Teacher" : "Teacher",
        block_count: blockCounts[p.id] || 0,
      })));
      setLoading(false);
    }
    fetchResources();
  }, [supabase]);

  const allSubjects = useMemo(() => {
    const subjects = new Set<string>();
    pages.forEach((p) => { if (p.subject) subjects.add(p.subject); });
    return [...subjects].sort();
  }, [pages]);

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !(p.subject || "").toLowerCase().includes(q) && !(p.description || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      if (subjectFilter !== "all" && p.subject !== subjectFilter) return false;
      return true;
    });
  }, [pages, searchQuery, subjectFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2">
        <h1 className="text-[22px] font-bold text-[#2D2D2D]">Resources</h1>
        <p className="text-[12px] text-[#9A9A9A] mt-0.5">Learning materials shared by your teachers</p>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl border-[#2D2D2D]/10 bg-white h-9 text-[13px]"
          />
        </div>
        {allSubjects.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#9A9A9A]" />
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-40 h-9 rounded-xl border-[#2D2D2D]/10 text-[12px]">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {allSubjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjectFilter !== "all" && (
              <button onClick={() => setSubjectFilter("all")} className="text-[10px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D] flex items-center gap-0.5">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        )}
        <span className="text-[10px] font-bold text-[#9A9A9A] ml-auto">{filtered.length} resource{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Resource List */}
      {filtered.length === 0 ? (
        <div className="dash-card rounded-2xl flex-1 flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
            <BookOpen className="h-7 w-7 text-[#9A9A9A]/40" />
          </div>
          <p className="mt-3 text-[14px] font-semibold text-[#9A9A9A]">
            {pages.length === 0 ? "No resources yet" : "No matching resources"}
          </p>
          <p className="mt-1 text-[11px] text-[#9A9A9A]/60">
            {pages.length === 0 ? "Your teachers will share learning materials here" : "Try adjusting your search or filter"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((page) => (
            <Link
              key={page.id}
              href={`/dashboard/student/resources/${page.id}`}
              className="dash-card rounded-2xl hover:shadow-md transition-shadow group"
            >
              <div className="px-4 pt-4 pb-3">
                <h3 className="text-[15px] font-bold text-[#2D2D2D] truncate group-hover:opacity-80 transition-opacity">
                  {page.title}
                </h3>
                {page.description && (
                  <p className="text-[11px] text-[#9A9A9A] mt-1 line-clamp-2">{page.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {page.subject && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2 py-0.5">
                      <BookOpen className="h-2.5 w-2.5" /> {page.subject}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2 py-0.5">
                    <User className="h-2.5 w-2.5" /> {page.teacher_name}
                  </span>
                  {(page.block_count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2 py-0.5">
                      <Layers className="h-2.5 w-2.5" /> {page.block_count} block{page.block_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-px bg-[#2D2D2D]/10" />
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#9A9A9A] flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(page.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#9A9A9A] group-hover:text-[#2D2D2D] transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
