import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Calendar, Clock, BookOpen, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CalendarClient } from "./calendar-client";

export default async function AdminCalendar() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const schoolId = profile?.school_id;

  // Fetch all events for this school
  let events: { id: string; title: string; description: string | null; event_type: string; start_date: string; end_date: string | null; created_at: string }[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("events")
      .select("id, title, description, event_type, start_date, end_date, created_at")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: true });
    events = data || [];
  }

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.start_date) >= now);
  const past = events.filter((e) => new Date(e.start_date) < now);

  // Counts by type
  const examCount = events.filter((e) => e.event_type === "exam").length;
  const meetingCount = events.filter((e) => e.event_type === "meeting").length;
  const eventCount = events.filter((e) => e.event_type === "event").length;
  const holidayCount = events.filter((e) => e.event_type === "holiday").length;

  const typeStyle: Record<string, { bg: string; text: string }> = {
    exam: { bg: "bg-amber-50", text: "text-amber-700" },
    meeting: { bg: "bg-blue-50", text: "text-[#1e3a5f]" },
    event: { bg: "bg-green-50", text: "text-green-700" },
    holiday: { bg: "bg-purple-50", text: "text-purple-700" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">School Calendar</h1>
          <p className="mt-1 text-gray-500">Manage events, holidays, and exam periods</p>
        </div>
        <CalendarClient schoolId={schoolId || ""} />
      </div>

      {/* Event Type Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { type: "exam", label: "Exam Periods", count: examCount, icon: BookOpen },
          { type: "meeting", label: "Meetings", count: meetingCount, icon: Clock },
          { type: "event", label: "Events", count: eventCount, icon: PartyPopper },
          { type: "holiday", label: "Holidays", count: holidayCount, icon: Calendar },
        ].map((item) => (
          <Card key={item.type} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <item.icon className="h-5 w-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Events */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-7 w-7 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No upcoming events</p>
              <p className="text-xs text-gray-300 mt-1">Add events, exam periods, and holidays to your school calendar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => {
                const style = typeStyle[e.event_type] || typeStyle.event;
                return (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${style.bg}`}>
                        <Calendar className={`h-4 w-4 ${style.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{e.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(e.start_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          {e.end_date && e.end_date !== e.start_date && (
                            <> — {new Date(e.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${style.bg} ${style.text}`}>
                      {e.event_type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Events */}
      {past.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-400">Past Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {past.slice(-10).reverse().map((e) => {
                const style = typeStyle[e.event_type] || typeStyle.event;
                return (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border border-gray-50 px-4 py-3 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 shrink-0">
                        <Calendar className="h-4 w-4 text-gray-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 truncate">{e.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(e.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 capitalize bg-gray-50 text-gray-400`}>
                      {e.event_type}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
