import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function StudentProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, bio, phone, role, school_id, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Enrollment info
  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("class_id, classes(name, year_groups(name))")
    .eq("student_id", user.id)
    .single();

  const cls = enrollment?.classes as any;
  const className = cls ? `${cls?.year_groups?.name || ""} ${cls?.name || ""}`.trim() : null;

  // Gamification stats
  const { data: stats } = await supabase
    .from("student_stats")
    .select("total_points, current_streak, longest_streak, lives")
    .eq("student_id", user.id)
    .single();

  // Behavior summary
  const { data: behaviorRows } = await supabase
    .from("behavior_events")
    .select("type, points")
    .eq("student_id", user.id);

  const rewards = (behaviorRows || []).filter((b) => b.type === "reward");
  const cautions = (behaviorRows || []).filter((b) => b.type === "caution");
  const rewardPoints = rewards.reduce((sum, b) => sum + (b.points || 0), 0);

  // Attendance (this academic year)
  const yearStart = new Date();
  yearStart.setMonth(yearStart.getMonth() - 10);
  const { data: attRows } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", user.id)
    .gte("date", yearStart.toISOString().split("T")[0]);

  const attTotal = (attRows || []).length;
  const attPresent = (attRows || []).filter((a) => a.status === "present").length;
  const attRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;

  // Grade average
  const { data: gradedSubs } = await supabase
    .from("submissions")
    .select("grade")
    .eq("student_id", user.id)
    .eq("status", "graded")
    .not("grade", "is", null);

  const avgGrade = gradedSubs && gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((s, g) => s + (g.grade || 0), 0) / gradedSubs.length)
    : null;

  // Leaderboard (top 10 in school)
  let leaderboard: { student_id: string; total_points: number; current_streak: number; full_name: string; avatar_url: string | null }[] = [];
  if (profile.school_id) {
    const { data: topStats } = await supabase
      .from("student_stats")
      .select("student_id, total_points, current_streak")
      .eq("school_id", profile.school_id)
      .order("total_points", { ascending: false })
      .limit(10);

    if (topStats && topStats.length > 0) {
      const sIds = topStats.map((s) => s.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", sIds);

      const pMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (profiles || []).forEach((p) => { pMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });

      leaderboard = topStats.map((s) => ({
        ...s,
        full_name: pMap[s.student_id]?.full_name || "Student",
        avatar_url: pMap[s.student_id]?.avatar_url || null,
      }));
    }
  }

  const initials = profile.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Your profile</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Profile</h1>
      </div>

      {/* Profile card */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-6 py-5 shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#2D2D2D]/5 dark:bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name} width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[22px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold text-[#2D2D2D] dark:text-white leading-tight">{profile.full_name}</h2>
            <p className="text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {className && (
                <span className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] bg-[#2D2D2D]/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
                  {className}
                </span>
              )}
              <span className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0]">Member since {memberSince}</span>
            </div>
          </div>
          {/* Lives */}
          {stats?.lives != null && (
            <div className="flex gap-1 shrink-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-[18px] ${i < stats.lives ? "opacity-100" : "opacity-20 grayscale"}`}>❤️</span>
              ))}
            </div>
          )}
        </div>
        {profile.bio && (
          <p className="mt-3 text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] leading-relaxed border-t border-[#2D2D2D]/5 dark:border-white/5 pt-3">{profile.bio}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
        {[
          { label: "Streak", value: `${stats?.current_streak ?? 0} 🔥` },
          { label: "Points", value: (stats?.total_points ?? rewardPoints).toString() },
          { label: "Rewards", value: rewards.length.toString(), color: "text-green-600 dark:text-green-400" },
          { label: "Avg Grade", value: avgGrade != null ? `${avgGrade}%` : "—" },
          { label: "Attendance", value: attRate != null ? `${attRate}%` : "—" },
        ].map((s) => (
          <div key={s.label} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center">
            <p className={`text-[20px] font-bold leading-tight ${s.color || "text-[#2D2D2D] dark:text-white"}`}>{s.value}</p>
            <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Leaderboard</p>
          <span className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">Top students in your school</span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No leaderboard data yet</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Complete assignments and earn rewards to appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {leaderboard.map((entry, idx) => {
                const isMe = entry.student_id === user.id;
                const entryInitials = entry.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={entry.student_id} className={`px-5 py-3 flex items-center gap-4 ${isMe ? "bg-[#2D2D2D]/[0.03] dark:bg-white/[0.03]" : ""}`}>
                    <span className={`text-[14px] font-bold w-6 text-center shrink-0 ${idx < 3 ? "text-[#2D2D2D] dark:text-white" : "text-[#9A9A9A]"}`}>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
                      {entry.avatar_url ? (
                        <Image src={entry.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-[#9A9A9A]">{entryInitials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold truncate ${isMe ? "text-[#2D2D2D] dark:text-white" : "text-[#2D2D2D] dark:text-white"}`}>
                        {entry.full_name} {isMe && <span className="text-[10px] font-bold text-[#9A9A9A] ml-1">(you)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {entry.current_streak > 0 && (
                        <span className="text-[11px] font-bold text-[#9A9A9A]">{entry.current_streak} 🔥</span>
                      )}
                      <span className="text-[14px] font-bold text-[#2D2D2D] dark:text-white">{entry.total_points}pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
