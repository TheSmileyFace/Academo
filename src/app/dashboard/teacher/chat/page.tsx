"use client";

import { useState } from "react";
import { Send, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const teacherThreads = [
  { user_id: "student-1", user_name: "Alex Johnson", user_role: "student", last_message: "Thank you! I had trouble with problem 15.", last_message_at: "2026-02-10T16:30:00Z", unread_count: 0 },
  { user_id: "student-2", user_name: "Emma Davis", user_role: "student", last_message: "Can I get an extension on the essay?", last_message_at: "2026-02-10T14:00:00Z", unread_count: 1 },
  { user_id: "parent-1", user_name: "James Johnson", user_role: "parent", last_message: "How is Alex doing in class?", last_message_at: "2026-02-09T10:00:00Z", unread_count: 1 },
  { user_id: "student-3", user_name: "Marcus Lee", user_role: "student", last_message: "I submitted my corrections.", last_message_at: "2026-02-09T18:00:00Z", unread_count: 0 },
  { user_id: "teacher-2", user_name: "Mr. David Brown", user_role: "teacher", last_message: "Can we sync on the joint project?", last_message_at: "2026-02-08T12:00:00Z", unread_count: 0 },
];

const initialMessages = [
  { id: "1", sender_id: "student-1", content: "Hi Ms. Williams, I submitted my math worksheet.", created_at: "2026-02-10T15:00:00Z" },
  { id: "2", sender_id: "teacher-1", content: "Great job on the math worksheet! Keep up the good work.", created_at: "2026-02-10T16:00:00Z" },
  { id: "3", sender_id: "student-1", content: "Thank you! I had trouble with problem 15, could you explain it?", created_at: "2026-02-10T16:30:00Z" },
];

export default function TeacherChat() {
  const [selectedThread, setSelectedThread] = useState(teacherThreads[0]);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreads = teacherThreads.filter((t) =>
    t.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = () => {
    if (!newMessage.trim()) return;
    setMessages([...messages, {
      id: `msg-${Date.now()}`,
      sender_id: "teacher-1",
      content: newMessage,
      created_at: new Date().toISOString(),
    }]);
    setNewMessage("");
  };

  const roleColor: Record<string, string> = {
    teacher: "bg-blue-50 text-[#1e3a5f]",
    student: "bg-blue-100 text-[#1e3a5f]",
    parent: "bg-blue-50 text-[#1e3a5f]",
    admin: "bg-blue-50 text-[#1e3a5f]",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-1 text-gray-500">Chat with students, parents, and staff</p>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="flex h-[calc(100vh-220px)]">
          {/* Thread List */}
          <div className="w-80 border-r border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200 bg-gray-50 h-10"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.user_id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    selectedThread.user_id === thread.user_id ? "bg-blue-50" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className={`text-sm font-semibold ${roleColor[thread.user_role]}`}>
                      {thread.user_name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold text-gray-900">{thread.user_name}</p>
                      {thread.unread_count > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                          {thread.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{thread.user_role}</Badge>
                      <p className="truncate text-xs text-gray-500">{thread.last_message}</p>
                    </div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback className={`text-sm font-semibold ${roleColor[selectedThread.user_role]}`}>
                  {selectedThread.user_name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedThread.user_name}</p>
                <Badge variant="secondary" className="text-xs capitalize">{selectedThread.user_role}</Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === "teacher-1";
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-[#1e3a5f] text-white rounded-br-md"
                          : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`mt-1 text-xs ${isMine ? "text-blue-200" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="rounded-xl border-gray-200 bg-gray-50"
                />
                <Button onClick={handleSend} size="icon" className="rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
