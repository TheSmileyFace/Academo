"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Contact { id: string; full_name: string; role: string; }
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
  contacts: Contact[];
  initialMessages: Message[];
}

export default function TeacherChatClient({ userId, contacts, initialMessages }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const contactMap: Record<string, Contact> = {};
  contacts.forEach((c) => { contactMap[c.id] = c; });

  // Build threads
  const threadMap: Record<string, { contactId: string; lastMessage: string; lastTime: string; unread: number }> = {};
  messages.forEach((m) => {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!threadMap[otherId]) {
      threadMap[otherId] = { contactId: otherId, lastMessage: m.content, lastTime: m.created_at, unread: 0 };
    } else {
      threadMap[otherId].lastMessage = m.content;
      threadMap[otherId].lastTime = m.created_at;
    }
    if (m.receiver_id === userId && !m.read) threadMap[otherId].unread++;
  });

  const threads = Object.values(threadMap).sort((a, b) => b.lastTime.localeCompare(a.lastTime));
  const threadContactIds = new Set(threads.map((t) => t.contactId));

  const filteredContacts = contacts.filter((c) => {
    if (searchQuery && !c.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (roleFilter !== "all" && c.role !== roleFilter) return false;
    return true;
  });

  const conversationMessages = selectedContactId
    ? messages.filter((m) =>
        (m.sender_id === userId && m.receiver_id === selectedContactId) ||
        (m.sender_id === selectedContactId && m.receiver_id === userId)
      )
    : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationMessages.length]);

  useEffect(() => {
    if (!selectedContactId) return;
    const unreadIds = messages
      .filter((m) => m.sender_id === selectedContactId && m.receiver_id === userId && !m.read)
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
  }, [selectedContactId, supabase, userId, messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContactId) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: userId, receiver_id: selectedContactId, content: newMessage.trim() })
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

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const selectedContact = selectedContactId ? contactMap[selectedContactId] : null;
  const selectedName = selectedContact?.full_name || "User";
  const selectedInitials = selectedName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const selectedRole = selectedContact?.role || "";

  return (
    <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden flex-1 flex min-h-0">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r border-[#2D2D2D]/5 dark:border-white/5">
        <div className="px-3 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 space-y-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
          />
          <div className="flex gap-1">
            {["all", "student", "parent", "teacher", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg capitalize transition-colors ${
                  roleFilter === r
                    ? "bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D]"
                    : "bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A] hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Existing threads */}
          {threads.map((thread) => {
            const contact = contactMap[thread.contactId];
            if (!contact) return null;
            if (searchQuery && !contact.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
            if (roleFilter !== "all" && contact.role !== roleFilter) return null;
            const initials = contact.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <button
                key={thread.contactId}
                onClick={() => setSelectedContactId(thread.contactId)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[#2D2D2D]/[0.04] dark:border-white/[0.04] ${
                  selectedContactId === thread.contactId ? "bg-[#2D2D2D]/[0.04] dark:bg-white/[0.04]" : "hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02]"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#9A9A9A]">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white truncate">{contact.full_name}</p>
                    {thread.unread > 0 && (
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[10px] font-bold shrink-0">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 dark:bg-white/5 px-1.5 py-0.5 rounded capitalize">{contact.role}</span>
                    <p className="text-[11px] text-[#9A9A9A] truncate">{thread.lastMessage}</p>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Contacts without threads */}
          {filteredContacts
            .filter((c) => !threadContactIds.has(c.id))
            .map((c) => {
              const initials = c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[#2D2D2D]/[0.04] dark:border-white/[0.04] ${
                    selectedContactId === c.id ? "bg-[#2D2D2D]/[0.04] dark:bg-white/[0.04]" : "hover:bg-[#2D2D2D]/[0.02] dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-[#9A9A9A]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#2D2D2D] dark:text-white truncate">{c.full_name}</p>
                    <span className="text-[9px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 dark:bg-white/5 px-1.5 py-0.5 rounded capitalize">{c.role}</span>
                  </div>
                </button>
              );
            })}

          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-[13px] font-semibold text-[#9A9A9A]">No contacts found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedContactId ? (
          <>
            <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2D2D2D]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-[#9A9A9A]">{selectedInitials}</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">{selectedName}</p>
                <span className="text-[9px] font-bold text-[#9A9A9A] bg-[#2D2D2D]/5 dark:bg-white/5 px-1.5 py-0.5 rounded capitalize">{selectedRole}</span>
              </div>
            </div>

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
            <p className="text-[11px] text-[#9A9A9A]/60 mt-1">Choose a contact on the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
