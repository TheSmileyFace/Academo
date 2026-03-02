"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function CalendarClient({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("event");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate() {
    if (!title.trim() || !startDate || !schoolId) return;
    setSaving(true);
    await supabase.from("events").insert({
      title: title.trim(),
      event_type: eventType,
      start_date: startDate,
      end_date: endDate || startDate,
      school_id: schoolId,
    });
    setTitle("");
    setStartDate("");
    setEndDate("");
    setEventType("event");
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl"
      >
        <Plus className="mr-2 h-4 w-4" /> Add Event
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2D2D]/30">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-gray-900">New Event</h2>
        <Input
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl"
        />
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="exam">Exam Period</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="holiday">Holiday</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Start date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">End date (optional)</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !startDate}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl"
          >
            {saving ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}
