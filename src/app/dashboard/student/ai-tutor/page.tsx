"use client";

import { useState } from "react";
import { Send, Sparkles, BookOpen, Calculator, FlaskConical, Lightbulb } from "lucide-react";
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
      content: "Hi! I'm your AI tutor. I can help you understand concepts, solve problems, and prepare for exams. What would you like to learn today?",
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
          system: "You are a friendly, encouraging AI tutor for a school student. Help them understand concepts clearly with examples. Keep responses concise but thorough. Use simple language. If they ask about math, show step-by-step solutions.",
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
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2">
        <h1 className="text-[22px] font-bold text-black flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full shrink-0"
            style={{ background: "radial-gradient(circle at 30% 30%, #92D1FF 0%, #0094FF 50%, #E45C12 100%)" }}
          />
          AI Tutor
        </h1>
        <p className="text-[12px] text-[#9A9A9A] mt-0.5">Get instant help with any subject</p>
      </div>

      <div className="dash-card rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start gap-2.5 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <div
                      className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                      style={{ background: "radial-gradient(circle at 30% 30%, #92D1FF 0%, #0094FF 50%, #E45C12 100%)" }}
                    />
                  )}
                  <div className={`rounded-2xl px-3.5 py-2.5 ${
                    msg.role === "user"
                      ? "bg-[#2D2D2D] text-white rounded-br-md"
                      : "bg-black/[0.03] text-black rounded-bl-md"
                  }`}>
                    <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-6 h-6 rounded-full shrink-0 mt-0.5 animate-pulse"
                    style={{ background: "radial-gradient(circle at 30% 30%, #92D1FF 0%, #0094FF 50%, #E45C12 100%)" }}
                  />
                  <div className="rounded-2xl rounded-bl-md bg-black/[0.03] px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9A9A9A] animate-bounce" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9A9A9A] animate-bounce [animation-delay:0.1s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9A9A9A] animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 py-3">
            <div className="h-px bg-black/10 mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">Quick Start</p>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.prompt)}
                  className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-2.5 text-left transition-colors hover:bg-[#2D2D2D]/5"
                >
                  <p.icon className="h-3.5 w-3.5 text-[#9A9A9A] shrink-0" />
                  <span className="text-[13px] text-black font-semibold">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3">
          <div className="h-px bg-black/10 mb-3" />
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage(input)}
              disabled={loading}
              className="rounded-xl border-black/10 bg-black/[0.02] text-[13px]"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              size="icon"
              className="rounded-xl bg-[#2D2D2D] hover:bg-[#1a1a1a] shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
