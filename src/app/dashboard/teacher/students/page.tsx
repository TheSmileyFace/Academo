import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function TeacherStudentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, full_name")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Get all classes this teacher teaches (via class_subjects)
  const { data: classSubjects } = await supabase
    .from("class_subjects")
    .select("class_id, subject_id, subjects(name), classes(id, name, year_groups(name))")
    .eq("teacher_id", user.id);

  const teacherClassIds = [...new Set((classSubjects || []).map((cs) => cs.class_id))];

  // Get all students enrolled in those classes
  let students: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    class_name: string;
    year_group_name: string;
    submission_count: number;
    pending_count: number;
  }[] = [];

  if (schoolId && teacherClassIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id, class_id, classes(name, year_groups(name))")
      .in("class_id", teacherClassIds);

    const studentIds = [...new Set((enrollments || []).map((e) => e.student_id))];

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", studentIds)
        .eq("role", "student");

      // Get submission counts per student for this teacher's assignments
      const { data: myAssignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("created_by", user.id);

      const myAssignmentIds = (myAssignments || []).map((a) => a.id);

      let submissionMap: Record<string, { total: number; pending: number }> = {};
      if (myAssignmentIds.length > 0) {
        const { data: subs } = await supabase
          .from("submissions")
          .select("student_id, status")
          .in("assignment_id", myAssignmentIds)
          .in("student_id", studentIds);

        (subs || []).forEach((s) => {
          if (!submissionMap[s.student_id]) submissionMap[s.student_id] = { total: 0, pending: 0 };
          submissionMap[s.student_id].total++;
          if (s.status === "submitted") submissionMap[s.student_id].pending++;
        });
      }

      const enrollmentMap: Record<string, { class_name: string; year_group_name: string }> = {};
      (enrollments || []).forEach((e) => {
        const cls = e.classes as any;
        enrollmentMap[e.student_id] = {
          class_name: cls?.name || "",
          year_group_name: cls?.year_groups?.name || "",
        };
      });

      students = (profiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name || "Unnamed",
        email: p.email || "",
        avatar_url: p.avatar_url || null,
        class_name: enrollmentMap[p.id]?.class_name || "",
        year_group_name: enrollmentMap[p.id]?.year_group_name || "",
        submission_count: submissionMap[p.id]?.total || 0,
        pending_count: submissionMap[p.id]?.pending || 0,
      }));

      students.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
  } else if (schoolId) {
    // If teacher has no class_subjects yet, show all students in their school
    const { data: allEnrollments } = await supabase
      .from("student_enrollments")
      .select("student_id, class_id, classes(name, year_groups(name))")
      .eq("school_id", schoolId);

    const studentIds = [...new Set((allEnrollments || []).map((e) => e.student_id))];

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", studentIds)
        .eq("role", "student");

      const enrollmentMap: Record<string, { class_name: string; year_group_name: string }> = {};
      (allEnrollments || []).forEach((e) => {
        const cls = e.classes as any;
        enrollmentMap[e.student_id] = {
          class_name: cls?.name || "",
          year_group_name: cls?.year_groups?.name || "",
        };
      });

      students = (profiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name || "Unnamed",
        email: p.email || "",
        avatar_url: p.avatar_url || null,
        class_name: enrollmentMap[p.id]?.class_name || "",
        year_group_name: enrollmentMap[p.id]?.year_group_name || "",
        submission_count: 0,
        pending_count: 0,
      }));

      students.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
  }

  // Group by class
  const grouped: Record<string, typeof students> = {};
  students.forEach((s) => {
    const key = s.year_group_name ? `${s.year_group_name} — ${s.class_name}` : s.class_name || "No Class";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0" style={{ paddingTop: 23 }}>
        <div>
          <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">My Students</p>
          <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">
            {students.length} student{students.length !== 1 ? "s" : ""}
          </h1>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center mb-4">
            <Image src="/Icons/black/grades black.svg" alt="" width={24} height={24} className="dark:invert opacity-40" />
          </div>
          <p className="text-[15px] font-semibold text-[#2D2D2D] dark:text-white">No students yet</p>
          <p className="text-[13px] text-[#9A9A9A] mt-1 max-w-xs">
            Students will appear here once they enrol and are assigned to your classes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pb-4">
          {Object.entries(grouped).map(([groupName, groupStudents]) => (
            <div key={groupName}>
              <p className="text-[11px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-widest mb-2 px-1">
                {groupName} · {groupStudents.length}
              </p>
              <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden">
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {groupStudents.map((s) => {
                    const initials = s.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <Link
                        key={s.id}
                        href={`/dashboard/teacher/students/${s.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
                          {s.avatar_url ? (
                            <Image src={s.avatar_url} alt={s.full_name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[13px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0]">{initials}</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white truncate">{s.full_name}</p>
                          <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] truncate">{s.email}</p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 shrink-0">
                          {s.pending_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                                {s.pending_count} to grade
                              </span>
                            </div>
                          )}
                          <div className="text-right">
                            <p className="text-[14px] font-bold text-[#2D2D2D] dark:text-white">{s.submission_count}</p>
                            <p className="text-[10px] text-[#9A9A9A] dark:text-[#A0A0A0]">submissions</p>
                          </div>
                          <div className="w-5 h-5 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-[#2D2D2D]/10 dark:group-hover:bg-white/10 transition-colors">
                            <span className="text-[10px] text-[#9A9A9A]">›</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
