"use client";

import { useState, useRef, useEffect } from "react";
import { Send, BookOpen, Calculator, FlaskConical, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  { icon: Calculator, label: "Mathematics", prompt: "Can you help me solve quadratic equations step by step?" },
  { icon: BookOpen, label: "Literature", prompt: "How do I structure a persuasive essay?" },
  { icon: FlaskConical, label: "Sciences", prompt: "Explain photosynthesis in technical terms" },
  { icon: Lightbulb, label: "Study Methodology", prompt: "What are the most effective study techniques for exams?" },
];

export default function AITutor() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "I am your study partner. I am here to assist you with understanding concepts, solving complex problems, and preparing for your academic assessments. How may I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, loading]);

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
          system: "You are a professional, serious, and highly effective AI study partner for a student. You are not named Alex or any other human name. Your goal is to provide clear, accurate, and concise educational assistance. Be direct, academic, and avoid overly joyful or playful language. Focus on helping the student understand concepts, solve problems, and prepare for exams. Provide step-by-step logical breakdowns for complex problems.",
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
          content: "System error: Unable to connect to the learning module. Please ensure the API configuration is correct and try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2 border-b border-[#2D2D2D]/5 pb-4">
        <h1 className="text-[22px] font-bold text-[#2D2D2D] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#333333] flex items-center justify-center shrink-0">
             <span className="text-white text-xs font-bold tracking-widest">AI</span>
          </div>
          Study Partner
        </h1>
        <p className="text-[12px] text-[#9A9A9A] mt-0.5">Advanced Academic Assistance</p>
      </div>

      <div className="dash-card rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
          <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {messages.length === 1 && (
              <div className="flex flex-col py-10 fade-in">
                <h2 className="text-xl font-semibold text-[#2D2D2D] mb-2 tracking-tight">How can I assist you?</h2>
                <p className="text-[13px] text-[#9A9A9A] mb-8">Select a quick prompt below or type your specific academic query.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {quickPrompts.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => sendMessage(p.prompt)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-[#2D2D2D]/10 bg-white text-left transition-all hover:bg-[#2D2D2D]/[0.02]"
                    >
                      <p.icon className="h-4 w-4 text-[#9A9A9A] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[13px] font-semibold text-[#2D2D2D] mb-1">{p.label}</span>
                        <span className="block text-[12px] text-[#9A9A9A] leading-relaxed">{p.prompt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-[11px] font-bold text-[#9A9A9A] mb-1.5 uppercase tracking-wider pl-1">
                    {msg.role === "user" ? "You" : "Study Partner"}
                  </span>
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-[#333333] text-white rounded-br-sm"
                      : "bg-[#F7F7F7] text-[#2D2D2D] rounded-bl-sm border border-[#2D2D2D]/5"
                  }`}>
                    <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex w-full justify-start">
                <div className="flex flex-col items-start max-w-[85%]">
                   <span className="text-[11px] font-bold text-[#9A9A9A] mb-1.5 uppercase tracking-wider pl-1">
                    Study Partner
                  </span>
                  <div className="px-4 py-4 rounded-2xl rounded-bl-sm bg-[#F7F7F7] border border-[#2D2D2D]/5">
                    <div className="flex gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9A9A9A] animate-pulse" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9A9A9A] animate-pulse [animation-delay:0.15s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9A9A9A] animate-pulse [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 md:px-6 md:pb-6 pt-2 bg-white">
          <div className="max-w-3xl mx-auto flex items-end gap-2 bg-[#F7F7F7] rounded-xl p-2 border border-[#2D2D2D]/5 focus-within:border-[#2D2D2D]/20 focus-within:bg-white transition-colors">
            <Input
              placeholder="Message your study partner..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage(input)}
              disabled={loading}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] min-h-[40px] py-2 px-3 placeholder:text-[#9A9A9A]"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              size="icon"
              className="rounded-lg bg-[#333333] hover:bg-[#2D2D2D] shrink-0 h-10 w-10 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
          <p className="text-center text-[11px] text-[#9A9A9A] mt-3 font-medium">
            Responses are generated by AI and may require independent verification.
          </p>
        </div>
      </div>
    </div>
  );
}


