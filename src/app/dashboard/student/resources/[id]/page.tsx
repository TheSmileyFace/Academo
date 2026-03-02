"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  User,
  Clock,
  Loader2,
  FileText,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Type,
  Heading,
  Play,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface PageData {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  created_by: string | null;
  updated_at: string;
}

interface Block {
  id: string;
  block_type: "text" | "heading" | "file" | "youtube" | "link" | "image";
  content: Record<string, string>;
  sort_order: number;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function BlockRenderer({ block }: { block: Block }) {
  const c = block.content;

  switch (block.block_type) {
    case "heading":
      return (
        <div className="pt-2">
          <h2 className="text-[18px] font-bold text-[#2D2D2D]">{c.text || "Untitled"}</h2>
        </div>
      );

    case "text":
      return (
        <div className="text-[13px] text-[#2D2D2D] leading-relaxed whitespace-pre-wrap">
          {c.text || ""}
        </div>
      );

    case "file":
      return (
        <a
          href={c.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="dash-card rounded-xl flex items-center gap-3 px-4 py-3 hover:shadow-md transition-shadow group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2D2D2D]/5 shrink-0">
            <FileText className="h-5 w-5 text-[#2D2D2D]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#2D2D2D] truncate group-hover:opacity-80">
              {c.name || "File"}
            </p>
            {c.type && (
              <p className="text-[10px] font-bold text-[#9A9A9A] uppercase">{c.type}</p>
            )}
          </div>
          <Download className="h-4 w-4 text-[#9A9A9A] group-hover:text-[#2D2D2D] shrink-0" />
        </a>
      );

    case "youtube": {
      const videoId = getYouTubeId(c.url || "");
      if (!videoId) {
        return (
          <a
            href={c.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-card rounded-xl flex items-center gap-3 px-4 py-3 hover:shadow-md transition-shadow"
          >
            <Play className="h-5 w-5 text-red-500" />
            <span className="text-[13px] font-semibold text-[#2D2D2D]">{c.title || c.url || "Video"}</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#9A9A9A] ml-auto" />
          </a>
        );
      }
      return (
        <div className="space-y-1.5">
          {c.title && (
            <p className="text-[12px] font-semibold text-[#9A9A9A]">{c.title}</p>
          )}
          <div className="relative rounded-xl overflow-hidden bg-[#2D2D2D] aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      );
    }

    case "link":
      return (
        <a
          href={c.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="dash-card rounded-xl flex items-center gap-3 px-4 py-3 hover:shadow-md transition-shadow group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
            <ExternalLink className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#2D2D2D] truncate group-hover:opacity-80">
              {c.title || c.url || "Link"}
            </p>
            {c.description && (
              <p className="text-[10px] text-[#9A9A9A] truncate">{c.description}</p>
            )}
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-[#9A9A9A] group-hover:text-[#2D2D2D] shrink-0" />
        </a>
      );

    case "image":
      return (
        <div className="space-y-1.5">
          {c.caption && (
            <p className="text-[11px] font-bold text-[#9A9A9A]">{c.caption}</p>
          )}
          {c.url ? (
            <img
              src={c.url}
              alt={c.caption || "Image"}
              className="rounded-xl w-full object-cover max-h-[500px]"
            />
          ) : (
            <div className="dash-card rounded-xl flex items-center justify-center py-12">
              <ImageIcon className="h-8 w-8 text-[#9A9A9A]/30" />
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

export default function ResourceDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const pageId = params.id as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch page
      const { data: pageData } = await supabase
        .from("resource_pages")
        .select("id, title, subject, description, created_by, updated_at")
        .eq("id", pageId)
        .eq("published", true)
        .single();

      if (!pageData) { setLoading(false); return; }
      setPage(pageData);

      // Fetch teacher name
      if (pageData.created_by) {
        const { data: teacher } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", pageData.created_by)
          .single();
        if (teacher) setTeacherName(teacher.full_name || "Teacher");
      }

      // Fetch blocks
      const { data: blockData } = await supabase
        .from("resource_blocks")
        .select("id, block_type, content, sort_order")
        .eq("resource_page_id", pageId)
        .order("sort_order", { ascending: true });

      setBlocks((blockData || []) as Block[]);
      setLoading(false);
    }
    load();
  }, [supabase, pageId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-[14px] text-[#9A9A9A]">Resource not found</p>
        <Link href="/dashboard/student/resources" className="mt-3 text-[13px] font-semibold text-[#2D2D2D] hover:opacity-70">
          Back to resources
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pt-2">
      <Link
        href="/dashboard/student/resources"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9A9A9A] hover:text-[#2D2D2D] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Resources
      </Link>

      {/* Header */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-[22px] font-bold text-[#2D2D2D]">{page.title}</h1>
          {page.description && (
            <p className="text-[12px] text-[#9A9A9A] mt-1">{page.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {page.subject && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2.5 py-1">
                <BookOpen className="h-3 w-3" /> {page.subject}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2.5 py-1">
              <User className="h-3 w-3" /> {teacherName}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 rounded-lg px-2.5 py-1">
              <Clock className="h-3 w-3" /> Updated {new Date(page.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Content Blocks */}
      {blocks.length === 0 ? (
        <div className="dash-card rounded-2xl flex flex-col items-center justify-center py-12 text-center">
          <Type className="h-6 w-6 text-[#9A9A9A]/30 mb-2" />
          <p className="text-[13px] font-semibold text-[#9A9A9A]">No content yet</p>
          <p className="text-[10px] text-[#9A9A9A]/60 mt-1">This resource page has no content blocks</p>
        </div>
      ) : (
        <div className="dash-card rounded-2xl">
          <div className="px-4 py-4 space-y-4">
            {blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
