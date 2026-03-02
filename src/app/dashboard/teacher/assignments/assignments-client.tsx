"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface StudentStatus {
  id: string;
  name: string;
  completedAt: string | null;
}

interface AssignmentRow {
  id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  status: string;
  totalStudents: number;
  completedStudents: number;
  students: StudentStatus[];
}

export function TeacherAssignmentsClient({ assignments }: { assignments: AssignmentRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const now = new Date();

  const filtered = assignments.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase()) ||
    (a.className || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" />
        <Input
          placeholder="Search assignments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl border-[#2D2D2D]/10 bg-white h-9 text-[13px]"
        />
      </div>

      <Card className="border-0 shadow-none dash-card rounded-2xl overflow-hidden">
        <div className="divide-y divide-black/5">
          {filtered.map((a) => {
            const isActive = a.status === "active";
            const isPastDue = isActive && new Date(a.dueDate) < now;
            const isExpanded = expandedId === a.id;
            const pct = a.totalStudents > 0 ? Math.round((a.completedStudents / a.totalStudents) * 100) : 0;

            return (
              <div key={a.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#2D2D2D]/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-[#2D2D2D] truncate">{a.title}</p>
                      <div className="flex items-center gap-2 text-[12px] font-medium text-[#9A9A9A] mt-1">
                        <span>{a.subject}</span>
                        {a.className && (
                          <>
                            <span>•</span>
                            <span>{a.className}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Due {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Completion progress */}
                    {a.totalStudents > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 rounded-full bg-[#2D2D2D]/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2D2D2D] transition-all duration-500 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-bold text-[#2D2D2D] min-w-[2.5rem] text-right">
                          {a.completedStudents}/{a.totalStudents}
                        </span>
                      </div>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${
                      isPastDue ? "bg-red-50 text-red-600" : isActive ? "bg-[#2D2D2D]/5 text-[#2D2D2D]" : "bg-[#2D2D2D]/5 text-[#9A9A9A]"
                    }`}>
                      {isPastDue ? "Past due" : a.status}
                    </span>
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-[#9A9A9A]" />
                      : <ChevronRight className="h-4 w-4 text-[#9A9A9A]" />
                    }
                  </div>
                </button>

                {/* Expanded student list */}
                {isExpanded && (
                  <div className="bg-[#2D2D2D]/[0.02] border-t border-[#2D2D2D]/5 px-5 py-4">
                    {a.students.length === 0 ? (
                      <p className="text-[13px] text-[#9A9A9A] py-2">No students assigned</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wider">Student Progress</p>
                          <p className="text-[11px] font-bold text-[#2D2D2D]">{pct}% complete</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {a.students.map((s, idx) => (
                            <Link key={idx} href={`/dashboard/teacher/students/${s.id}`} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-[#2D2D2D]/5 hover:border-[#2D2D2D]/10 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-2 w-2 rounded-full shrink-0 ${s.completedAt ? "bg-[#2D2D2D]" : "bg-[#2D2D2D]/10"}`} />
                                <span className="text-[13px] font-medium text-[#2D2D2D] truncate hover:underline">{s.name}</span>
                              </div>
                              <span className={`text-[10px] font-bold shrink-0 ${s.completedAt ? "text-[#9A9A9A]" : "text-[#9A9A9A]/50"}`}>
                                {s.completedAt
                                  ? `Done • ${new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                                  : "Pending"
                                }
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[14px] font-medium text-[#2D2D2D]">No assignments found</p>
              <p className="text-[12px] text-[#9A9A9A] mt-1">Try adjusting your search query</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
