"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Teacher { id: string; full_name: string; }
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Props {
  userId: string;
  teachers: Teacher[];
  initialMessages: Message[];
}

export default function ParentChatClient({ userId, teachers, initialMessages }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build threads from messages
  const threadMap: Record<string, { teacherId: string; lastMessage: string; lastTime: string; unread: number }> = {};
  messages.forEach((m) => {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!threadMap[otherId]) {
      threadMap[otherId] = { teacherId: otherId, lastMessage: m.content, lastTime: m.created_at, unread: 0 };
    } else {
      threadMap[otherId].lastMessage = m.content;
      threadMap[otherId].lastTime = m.created_at;
    }
    if (m.receiver_id === userId && !m.read) threadMap[otherId].unread++;
  });

  const threads = Object.values(threadMap).sort((a, b) => b.lastTime.localeCompare(a.lastTime));

  const teacherMap: Record<string, string> = {};
  teachers.forEach((t) => { teacherMap[t.id] = t.full_name; });

  const filteredTeachers = teachers.filter((t) =>
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine thread teachers and all teachers for sidebar
  const threadTeacherIds = new Set(threads.map((t) => t.teacherId));

  const conversationMessages = selectedTeacherId
    ? messages.filter((m) =>
        (m.sender_id === userId && m.receiver_id === selectedTeacherId) ||
        (m.sender_id === selectedTeacherId && m.receiver_id === userId)
      )
    : [];

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationMessages.length]);

  // Mark messages as read when selecting a thread
  useEffect(() => {
    if (!selectedTeacherId) return;
    const unreadIds = messages
      .filter((m) => m.sender_id === selectedTeacherId && m.receiver_id === userId && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      supabase
        .from("messages")
        .update({ read: true })
        .in("id", unreadIds)
        .then(() => {
          setMessages((prev) =>
            prev.map((m) => unreadIds.includes(m.id) ? { ...m, read: true } : m)
          );
        });
    }
  }, [selectedTeacherId, supabase, userId, messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedTeacherId) return;
    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: selectedTeacherId,
        content: newMessage.trim(),
      })
      .select("id, sender_id, receiver_id, content, read, created_at")
      .single();

    if (error) {
      toast.error("Failed to send message");
    } else {
      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    }
    setSending(false);
  };

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const selectedTeacherName = selectedTeacherId ? (teacherMap[selectedTeacherId] || "Teacher") : "";
  const selectedInitials = selectedTeacherName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex min-h-0">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r border-[#2D2D2D]/5 dark:border-white/5">
        <div className="px-3 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teachers..."
            className="w-full bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Existing threads first */}
          {threads.map((thread) => {
            const name = teacherMap[thread.teacherId] || "Teacher";
            if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
            const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <button
                key={thread.teacherId}
                onClick={() => setSelectedTeacherId(thread.teacherId)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[#2D2D2D]/[0.04] dark:border-white/[0.04] ${
                  selectedTeacherId === thread.teacherId ? "bg-[#2D2D2D]/[0.04] dark:bg-white/[0.04]" : "hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02]"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#9A9A9A]">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white truncate">{name}</p>
                    {thread.unread > 0 && (
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[10px] font-bold shrink-0">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9A9A9A] truncate mt-0.5">{thread.lastMessage}</p>
                </div>
              </button>
            );
          })}

          {/* Teachers without threads */}
          {filteredTeachers
            .filter((t) => !threadTeacherIds.has(t.id))
            .map((t) => {
              const initials = t.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeacherId(t.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[#2D2D2D]/[0.04] dark:border-white/[0.04] ${
                    selectedTeacherId === t.id ? "bg-[#2D2D2D]/[0.04] dark:bg-white/[0.04]" : "hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-[#9A9A9A]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#2D2D2D] dark:text-white truncate">{t.full_name}</p>
                    <p className="text-[10px] text-[#9A9A9A]">Start a conversation</p>
                  </div>
                </button>
              );
            })}

          {teachers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-[13px] font-semibold text-[#9A9A9A]">No teachers found</p>
              <p className="text-[10px] text-[#9A9A9A]/60 mt-1">Teachers in your school will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedTeacherId ? (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-[#9A9A9A]">{selectedInitials}</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">{selectedTeacherName}</p>
                <p className="text-[10px] text-[#9A9A9A]">Teacher</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-3">
              {conversationMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[13px] text-[#9A9A9A]">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                conversationMessages.map((m) => {
                  const isMine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] rounded-br-sm"
                          : "bg-[#2D2D2D]/5 dark:bg-white/5 text-[#2D2D2D] dark:text-white rounded-bl-sm"
                      }`}>
                        <p className="text-[13px] leading-relaxed">{m.content}</p>
                        <p className={`mt-1 text-[10px] ${isMine ? "text-white/60 dark:text-[#2D2D2D]/60" : "text-[#9A9A9A]"}`}>
                          {fmtTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[#2D2D2D]/5 dark:border-white/5 shrink-0">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2.5 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[12px] font-bold px-4 py-2.5 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-5">
            <p className="text-[14px] font-semibold text-[#9A9A9A]">Select a conversation</p>
            <p className="text-[11px] text-[#9A9A9A]/60 mt-1">Choose a teacher on the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
