import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeacherChatClient from "./teacher-chat-client";

export default async function TeacherChat() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Fetch all users in the school (students, parents, other teachers)
  let contacts: { id: string; full_name: string; role: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("school_id", schoolId)
      .neq("id", user.id)
      .order("full_name");
    contacts = data || [];
  }

  // Fetch existing messages
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, read, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: true });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Chat with students, parents, and staff</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Messages</h1>
      </div>
      <TeacherChatClient
        userId={user.id}
        contacts={contacts}
        initialMessages={messages || []}
      />
    </div>
  );
}
