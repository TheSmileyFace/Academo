import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ParentNotifications() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, parent_of")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;
  const childId = profile?.parent_of;

  // Fetch school announcements
  let announcements: { id: string; title: string; content: string; priority: string; created_at: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, priority, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(20);
    announcements = data || [];
  }

  // Fetch notifications for this user
  let notifications: { id: string; type: string; title: string; body: string | null; read: boolean; created_at: string }[] = [];
  const { data: notifData } = await supabase
    .from("notifications")
    .select("id, type, title, body, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  notifications = notifData || [];

  // Combine announcements and notifications into a unified feed
  type FeedItem = { id: string; kind: "announcement" | "notification"; title: string; body: string | null; priority?: string; type?: string; read?: boolean; created_at: string };
  const feed: FeedItem[] = [
    ...announcements.map((a) => ({ id: a.id, kind: "announcement" as const, title: a.title, body: a.content, priority: a.priority, created_at: a.created_at })),
    ...notifications.map((n) => ({ id: n.id, kind: "notification" as const, title: n.title, body: n.body, type: n.type, read: n.read, created_at: n.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Stay updated</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Notifications</h1>
      </div>

      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">All notifications</p>
          <span className="text-[11px] font-bold text-[#9A9A9A]">{feed.length} items</span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No notifications yet</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">School announcements and alerts will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {feed.map((item) => (
                <div key={`${item.kind}-${item.id}`} className={`px-5 py-4 ${item.read === false ? "bg-[#2D2D2D]/[0.02] dark:bg-white/[0.02]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${
                        item.priority === "urgent" || item.type === "behavior_caution" ? "bg-red-500"
                        : item.priority === "high" || item.type === "attendance_absent" ? "bg-amber-500"
                        : item.kind === "announcement" ? "bg-blue-500"
                        : "bg-green-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white leading-snug">{item.title}</p>
                          {item.priority === "urgent" && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shrink-0">Urgent</span>
                          )}
                          {item.priority === "high" && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shrink-0">Important</span>
                          )}
                        </div>
                        {item.body && (
                          <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-1 leading-relaxed line-clamp-2">{item.body}</p>
                        )}
                        <p className="text-[10px] text-[#9A9A9A]/60 dark:text-[#A0A0A0]/60 mt-1.5">
                          {new Date(item.created_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                      item.kind === "announcement"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-[#2D2D2D]/5 text-[#9A9A9A] dark:bg-white/5"
                    }`}>
                      {item.kind === "announcement" ? "Announcement" : item.type?.replace(/_/g, " ") || "Alert"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
