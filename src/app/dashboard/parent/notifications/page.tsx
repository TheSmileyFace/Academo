import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Bell, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function ParentNotifications() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  // Fetch school announcements as notifications
  let announcements: { id: string; title: string; content: string; priority: string; created_at: string }[] = [];
  if (profile?.school_id) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, priority, created_at")
      .eq("school_id", profile.school_id)
      .order("created_at", { ascending: false })
      .limit(20);
    announcements = data || [];
  }

  const priorityStyle: Record<string, string> = {
    urgent: "border-l-red-500 bg-red-50/30",
    high: "border-l-amber-500 bg-amber-50/30",
    normal: "border-l-blue-300 bg-white",
    low: "border-l-gray-300 bg-white",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-gray-500">Stay updated on your child&apos;s school activity</p>
      </div>

      {announcements.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="h-7 w-7 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No notifications yet</p>
            <p className="text-xs text-gray-300 mt-1">School announcements and alerts will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} className={`border-0 shadow-sm border-l-4 ${priorityStyle[a.priority] || priorityStyle.normal}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0 mt-0.5">
                    <Megaphone className="h-4 w-4 text-[#1e3a5f]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                      {a.priority === "urgent" && (
                        <span className="text-[10px] font-bold uppercase bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Urgent</span>
                      )}
                      {a.priority === "high" && (
                        <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Important</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{a.content}</p>
                    <p className="mt-1.5 text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
