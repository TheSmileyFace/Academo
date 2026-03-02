import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotesClient from "./notes-client";

export default async function StudentNotesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, content, note_type, audio_url, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Your notes</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Notes</h1>
      </div>
      <NotesClient
        userId={user.id}
        schoolId={profile?.school_id || ""}
        initialNotes={notes || []}
      />
    </div>
  );
}
