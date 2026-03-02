import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Inbox, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminResources() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Fetch all resource pages in the school
  let resourcePages: { id: string; title: string; subject: string | null; description: string | null; created_by: string | null; published: boolean; updated_at: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("resource_pages")
      .select("id, title, subject, description, created_by, published, updated_at")
      .eq("school_id", schoolId)
      .order("updated_at", { ascending: false });
    resourcePages = data || [];
  }

  // Fetch teacher names
  const teacherIds = [...new Set(resourcePages.map((p) => p.created_by).filter(Boolean))] as string[];
  let teacherMap: Record<string, string> = {};
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);
    (teachers || []).forEach((t) => { teacherMap[t.id] = t.full_name || "Teacher"; });
  }

  // Block counts
  const pageIds = resourcePages.map((p) => p.id);
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

  const publishedCount = resourcePages.filter((p) => p.published).length;
  const draftCount = resourcePages.length - publishedCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">All Resources</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {resourcePages.length} total · {publishedCount} published · {draftCount} draft{draftCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pages</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{resourcePages.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Published</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{publishedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Drafts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{draftCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource List */}
      {resourcePages.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No resources in the school yet</p>
            <p className="text-xs text-gray-300 mt-1">Resources created by teachers will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {resourcePages.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      p.published ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    {p.subject && <span>{p.subject}</span>}
                    {p.subject && <span className="text-gray-200">·</span>}
                    <span>{p.created_by ? teacherMap[p.created_by] || "Teacher" : "Unknown"}</span>
                    <span className="text-gray-200">·</span>
                    <span>{blockCounts[p.id] || 0} block{(blockCounts[p.id] || 0) !== 1 ? "s" : ""}</span>
                    <span className="text-gray-200">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(p.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
