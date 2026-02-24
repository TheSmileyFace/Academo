"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  parentId: string;
  currentChildId: string | null;
  students: { id: string; full_name: string }[];
}

export function UserActionsClient({ parentId, currentChildId, students }: Props) {
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const supabase = createClient();

  const linkChild = async (studentId: string | null) => {
    setLinking(true);
    const { error } = await supabase
      .from("profiles")
      .update({ parent_of: studentId })
      .eq("id", parentId);

    if (error) {
      toast.error("Failed to link parent to student");
    } else {
      toast.success(studentId ? "Parent linked to student" : "Link removed");
      setOpen(false);
      window.location.reload();
    }
    setLinking(false);
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-[#1e3a5f] gap-1"
      >
        <Link2 className="h-3.5 w-3.5" />
        {currentChildId ? "Change" : "Link child"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={currentChildId || ""}
        onChange={(e) => linkChild(e.target.value || null)}
        disabled={linking}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 max-w-[160px]"
      >
        <option value="">-- None --</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>{s.full_name}</option>
        ))}
      </select>
      {linking && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
