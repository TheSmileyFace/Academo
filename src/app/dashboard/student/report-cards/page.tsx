import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentReportCardsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reportCards } = await supabase
    .from("report_cards")
    .select("id, term, academic_year, overall_grade, grades, teacher_comment, admin_comment, published, published_at, created_at")
    .eq("student_id", user.id)
    .eq("published", true)
    .order("created_at", { ascending: false });

  const cards = reportCards || [];

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Your grades</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Report Cards</h1>
      </div>

      {cards.length === 0 ? (
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col items-center justify-center py-20 text-center px-5">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">No report cards yet</p>
          <p className="text-[12px] text-[#9A9A9A] mt-1">Published report cards will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pb-4">
          {cards.map((rc) => {
            const grades = (rc.grades as any[]) || [];
            return (
              <div key={rc.id} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-[#2D2D2D]/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[16px] font-bold text-[#2D2D2D] dark:text-white">{rc.term}</p>
                    <p className="text-[12px] text-[#9A9A9A] mt-0.5">{rc.academic_year}</p>
                  </div>
                  {rc.overall_grade != null && (
                    <div className="text-center">
                      <p className={`text-[28px] font-bold leading-tight ${
                        rc.overall_grade >= 70 ? "text-green-600 dark:text-green-400"
                        : rc.overall_grade >= 50 ? "text-amber-600 dark:text-amber-400"
                        : "text-red-500 dark:text-red-400"
                      }`}>
                        {rc.overall_grade}%
                      </p>
                      <p className="text-[10px] font-bold text-[#9A9A9A]">Overall</p>
                    </div>
                  )}
                </div>

                {/* Subject grades */}
                {grades.length > 0 && (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {grades.map((g: any, idx: number) => (
                      <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white">{g.subject_name}</p>
                          {g.comment && (
                            <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5 italic line-clamp-1">{g.comment}</p>
                          )}
                        </div>
                        {g.grade != null && (
                          <span className={`text-[15px] font-bold shrink-0 ${
                            g.grade >= 70 ? "text-green-600 dark:text-green-400"
                            : g.grade >= 50 ? "text-amber-600 dark:text-amber-400"
                            : "text-red-500 dark:text-red-400"
                          }`}>
                            {g.grade}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments */}
                {(rc.teacher_comment || rc.admin_comment) && (
                  <div className="px-5 py-4 border-t border-[#2D2D2D]/5 dark:border-white/5 space-y-2">
                    {rc.teacher_comment && (
                      <div>
                        <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wide">Teacher Comment</p>
                        <p className="text-[12px] text-[#2D2D2D] dark:text-white mt-0.5 leading-relaxed">{rc.teacher_comment}</p>
                      </div>
                    )}
                    {rc.admin_comment && (
                      <div>
                        <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wide">Head Teacher Comment</p>
                        <p className="text-[12px] text-[#2D2D2D] dark:text-white mt-0.5 leading-relaxed">{rc.admin_comment}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="px-5 py-2 border-t border-[#2D2D2D]/5 dark:border-white/5">
                  <p className="text-[10px] text-[#9A9A9A]/60">
                    Published {rc.published_at ? new Date(rc.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
