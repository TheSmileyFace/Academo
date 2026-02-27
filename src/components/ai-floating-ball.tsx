"use client";

import { MorphPanel } from "@/components/ui/ai-input";

export function AiFloatingBall() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <MorphPanel />
    </div>
  );
}
