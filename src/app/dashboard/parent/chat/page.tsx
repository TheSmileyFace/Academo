import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ParentChatClient from "./parent-chat-client";

export default async function ParentChat() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, parent_of")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;
  const childId = profile?.parent_of;

  // Fetch teachers in the school
  let teachers: { id: string; full_name: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .order("full_name");
    teachers = data || [];
  }

  // Fetch existing messages for this parent
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, read, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: true });

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0" style={{ paddingTop: 23 }}>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0]">Communicate with teachers</p>
        <h1 className="text-[22px] font-semibold text-[#2d2d2d] dark:text-white mt-0.5">Messages</h1>
      </div>
      <ParentChatClient
        userId={user.id}
        teachers={teachers}
        initialMessages={messages || []}
      />
    </div>
  );
}
