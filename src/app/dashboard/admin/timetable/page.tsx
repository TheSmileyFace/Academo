import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TimetableBuilderClient from "./timetable-builder-client";

export default async function AdminTimetablePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const schoolId = profile.school_id;

  // Fetch all class_subjects for this school (with class + subject + teacher names)
  const { data: classSubjects } = await supabase
    .from("class_subjects")
    .select("id, class_id, subject_id, teacher_id, classes(name, year_groups(name)), subjects(name), profiles(full_name)")
    .eq("school_id", schoolId)
    .order("class_id");

  // Fetch existing timetable slots
  const { data: slots } = await supabase
    .from("timetable_slots")
    .select("id, class_subject_id, day_of_week, start_time, end_time, room")
    .eq("school_id", schoolId)
    .order("day_of_week")
    .order("start_time");

  const csData = (classSubjects || []).map((cs) => {
    const cls = cs.classes as any;
    const sub = cs.subjects as any;
    const teacher = cs.profiles as any;
    return {
      id: cs.id,
      class_id: cs.class_id,
      subject_id: cs.subject_id,
      teacher_id: cs.teacher_id,
      class_name: cls?.name || "",
      year_group_name: cls?.year_groups?.name || "",
      subject_name: sub?.name || "",
      teacher_name: teacher?.full_name || "",
    };
  });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">School schedule</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Timetable Builder</h1>
      </div>
      <TimetableBuilderClient
        classSubjects={csData}
        existingSlots={slots || []}
        schoolId={schoolId}
      />
    </div>
  );
}
