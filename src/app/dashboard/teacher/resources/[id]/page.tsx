"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

interface PageData {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  published: boolean;
  page_bg_color: string;
  page_text_color: string;
  page_font_family: string;
  page_font_size: string;
}

interface Block {
  id: string;
  block_type: "text" | "heading" | "file" | "youtube" | "link" | "image" | "divider" | "callout" | "quote" | "code";
  content: Record<string, string>;
  sort_order: number;
}

const BLOCK_TYPES = [
  { type: "heading", label: "Heading", desc: "Section title" },
  { type: "text", label: "Text", desc: "Paragraph content" },
  { type: "callout", label: "Callout", desc: "Highlighted note" },
  { type: "quote", label: "Quote", desc: "Block quotation" },
  { type: "code", label: "Code", desc: "Code snippet" },
  { type: "divider", label: "Divider", desc: "Visual separator" },
  { type: "youtube", label: "YouTube", desc: "Embed video" },
  { type: "link", label: "Link", desc: "External URL" },
  { type: "image", label: "Image", desc: "Image URL" },
  { type: "file", label: "File", desc: "File link" },
] as const;

const FONT_OPTIONS = [
  "Inter", "Georgia", "Merriweather", "Roboto Mono", "system-ui",
];

const PRESET_BG_COLORS = ["#ffffff", "#f8f9fa", "#1a1a2e", "#0d1b2a", "#fdf6e3", "#f5f0eb", "#eef2ff", "#fef2f2"];
const PRESET_TEXT_COLORS = ["#2d2d2d", "#1a1a1a", "#374151", "#e5e7eb", "#f8fafc", "#1e3a5f", "#dc2626", "#059669"];

/* ─── YouTube embed ID extractor ─── */
function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ─── Preview Renderer ─── */
function PreviewBlock({ block, textColor }: { block: Block; textColor: string }) {
  const c = block.content;
  switch (block.block_type) {
    case "heading":
      return <h2 style={{ color: textColor, fontSize: "1.5em", fontWeight: 700, margin: "0.8em 0 0.4em" }}>{c.text || "Untitled heading"}</h2>;
    case "text":
      return <p style={{ color: textColor, lineHeight: 1.7, margin: "0.5em 0", whiteSpace: "pre-wrap" }}>{c.text || ""}</p>;
    case "callout":
      return (
        <div style={{ background: c.color || "#eef2ff", borderLeft: `4px solid ${c.accent || "#6366f1"}`, borderRadius: 8, padding: "12px 16px", margin: "0.5em 0" }}>
          {c.label && <p style={{ fontWeight: 700, fontSize: "0.85em", color: c.accent || "#6366f1", marginBottom: 4 }}>{c.label}</p>}
          <p style={{ color: textColor, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.text || ""}</p>
        </div>
      );
    case "quote":
      return (
        <blockquote style={{ borderLeft: "3px solid #d1d5db", paddingLeft: 16, margin: "0.8em 0", fontStyle: "italic", color: textColor, opacity: 0.8 }}>
          <p style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.text || ""}</p>
          {c.author && <footer style={{ fontSize: "0.85em", marginTop: 4, opacity: 0.7 }}>— {c.author}</footer>}
        </blockquote>
      );
    case "code":
      return (
        <pre style={{ background: "#1e1e1e", color: "#d4d4d4", borderRadius: 8, padding: "12px 16px", margin: "0.5em 0", fontSize: "0.875em", overflow: "auto", whiteSpace: "pre-wrap" }}>
          {c.language && <div style={{ fontSize: "0.75em", color: "#808080", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.language}</div>}
          <code>{c.text || ""}</code>
        </pre>
      );
    case "divider":
      return <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "1.5em 0" }} />;
    case "youtube": {
      const vid = getYouTubeId(c.url || "");
      return vid ? (
        <div style={{ margin: "0.8em 0" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: 12, overflow: "hidden", background: "#2d2d2d" }}>
            <iframe
              src={`https://www.youtube.com/embed/${vid}`}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {c.title && <p style={{ color: textColor, fontSize: "0.85em", marginTop: 6, opacity: 0.7 }}>{c.title}</p>}
        </div>
      ) : (
        <div style={{ padding: "24px 16px", background: "#f9fafb", borderRadius: 8, textAlign: "center", color: "#9ca3af", margin: "0.5em 0" }}>
          Paste a YouTube URL to see the preview
        </div>
      );
    }
    case "link":
      return (
        <a
          href={c.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block", padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 10,
            textDecoration: "none", margin: "0.5em 0", transition: "border-color 0.2s",
          }}
        >
          <p style={{ fontWeight: 600, color: "#2563eb", fontSize: "0.95em" }}>{c.title || c.url || "Link"}</p>
          {c.description && <p style={{ color: "#6b7280", fontSize: "0.8em", marginTop: 2 }}>{c.description}</p>}
          {c.url && <p style={{ color: "#9ca3af", fontSize: "0.75em", marginTop: 4 }}>{c.url}</p>}
        </a>
      );
    case "image":
      return c.url ? (
        <figure style={{ margin: "0.8em 0" }}>
          <img src={c.url} alt={c.caption || ""} style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight: 400 }} />
          {c.caption && <figcaption style={{ color: textColor, opacity: 0.6, fontSize: "0.8em", marginTop: 6, textAlign: "center" }}>{c.caption}</figcaption>}
        </figure>
      ) : (
        <div style={{ padding: "24px", background: "#f9fafb", borderRadius: 8, textAlign: "center", color: "#9ca3af", margin: "0.5em 0" }}>Add an image URL</div>
      );
    case "file":
      return (
        <a href={c.url || "#"} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 10, textDecoration: "none", margin: "0.5em 0" }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7em", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", flexShrink: 0 }}>
            {c.type || "FILE"}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: textColor, fontSize: "0.9em" }}>{c.name || "File"}</p>
            {c.url && <p style={{ color: "#9ca3af", fontSize: "0.75em", marginTop: 1 }}>Download</p>}
          </div>
        </a>
      );
    default:
      return null;
  }
}

export default function ResourceEditorPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const pageId = params.id as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Page metadata
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Page styling
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#2d2d2d");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState("16px");

  // UI state
  const [activePanel, setActivePanel] = useState<"blocks" | "style">("blocks");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [showBlockPicker, setShowBlockPicker] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: pageData } = await supabase
        .from("resource_pages")
        .select("id, title, subject, description, published, page_bg_color, page_text_color, page_font_family, page_font_size")
        .eq("id", pageId)
        .single();

      if (!pageData) { setLoading(false); return; }
      setPage(pageData as PageData);
      setEditTitle(pageData.title);
      setEditDescription(pageData.description || "");
      setBgColor(pageData.page_bg_color || "#ffffff");
      setTextColor(pageData.page_text_color || "#2d2d2d");
      setFontFamily(pageData.page_font_family || "Inter");
      setFontSize(pageData.page_font_size || "16px");

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

  const addBlock = async (blockType: string) => {
    const defaultContent: Record<string, string> = {};
    if (blockType === "heading") defaultContent.text = "";
    if (blockType === "text") defaultContent.text = "";
    if (blockType === "callout") { defaultContent.text = ""; defaultContent.label = "Note"; defaultContent.color = "#eef2ff"; defaultContent.accent = "#6366f1"; }
    if (blockType === "quote") { defaultContent.text = ""; defaultContent.author = ""; }
    if (blockType === "code") { defaultContent.text = ""; defaultContent.language = ""; }
    if (blockType === "youtube") { defaultContent.url = ""; defaultContent.title = ""; }
    if (blockType === "link") { defaultContent.url = ""; defaultContent.title = ""; defaultContent.description = ""; }
    if (blockType === "image") { defaultContent.url = ""; defaultContent.caption = ""; }
    if (blockType === "file") { defaultContent.url = ""; defaultContent.name = ""; defaultContent.type = ""; }

    const newOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) + 1 : 0;

    const { data, error } = await supabase
      .from("resource_blocks")
      .insert({
        resource_page_id: pageId,
        block_type: blockType,
        content: defaultContent,
        sort_order: newOrder,
      })
      .select("id, block_type, content, sort_order")
      .single();

    if (error) { toast.error("Failed to add block"); return; }
    const newBlock = data as Block;
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlock(newBlock.id);
    setShowBlockPicker(false);
  };

  const updateBlockContent = (blockId: string, key: string, value: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, content: { ...b.content, [key]: value } } : b
      )
    );
  };

  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("resource_blocks").delete().eq("id", blockId);
    if (error) { toast.error("Failed to delete block"); return; }
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    if (selectedBlock === blockId) setSelectedBlock(null);
    toast.success("Block deleted");
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    newBlocks.forEach((b, i) => { b.sort_order = i; });
    setBlocks(newBlocks);
  };

  const saveAll = async () => {
    setSaving(true);

    const { error: pageError } = await supabase
      .from("resource_pages")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        page_bg_color: bgColor,
        page_text_color: textColor,
        page_font_family: fontFamily,
        page_font_size: fontSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pageId);

    if (pageError) {
      toast.error("Failed to save: " + pageError.message);
      setSaving(false);
      return;
    }

    for (const block of blocks) {
      await supabase
        .from("resource_blocks")
        .update({ content: block.content, sort_order: block.sort_order })
        .eq("id", block.id);
    }

    setPage((prev) => prev ? { ...prev, title: editTitle.trim(), description: editDescription.trim() || null, page_bg_color: bgColor, page_text_color: textColor, page_font_family: fontFamily, page_font_size: fontSize } : prev);
    toast.success("All changes saved!");
    setSaving(false);
  };

  const togglePublish = async () => {
    if (!page) return;
    const newState = !page.published;
    const { error } = await supabase
      .from("resource_pages")
      .update({ published: newState, updated_at: new Date().toISOString() })
      .eq("id", pageId);
    if (error) { toast.error("Failed to update"); return; }
    setPage({ ...page, published: newState });
    toast.success(newState ? "Published! Students can see this." : "Unpublished.");
  };

  const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A9A9A]" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-sm text-[#9A9A9A]">Resource page not found</p>
        <Link href="/dashboard/teacher/resources" className="mt-3 text-sm font-semibold text-[#2D2D2D] dark:text-white">
          Back to resources
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col -mx-6 -my-5">
      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#2D2D2D]/10 dark:border-white/10 shrink-0 bg-white dark:bg-[#1E1E1E]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/teacher/resources"
            className="text-[13px] font-semibold text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors shrink-0"
          >
            ← Back
          </Link>
          <div className="w-px h-4 bg-[#2D2D2D]/10 dark:bg-white/10" />
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-[16px] font-semibold text-[#2D2D2D] dark:text-white bg-transparent border-none outline-none min-w-0 flex-1 placeholder:text-[#9A9A9A]"
            placeholder="Page title..."
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            page.published ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
          }`}>
            {page.published ? "Published" : "Draft"}
          </span>
          <button
            onClick={togglePublish}
            className="text-[12px] font-semibold text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2D2D]"
          >
            {page.published ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="text-[12px] font-bold text-white bg-[#2D2D2D] dark:bg-white dark:text-[#2D2D2D] px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* ─── MAIN EDITOR LAYOUT ─── */}
      <div className="flex-1 flex min-h-0">
        {/* ─── LEFT PANEL (Editor) ─── */}
        <div className="w-[380px] shrink-0 border-r border-[#2D2D2D]/10 dark:border-white/10 flex flex-col bg-white dark:bg-[#1E1E1E]">
          {/* Panel tabs */}
          <div className="flex border-b border-[#2D2D2D]/10 dark:border-white/10 shrink-0">
            <button
              onClick={() => setActivePanel("blocks")}
              className={`flex-1 text-[13px] font-semibold py-2.5 transition-colors ${
                activePanel === "blocks" ? "text-[#2D2D2D] dark:text-white border-b-2 border-[#2D2D2D] dark:border-white" : "text-[#9A9A9A] dark:text-[#A0A0A0]"
              }`}
            >
              Blocks
            </button>
            <button
              onClick={() => setActivePanel("style")}
              className={`flex-1 text-[13px] font-semibold py-2.5 transition-colors ${
                activePanel === "style" ? "text-[#2D2D2D] dark:text-white border-b-2 border-[#2D2D2D] dark:border-white" : "text-[#9A9A9A] dark:text-[#A0A0A0]"
              }`}
            >
              Page Style
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === "blocks" ? (
              <div className="space-y-2">
                {/* Description field */}
                <div className="mb-3">
                  <label className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Brief description for students..."
                    rows={2}
                    className="mt-1 w-full text-[13px] text-[#2D2D2D] dark:text-white bg-gray-50 dark:bg-[#2D2D2D] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 resize-none outline-none focus:border-[#2D2D2D]/30 dark:focus:border-white/30 transition-colors placeholder:text-[#9A9A9A]"
                  />
                </div>

                {/* Block list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Content Blocks ({blocks.length})</label>
                  </div>

                  {blocks.length === 0 && !showBlockPicker && (
                    <div className="rounded-xl border-2 border-dashed border-[#2D2D2D]/10 dark:border-white/10 py-8 text-center">
                      <p className="text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0]">No blocks yet</p>
                      <p className="text-[11px] text-[#C0C0C0] dark:text-[#808080] mt-0.5">Add blocks to build your page</p>
                    </div>
                  )}

                  {blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlock(block.id)}
                      className={`rounded-lg border px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                        selectedBlock === block.id
                          ? "border-[#2D2D2D]/30 dark:border-white/30 bg-gray-50 dark:bg-[#2D2D2D]"
                          : "border-[#2D2D2D]/10 dark:border-white/10 hover:border-[#2D2D2D]/20 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase shrink-0">{block.block_type}</span>
                          <span className="text-[12px] text-[#2D2D2D] dark:text-white truncate">
                            {block.content.text?.slice(0, 40) || block.content.title?.slice(0, 40) || block.content.url?.slice(0, 40) || "Empty"}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 ml-2">
                          {idx > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "up"); }}
                              className="text-[11px] text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-[#3D3D3D]"
                            >↑</button>
                          )}
                          {idx < blocks.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "down"); }}
                              className="text-[11px] text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-[#3D3D3D]"
                            >↓</button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                            className="text-[11px] text-red-400 hover:text-red-600 px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 ml-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Inline editor for selected block */}
                      {selectedBlock === block.id && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#2D2D2D]/10 dark:border-white/10 space-y-2" onClick={(e) => e.stopPropagation()}>
                          {(block.block_type === "heading" || block.block_type === "text") && (
                            <textarea
                              value={block.content.text || ""}
                              onChange={(e) => updateBlockContent(block.id, "text", e.target.value)}
                              placeholder={block.block_type === "heading" ? "Heading text..." : "Content text..."}
                              rows={block.block_type === "heading" ? 1 : 3}
                              className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 resize-none outline-none focus:border-[#2D2D2D]/30 dark:focus:border-white/30"
                            />
                          )}

                          {block.block_type === "callout" && (
                            <>
                              <input
                                value={block.content.label || ""}
                                onChange={(e) => updateBlockContent(block.id, "label", e.target.value)}
                                placeholder="Label (e.g. Note, Warning, Tip)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <textarea
                                value={block.content.text || ""}
                                onChange={(e) => updateBlockContent(block.id, "text", e.target.value)}
                                placeholder="Callout content..."
                                rows={2}
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 resize-none outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] text-[#9A9A9A] shrink-0">BG</label>
                                <input type="color" value={block.content.color || "#eef2ff"} onChange={(e) => updateBlockContent(block.id, "color", e.target.value)} className="w-7 h-7 rounded cursor-pointer border-none" />
                                <label className="text-[11px] text-[#9A9A9A] shrink-0 ml-2">Accent</label>
                                <input type="color" value={block.content.accent || "#6366f1"} onChange={(e) => updateBlockContent(block.id, "accent", e.target.value)} className="w-7 h-7 rounded cursor-pointer border-none" />
                              </div>
                            </>
                          )}

                          {block.block_type === "quote" && (
                            <>
                              <textarea
                                value={block.content.text || ""}
                                onChange={(e) => updateBlockContent(block.id, "text", e.target.value)}
                                placeholder="Quote text..."
                                rows={2}
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 resize-none outline-none"
                              />
                              <input
                                value={block.content.author || ""}
                                onChange={(e) => updateBlockContent(block.id, "author", e.target.value)}
                                placeholder="Author (optional)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                            </>
                          )}

                          {block.block_type === "code" && (
                            <>
                              <input
                                value={block.content.language || ""}
                                onChange={(e) => updateBlockContent(block.id, "language", e.target.value)}
                                placeholder="Language (e.g. python, javascript)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <textarea
                                value={block.content.text || ""}
                                onChange={(e) => updateBlockContent(block.id, "text", e.target.value)}
                                placeholder="Code..."
                                rows={4}
                                className="w-full text-[13px] font-mono text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 resize-none outline-none"
                              />
                            </>
                          )}

                          {block.block_type === "youtube" && (
                            <>
                              <input
                                value={block.content.url || ""}
                                onChange={(e) => updateBlockContent(block.id, "url", e.target.value)}
                                placeholder="YouTube URL"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <input
                                value={block.content.title || ""}
                                onChange={(e) => updateBlockContent(block.id, "title", e.target.value)}
                                placeholder="Caption (optional)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                            </>
                          )}

                          {block.block_type === "link" && (
                            <>
                              <input
                                value={block.content.url || ""}
                                onChange={(e) => updateBlockContent(block.id, "url", e.target.value)}
                                placeholder="URL (https://...)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <input
                                value={block.content.title || ""}
                                onChange={(e) => updateBlockContent(block.id, "title", e.target.value)}
                                placeholder="Link title"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <input
                                value={block.content.description || ""}
                                onChange={(e) => updateBlockContent(block.id, "description", e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                            </>
                          )}

                          {block.block_type === "image" && (
                            <>
                              <input
                                value={block.content.url || ""}
                                onChange={(e) => updateBlockContent(block.id, "url", e.target.value)}
                                placeholder="Image URL"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <input
                                value={block.content.caption || ""}
                                onChange={(e) => updateBlockContent(block.id, "caption", e.target.value)}
                                placeholder="Caption (optional)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                            </>
                          )}

                          {block.block_type === "file" && (
                            <>
                              <input
                                value={block.content.url || ""}
                                onChange={(e) => updateBlockContent(block.id, "url", e.target.value)}
                                placeholder="File URL"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <input
                                value={block.content.name || ""}
                                onChange={(e) => updateBlockContent(block.id, "name", e.target.value)}
                                placeholder="File name (e.g. worksheet.pdf)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                              <input
                                value={block.content.type || ""}
                                onChange={(e) => updateBlockContent(block.id, "type", e.target.value)}
                                placeholder="File type (e.g. PDF, DOCX)"
                                className="w-full text-[13px] text-[#2D2D2D] dark:text-white bg-white dark:bg-[#333333] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-2 outline-none"
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Block button / picker */}
                  {showBlockPicker ? (
                    <div className="rounded-xl border border-[#2D2D2D]/10 dark:border-white/10 bg-gray-50 dark:bg-[#2D2D2D] p-3 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase">Add Block</span>
                        <button onClick={() => setShowBlockPicker(false)} className="text-[11px] text-[#9A9A9A] hover:text-[#2D2D2D] dark:hover:text-white">✕</button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {BLOCK_TYPES.map((bt) => (
                          <button
                            key={bt.type}
                            onClick={() => addBlock(bt.type)}
                            className="text-left rounded-lg border border-[#2D2D2D]/10 dark:border-white/10 px-2.5 py-2 hover:bg-white dark:hover:bg-[#333333] transition-colors"
                          >
                            <p className="text-[12px] font-semibold text-[#2D2D2D] dark:text-white">{bt.label}</p>
                            <p className="text-[10px] text-[#9A9A9A] dark:text-[#A0A0A0]">{bt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowBlockPicker(true)}
                      className="w-full mt-2 rounded-xl border-2 border-dashed border-[#2D2D2D]/10 dark:border-white/10 py-2.5 text-[13px] font-semibold text-[#9A9A9A] dark:text-[#A0A0A0] hover:text-[#2D2D2D] dark:hover:text-white hover:border-[#2D2D2D]/20 dark:hover:border-white/20 transition-colors"
                    >
                      + Add Block
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* ─── STYLE PANEL ─── */
              <div className="space-y-5">
                {/* Background Color */}
                <div>
                  <label className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Background Color</label>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {PRESET_BG_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setBgColor(c)}
                        className="w-8 h-8 rounded-lg border-2 transition-all shrink-0"
                        style={{
                          backgroundColor: c,
                          borderColor: bgColor === c ? "#2d2d2d" : "rgba(0,0,0,0.1)",
                          transform: bgColor === c ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-none"
                    />
                    <input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="text-[13px] text-[#2D2D2D] dark:text-white bg-gray-50 dark:bg-[#2D2D2D] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-1.5 w-24 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Text Color</label>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {PRESET_TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className="w-8 h-8 rounded-lg border-2 transition-all shrink-0"
                        style={{
                          backgroundColor: c,
                          borderColor: textColor === c ? (c === "#2d2d2d" ? "#6366f1" : "#2d2d2d") : "rgba(0,0,0,0.1)",
                          transform: textColor === c ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-none"
                    />
                    <input
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="text-[13px] text-[#2D2D2D] dark:text-white bg-gray-50 dark:bg-[#2D2D2D] border border-[#2D2D2D]/10 dark:border-white/10 rounded-lg px-3 py-1.5 w-24 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Font Family</label>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {FONT_OPTIONS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFontFamily(f)}
                        className={`text-left text-[13px] px-3 py-2 rounded-lg border transition-all ${
                          fontFamily === f
                            ? "border-[#2D2D2D]/30 dark:border-white/30 bg-gray-50 dark:bg-[#2D2D2D] font-semibold text-[#2D2D2D] dark:text-white"
                            : "border-[#2D2D2D]/10 dark:border-white/10 text-[#9A9A9A] dark:text-[#A0A0A0] hover:border-[#2D2D2D]/20 dark:hover:border-white/20"
                        }`}
                        style={{ fontFamily: f }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Base Font Size</label>
                  <div className="flex gap-1.5 mt-2">
                    {["14px", "15px", "16px", "17px", "18px"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFontSize(s)}
                        className={`text-[12px] px-3 py-1.5 rounded-lg border transition-all ${
                          fontSize === s
                            ? "border-[#2D2D2D]/30 dark:border-white/30 bg-gray-50 dark:bg-[#2D2D2D] font-semibold text-[#2D2D2D] dark:text-white"
                            : "border-[#2D2D2D]/10 dark:border-white/10 text-[#9A9A9A] dark:text-[#A0A0A0] hover:border-[#2D2D2D]/20 dark:hover:border-white/20"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL (Live Preview) ─── */}
        <div className="flex-1 min-w-0 bg-[#f0f0f0] dark:bg-[#111] overflow-auto">
          <div className="flex items-center justify-center min-h-full p-6">
            <div
              className="w-full max-w-[640px] min-h-[600px] rounded-2xl shadow-xl overflow-hidden"
              style={{
                backgroundColor: bgColor,
                fontFamily: fontFamily,
                fontSize: fontSize,
                color: textColor,
              }}
            >
              {/* Preview header */}
              <div style={{ padding: "32px 32px 0" }}>
                <h1 style={{ fontSize: "1.8em", fontWeight: 800, lineHeight: 1.2, color: textColor }}>
                  {editTitle || "Untitled Page"}
                </h1>
                {editDescription && (
                  <p style={{ marginTop: 8, opacity: 0.6, fontSize: "0.9em", lineHeight: 1.5 }}>{editDescription}</p>
                )}
                {page.subject && (
                  <div style={{ marginTop: 12 }}>
                    <span style={{
                      display: "inline-block",
                      fontSize: "0.7em",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: `${textColor}15`,
                      color: textColor,
                      opacity: 0.6,
                    }}>
                      {page.subject}
                    </span>
                  </div>
                )}
                <hr style={{ border: "none", borderTop: `1px solid ${textColor}20`, margin: "20px 0 0" }} />
              </div>

              {/* Preview blocks */}
              <div style={{ padding: "16px 32px 32px" }}>
                {blocks.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "40px 0", opacity: 0.4 }}>
                    Add blocks on the left to see the preview here
                  </p>
                ) : (
                  blocks.map((block) => (
                    <div
                      key={block.id}
                      onClick={() => { setSelectedBlock(block.id); setActivePanel("blocks"); }}
                      style={{
                        cursor: "pointer",
                        borderRadius: 6,
                        outline: selectedBlock === block.id ? `2px solid #6366f1` : "2px solid transparent",
                        outlineOffset: 4,
                        transition: "outline-color 0.15s",
                      }}
                    >
                      <PreviewBlock block={block} textColor={textColor} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
