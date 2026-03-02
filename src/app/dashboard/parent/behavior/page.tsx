import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ParentBehaviorPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("parent_of")
    .eq("id", user.id)
    .single();

  const childId = profile?.parent_of;

  if (!childId) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="shrink-0" style={{ paddingTop: 23 }}>
          <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white">Behaviour</h1>
        </div>
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex items-center justify-center py-20">
          <p className="text-[13px] text-[#9A9A9A]">No child linked to your account yet.</p>
        </div>
      </div>
    );
  }

  const { data: child } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", childId)
    .single();

  const { data: rows } = await supabase
    .from("behavior_events")
    .select("id, type, reason, points, created_at, created_by")
    .eq("student_id", childId)
    .order("created_at", { ascending: false });

  const events = rows || [];

  const creatorIds = [...new Set(events.map((e) => e.created_by).filter(Boolean))];
  let creatorMap: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);
    (creators || []).forEach((c) => { creatorMap[c.id] = c.full_name; });
  }

  const { data: statsRow } = await supabase
    .from("student_stats")
    .select("total_points, current_streak, lives")
    .eq("student_id", childId)
    .single();

  const cautions = events.filter((e) => e.type === "caution");
  const rewards = events.filter((e) => e.type === "reward");
  const totalPoints = rewards.reduce((sum, e) => sum + (e.points || 0), 0);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">{child?.full_name || "Your child"}</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Behaviour</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Streak", value: `${statsRow?.current_streak ?? 0} 🔥`, color: "text-[#2D2D2D] dark:text-white" },
          { label: "Points", value: (statsRow?.total_points ?? totalPoints).toString(), color: "text-[#2D2D2D] dark:text-white" },
          { label: "Rewards", value: rewards.length.toString(), color: "text-green-600 dark:text-green-400" },
          { label: "Cautions", value: cautions.length.toString(), color: cautions.length > 0 ? "text-red-500 dark:text-red-400" : "text-[#2D2D2D] dark:text-white" },
        ].map((s) => (
          <div key={s.label} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center">
            <p className={`text-[22px] font-bold leading-tight ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lives */}
      {statsRow?.lives != null && (
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">Lives remaining</p>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-[18px] ${i < statsRow.lives ? "opacity-100" : "opacity-20 grayscale"}`}>❤️</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event list */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">All events</p>
          {totalPoints > 0 && (
            <span className="text-[11px] font-bold text-[#2D2D2D] dark:text-white bg-[#2D2D2D]/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
              {totalPoints} points earned
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No events yet</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Cautions and rewards from teachers will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {events.map((e) => (
                <div key={e.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${e.type === "caution" ? "bg-red-500" : "bg-green-500"}`} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#2D2D2D] dark:text-white leading-snug">{e.reason}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">
                        <span>{creatorMap[e.created_by] || "Teacher"}</span>
                        <span>·</span>
                        <span>
                          {new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      e.type === "caution"
                        ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    }`}>
                      {e.type}
                    </span>
                    {e.type === "reward" && e.points > 0 && (
                      <span className="text-[11px] font-bold text-[#2D2D2D] dark:text-white">+{e.points}pts</span>
                    )}
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
