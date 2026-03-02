"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  class_name: string;
  year_group_name: string;
  subject_name: string;
  teacher_name: string;
}

interface TimetableSlot {
  id: string;
  class_subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

interface Props {
  classSubjects: ClassSubject[];
  existingSlots: TimetableSlot[];
  schoolId: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

export default function TimetableBuilderClient({ classSubjects, existingSlots, schoolId }: Props) {
  const supabase = createClient();

  const [slots, setSlots] = useState<TimetableSlot[]>(existingSlots);
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState<string>(classSubjects[0]?.id || "");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group class subjects by class for display
  const groupedCS: Record<string, ClassSubject[]> = {};
  classSubjects.forEach((cs) => {
    const key = cs.year_group_name ? `${cs.year_group_name} — ${cs.class_name}` : cs.class_name || "No Class";
    if (!groupedCS[key]) groupedCS[key] = [];
    groupedCS[key].push(cs);
  });

  const csMap: Record<string, ClassSubject> = {};
  classSubjects.forEach((cs) => { csMap[cs.id] = cs; });

  const handleAdd = async () => {
    if (!selectedClassSubjectId) { toast.error("Select a class subject"); return; }
    if (!startTime || !endTime) { toast.error("Set start and end times"); return; }
    if (startTime >= endTime) { toast.error("End time must be after start time"); return; }

    setSaving(true);
    const { data: newSlot, error } = await supabase
      .from("timetable_slots")
      .insert({
        class_subject_id: selectedClassSubjectId,
        school_id: schoolId,
        day_of_week: selectedDay,
        start_time: startTime,
        end_time: endTime,
        room: room.trim() || null,
      })
      .select("id, class_subject_id, day_of_week, start_time, end_time, room")
      .single();

    if (error) {
      toast.error("Failed to add slot");
    } else {
      setSlots((prev) => [...prev, newSlot].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      }));
      setRoom("");
      toast.success("Slot added");
    }
    setSaving(false);
  };

  const handleDelete = async (slotId: string) => {
    setDeletingId(slotId);
    const { error } = await supabase.from("timetable_slots").delete().eq("id", slotId);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast.success("Slot removed");
    }
    setDeletingId(null);
  };

  // Group slots by day for display
  const slotsByDay: Record<number, TimetableSlot[]> = {};
  WEEK_DAYS.forEach((d) => { slotsByDay[d] = []; });
  slots.forEach((s) => {
    if (slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week].push(s);
  });

  return (
    <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
      {/* Add slot form */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
        <div className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl px-5 py-4 flex flex-col gap-4">
          <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">Add Slot</p>

          {/* Class subject picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Class · Subject</label>
            {classSubjects.length === 0 ? (
              <p className="text-[12px] text-[#9A9A9A]">No class-subjects set up yet. Go to Setup first.</p>
            ) : (
              <select
                value={selectedClassSubjectId}
                onChange={(e) => setSelectedClassSubjectId(e.target.value)}
                className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white outline-none w-full"
              >
                {Object.entries(groupedCS).map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map((cs) => (
                      <option key={cs.id} value={cs.id}>{cs.subject_name} — {cs.teacher_name || "No teacher"}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          {/* Day picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Day</label>
            <div className="flex gap-1.5 flex-wrap">
              {WEEK_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    selectedDay === d
                      ? "bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D]"
                      : "bg-[#2D2D2D]/5 dark:bg-white/5 text-[#9A9A9A] hover:bg-[#2D2D2D]/10 dark:hover:bg-white/10"
                  }`}
                >
                  {DAY_NAMES[d].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-2 py-2 text-[13px] text-[#2D2D2D] dark:text-white outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-2 py-2 text-[13px] text-[#2D2D2D] dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Room */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wide">Room (optional)</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Room 12"
              className="bg-[#2D2D2D]/5 dark:bg-white/5 border-0 rounded-xl px-3 py-2 text-[13px] text-[#2D2D2D] dark:text-white placeholder:text-[#9A9A9A] outline-none"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={saving || classSubjects.length === 0}
            className="bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2D2D2D] text-[13px] font-bold py-2.5 rounded-xl hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? "Adding…" : "Add Slot"}
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pb-4">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="dash-card dark:border-[#2D2D2D] bg-white dark:bg-[#333333] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#2D2D2D]/5 dark:border-white/5 flex items-center justify-between">
              <p className="text-[14px] font-semibold text-[#2D2D2D] dark:text-white">{DAY_NAMES[day]}</p>
              <span className="text-[11px] font-bold text-[#9A9A9A]">{slotsByDay[day].length} slots</span>
            </div>
            {slotsByDay[day].length === 0 ? (
              <div className="px-5 py-4 text-[12px] text-[#9A9A9A]">No slots yet</div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {slotsByDay[day].map((slot) => {
                  const cs = csMap[slot.class_subject_id];
                  return (
                    <div key={slot.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="shrink-0 text-center">
                          <p className="text-[12px] font-bold text-[#2D2D2D] dark:text-white tabular-nums">
                            {slot.start_time.slice(0, 5)}
                          </p>
                          <p className="text-[10px] text-[#9A9A9A]">{slot.end_time.slice(0, 5)}</p>
                        </div>
                        <div className="w-px h-8 bg-[#2D2D2D]/10 dark:bg-white/10 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#2D2D2D] dark:text-white truncate">
                            {cs?.subject_name || "Unknown subject"}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#9A9A9A] mt-0.5">
                            <span>{cs ? `${cs.year_group_name} ${cs.class_name}`.trim() : ""}</span>
                            {cs?.teacher_name && (
                              <>
                                <span>·</span>
                                <span>{cs.teacher_name}</span>
                              </>
                            )}
                            {slot.room && (
                              <>
                                <span>·</span>
                                <span>{slot.room}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        disabled={deletingId === slot.id}
                        className="shrink-0 text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline disabled:opacity-40 transition-opacity"
                      >
                        {deletingId === slot.id ? "…" : "Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
