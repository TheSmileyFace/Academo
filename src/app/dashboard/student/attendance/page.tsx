import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentAttendancePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Last 60 days attendance
  const sixtyAgo = new Date();
  sixtyAgo.setDate(sixtyAgo.getDate() - 60);

  const { data: rows } = await supabase
    .from("attendance")
    .select("id, date, status, notes")
    .eq("student_id", user.id)
    .gte("date", sixtyAgo.toISOString().split("T")[0])
    .order("date", { ascending: false });

  const attendance = rows || [];

  const present = attendance.filter((a) => a.status === "present").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const late = attendance.filter((a) => a.status === "late").length;
  const excused = attendance.filter((a) => a.status === "excused").length;
  const total = attendance.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : null;

  const statusConfig: Record<string, { label: string; pill: string }> = {
    present: { label: "Present", pill: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
    absent: { label: "Absent", pill: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
    late: { label: "Late", pill: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
    excused: { label: "Excused", pill: "bg-[#2D2D2D]/5 text-[#9A9A9A] dark:bg-white/5 dark:text-[#A0A0A0]" },
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Last 60 days</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Attendance</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Rate", value: rate !== null ? `${rate}%` : "—", color: rate !== null && rate >= 90 ? "text-green-600 dark:text-green-400" : rate !== null && rate < 75 ? "text-red-500 dark:text-red-400" : "text-[#2D2D2D] dark:text-white" },
          { label: "Present", value: present.toString(), color: "text-green-600 dark:text-green-400" },
          { label: "Absent", value: absent.toString(), color: "text-red-500 dark:text-red-400" },
          { label: "Late", value: late.toString(), color: "text-amber-600 dark:text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-4 py-3 text-center">
            <p className={`text-[22px] font-bold leading-tight ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance rate bar */}
      {rate !== null && (
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">Attendance rate</p>
            <p className="text-[13px] font-bold text-[#2D2D2D] dark:text-white">{rate}%</p>
          </div>
          <div className="h-2 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${rate >= 90 ? "bg-green-500" : rate >= 75 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-1.5">
            {rate >= 90 ? "Excellent attendance — keep it up!" : rate >= 75 ? "Good — try to improve to above 90%" : "Below target — speak to your tutor"}
          </p>
        </div>
      )}

      {/* Record list */}
      <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Record</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {attendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No records yet</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Your attendance will appear here once your teacher marks the register</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {attendance.map((a) => {
                const cfg = statusConfig[a.status] || statusConfig.excused;
                return (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-[#2D2D2D] dark:text-white">
                        {new Date(a.date + "T00:00:00").toLocaleDateString("en-GB", {
                          weekday: "short", day: "numeric", month: "long",
                        })}
                      </p>
                      {a.notes && (
                        <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5 italic">{a.notes}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.pill}`}>
                      {cfg.label}
                    </span>
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
