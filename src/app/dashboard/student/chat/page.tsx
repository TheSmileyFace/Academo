"use client";

import { useState } from "react";
import { Send, Search, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StudentChat() {
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-1 text-gray-500">Chat with teachers and classmates</p>
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
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                <MessageCircle className="h-7 w-7 text-gray-300" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-400">No conversations yet</p>
              <p className="mt-1 text-xs text-gray-300">Start a conversation with a teacher or classmate</p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                <MessageCircle className="h-8 w-8 text-gray-300" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-400">Select a conversation</p>
              <p className="mt-1 text-xs text-gray-300">Choose from your conversations on the left, or start a new one</p>
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="rounded-xl border-gray-200 bg-gray-50"
                  disabled
                />
                <Button size="icon" className="rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0" disabled>
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
