import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AttendanceClient from "./attendance-client";

export default async function TeacherAttendancePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, full_name")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;
  if (!schoolId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[14px] text-[#9A9A9A]">No school assigned to your profile.</p>
      </div>
    );
  }

  // Get classes this teacher is assigned to
  const { data: classSubjects } = await supabase
    .from("class_subjects")
    .select("class_id, classes(id, name, year_groups(name))")
    .eq("teacher_id", user.id);

  let classes: { id: string; name: string; year_group_name: string }[] = [];

  if (classSubjects && classSubjects.length > 0) {
    const seen = new Set<string>();
    classSubjects.forEach((cs) => {
      const cls = cs.classes as any;
      if (cls && !seen.has(cls.id)) {
        seen.add(cls.id);
        classes.push({
          id: cls.id,
          name: cls.name,
          year_group_name: cls.year_groups?.name || "",
        });
      }
    });
  } else {
    // Fallback: show all school classes
    const { data: allClasses } = await supabase
      .from("classes")
      .select("id, name, year_groups(name)")
      .eq("school_id", schoolId)
      .order("name");
    classes = (allClasses || []).map((c) => ({
      id: c.id,
      name: c.name,
      year_group_name: (c.year_groups as any)?.name || "",
    }));
  }

  classes.sort((a, b) => `${a.year_group_name} ${a.name}`.localeCompare(`${b.year_group_name} ${b.name}`));

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A]">Daily register</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Attendance</h1>
      </div>
      <AttendanceClient classes={classes} teacherId={user.id} schoolId={schoolId} />
    </div>
  );
}
