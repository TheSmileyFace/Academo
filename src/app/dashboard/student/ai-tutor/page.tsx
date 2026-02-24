"use client";

import { useState } from "react";
import { Brain, Send, Sparkles, BookOpen, Calculator, FlaskConical, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  { icon: Calculator, label: "Help with Math", prompt: "Can you help me solve quadratic equations step by step?" },
  { icon: BookOpen, label: "Essay Help", prompt: "How do I structure a persuasive essay?" },
  { icon: FlaskConical, label: "Science Concepts", prompt: "Explain photosynthesis in simple terms" },
  { icon: Lightbulb, label: "Study Tips", prompt: "What are the best study techniques for exams?" },
];

export default function AITutor() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi Alex! I'm your AI tutor. I can help you understand concepts, solve problems, and prepare for exams. What would you like to learn today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          system: "You are a friendly, encouraging AI tutor for a school student named Alex. Help them understand concepts clearly with examples. Keep responses concise but thorough. Use simple language. If they ask about math, show step-by-step solutions.",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Make sure the OpenRouter API key is configured in your .env.local file. In the meantime, feel free to ask me anything — I'll do my best to help once the connection is restored!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Brain className="h-6 w-6 text-[#1e3a5f]" />
          </div>
          AI Tutor
        </h1>
        <p className="mt-1 text-gray-500">Get instant help with any subject</p>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="flex flex-col h-[calc(100vh-250px)]">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-start gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <Sparkles className="h-4 w-4 text-[#1e3a5f]" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-[#1e3a5f] text-white rounded-br-md"
                        : "bg-gray-50 text-gray-900 rounded-bl-md border border-gray-100"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <Sparkles className="h-4 w-4 text-[#1e3a5f] animate-pulse" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-gray-50 border border-gray-100 px-4 py-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" />
                        <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.1s]" />
                        <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="text-xs font-medium text-gray-400 mb-3">QUICK START</p>
              <div className="grid grid-cols-2 gap-2">
                {quickPrompts.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.prompt)}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <p.icon className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700 font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 p-4">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage(input)}
                disabled={loading}
                className="rounded-xl border-gray-200 bg-gray-50"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                size="icon"
                className="rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
