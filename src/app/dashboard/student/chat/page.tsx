"use client";

import { useState } from "react";
import { Send, Search, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function StudentChat() {
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2">
        <h1 className="text-[22px] font-bold text-black">Messages</h1>
        <p className="text-[12px] text-[#9A9A9A] mt-0.5">Chat with teachers and classmates</p>
      </div>

      <div className="dash-card rounded-2xl overflow-hidden flex-1 min-h-0">
        <div className="flex h-full">
          {/* Thread List */}
          <div className="w-72 flex flex-col">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-black/10 bg-black/[0.02] h-9 text-[13px]"
                />
              </div>
            </div>
            <div className="h-px bg-black/10" />
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.03]">
                <MessageCircle className="h-6 w-6 text-[#9A9A9A]/40" />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#9A9A9A]">No conversations yet</p>
              <p className="mt-1 text-[10px] text-[#9A9A9A]/60">Start a conversation with a teacher or classmate</p>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-black/10" />

          {/* Chat Area */}
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.03]">
                <MessageCircle className="h-7 w-7 text-[#9A9A9A]/40" />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-[#9A9A9A]">Select a conversation</p>
              <p className="mt-1 text-[11px] text-[#9A9A9A]/60">Choose from your conversations on the left, or start a new one</p>
            </div>

            {/* Message Input */}
            <div className="p-3">
              <div className="h-px bg-black/10 mb-3" />
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="rounded-xl border-black/10 bg-black/[0.02] text-[13px]"
                  disabled
                />
                <Button size="icon" className="rounded-xl bg-[#2D2D2D] hover:bg-[#1a1a1a] shrink-0" disabled>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
