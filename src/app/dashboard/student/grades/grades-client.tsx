"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Trophy, TrendingUp, TrendingDown, Minus, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface GradedSubmission {
  id: string;
  grade: number;
  feedback: string | null;
  submitted_at: string;
  assignment_id: string;
}

interface AssignmentInfo {
  title: string;
  subject: string;
}

interface Props {
  gradedSubmissions: GradedSubmission[];
  assignmentMap: Record<string, AssignmentInfo>;
}

function getLetterGrade(grade: number): string {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}

function gradeColor(grade: number): string {
  if (grade >= 70) return "text-green-600";
  if (grade >= 50) return "text-amber-600";
  return "text-red-600";
}

function gradeBgColor(grade: number): string {
  if (grade >= 70) return "bg-green-500";
  if (grade >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function GradesClient({ gradedSubmissions, assignmentMap }: Props) {
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const allSubjects = useMemo(() => {
    const subjects = new Set<string>();
    gradedSubmissions.forEach((s) => {
      const a = assignmentMap[s.assignment_id];
      if (a?.subject) subjects.add(a.subject);
    });
    return [...subjects].sort();
  }, [gradedSubmissions, assignmentMap]);

  const filtered = useMemo(() => {
    if (subjectFilter === "all") return gradedSubmissions;
    return gradedSubmissions.filter((s) => {
      const a = assignmentMap[s.assignment_id];
      return a?.subject === subjectFilter;
    });
  }, [gradedSubmissions, assignmentMap, subjectFilter]);

  // Overall average
  const overallAvg = filtered.length > 0
    ? Math.round(filtered.reduce((a, s) => a + s.grade, 0) / filtered.length)
    : null;

  // Subject breakdown
  const subjectData = useMemo(() => {
    const map: Record<string, { grades: { grade: number; date: string }[] }> = {};
    filtered.forEach((s) => {
      const a = assignmentMap[s.assignment_id];
      if (!a?.subject) return;
      if (!map[a.subject]) map[a.subject] = { grades: [] };
      map[a.subject].grades.push({ grade: s.grade, date: s.submitted_at });
    });
    return Object.entries(map).map(([subject, data]) => {
      const grades = data.grades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const avg = Math.round(grades.reduce((a, g) => a + g.grade, 0) / grades.length);
      const highest = Math.max(...grades.map((g) => g.grade));
      const lowest = Math.min(...grades.map((g) => g.grade));
      // Trend: compare last grade to average
      const lastGrade = grades[grades.length - 1]?.grade ?? avg;
      const trend = lastGrade > avg ? "up" : lastGrade < avg ? "down" : "flat";
      return { subject, avg, highest, lowest, count: grades.length, grades, trend };
    }).sort((a, b) => b.avg - a.avg);
  }, [filtered, assignmentMap]);

  // Grade distribution
  const distribution = useMemo(() => {
    const buckets = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    filtered.forEach((s) => {
      const letter = getLetterGrade(s.grade) as keyof typeof buckets;
      buckets[letter]++;
    });
    return Object.entries(buckets).map(([letter, count]) => ({ letter, count }));
  }, [filtered]);

  // Trend for overall
  const overallTrend = useMemo(() => {
    if (filtered.length < 2) return "flat";
    const sorted = [...filtered].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);
    const firstAvg = firstHalf.reduce((a, s) => a + s.grade, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, s) => a + s.grade, 0) / secondHalf.length;
    if (secondAvg > firstAvg + 2) return "up";
    if (secondAvg < firstAvg - 2) return "down";
    return "flat";
  }, [filtered]);

  if (gradedSubmissions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-3">
          <BarChart3 className="h-7 w-7 text-[#9A9A9A]/40" />
        </div>
        <p className="text-[14px] font-semibold text-[#9A9A9A]">No grades yet</p>
        <p className="text-[11px] text-[#9A9A9A]/60 mt-1">Your grades and progress will appear here once assignments are graded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      {allSubjects.length > 1 && (
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#9A9A9A]" />
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-44 h-8 rounded-lg border-[#2D2D2D]/10 text-[12px]">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {allSubjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subjectFilter !== "all" && (
            <button onClick={() => setSubjectFilter("all")} className="text-[10px] font-bold text-[#9A9A9A] hover:text-[#2D2D2D] flex items-center gap-0.5">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Overall Average Card */}
      <div className="dash-card rounded-2xl">
        <div className="px-4 py-4 flex items-center gap-4">
          <div className={`text-[42px] font-black ${overallAvg !== null ? gradeColor(overallAvg) : "text-[#9A9A9A]"}`}>
            {overallAvg !== null ? `${overallAvg}%` : "—"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#2D2D2D]">Overall Average</span>
              {overallTrend === "up" && <TrendingUp className="h-4 w-4 text-green-600" />}
              {overallTrend === "down" && <TrendingDown className="h-4 w-4 text-red-600" />}
              {overallTrend === "flat" && <Minus className="h-4 w-4 text-[#9A9A9A]" />}
            </div>
            <p className="text-[10px] font-bold text-[#9A9A9A] mt-0.5">
              {filtered.length} graded assignment{filtered.length !== 1 ? "s" : ""}
              {subjectFilter !== "all" ? ` in ${subjectFilter}` : ""}
            </p>
            {overallAvg !== null && (
              <div className="h-1.5 rounded-full bg-[#2D2D2D]/5 overflow-hidden mt-2">
                <div className={`h-full rounded-full transition-all ${gradeBgColor(overallAvg)}`} style={{ width: `${overallAvg}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Subject Breakdown */}
        <div className="dash-card rounded-2xl flex flex-col">
          <div className="flex items-center gap-0 px-4 pt-3 pb-2">
            <Image src="/Icons/black/grades black.svg" alt="" width={24} height={24} className="shrink-0" />
            <div className="w-px h-4 bg-gray-300 mx-2.5" />
            <span className="text-[16px] font-semibold text-[#2D2D2D]">Subjects</span>
          </div>
          <div className="h-px bg-[#2D2D2D]/10" />
          <div className="flex-1 px-4 py-3 space-y-4">
            {subjectData.map((s) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-[#2D2D2D]">{s.subject}</span>
                  <div className="flex items-center gap-1.5">
                    {s.trend === "up" && <TrendingUp className="h-3 w-3 text-green-600" />}
                    {s.trend === "down" && <TrendingDown className="h-3 w-3 text-red-600" />}
                    <span className={`text-[14px] font-bold ${gradeColor(s.avg)}`}>{s.avg}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[#2D2D2D]/5 overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full transition-all ${gradeBgColor(s.avg)}`} style={{ width: `${s.avg}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[#9A9A9A]">{s.count} graded</p>
                  <p className="text-[10px] font-bold text-[#9A9A9A]">
                    H: {s.highest}% · L: {s.lowest}%
                  </p>
                </div>
                {/* Sparkline */}
                {s.grades.length >= 2 && (
                  <div className="h-10 mt-1.5 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={s.grades}>
                        <Line
                          type="monotone"
                          dataKey="grade"
                          stroke="#2D2D2D"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Grade Distribution */}
          <div className="dash-card rounded-2xl">
            <div className="flex items-center gap-0 px-4 pt-3 pb-2">
              <BarChart3 className="h-5 w-5 text-[#2D2D2D] shrink-0" />
              <div className="w-px h-4 bg-gray-300 mx-2.5" />
              <span className="text-[16px] font-semibold text-[#2D2D2D]">Distribution</span>
            </div>
            <div className="h-px bg-[#2D2D2D]/10" />
            <div className="px-4 py-3">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution}>
                    <XAxis dataKey="letter" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#9A9A9A" }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12 }}
                      formatter={(value) => [`${value} assignment${value !== 1 ? "s" : ""}`, ""]}
                      labelFormatter={(label) => `Grade ${label}`}
                    />
                    <Bar dataKey="count" fill="#2D2D2D" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Grades Feed */}
          <div className="dash-card rounded-2xl flex flex-col">
            <div className="flex items-center gap-0 px-4 pt-3 pb-2">
              <Trophy className="h-5 w-5 text-[#2D2D2D] shrink-0" />
              <div className="w-px h-4 bg-gray-300 mx-2.5" />
              <span className="text-[16px] font-semibold text-[#2D2D2D]">Recent</span>
            </div>
            <div className="h-px bg-[#2D2D2D]/10" />
            <div className="flex-1 px-4 py-1">
              {filtered.slice(0, 8).map((s, idx) => {
                const assignment = assignmentMap[s.assignment_id];
                return (
                  <div key={s.id}>
                    <Link
                      href={`/dashboard/student/assignments/${s.assignment_id}`}
                      className="flex items-center justify-between py-2.5 hover:opacity-70 transition-opacity"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#2D2D2D] truncate">{assignment?.title || "Assignment"}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#9A9A9A] mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Image src="/Icons/grey/subject.svg" alt="" width={10} height={10} />
                            {assignment?.subject || ""}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Image src="/Icons/grey/time.svg" alt="" width={10} height={10} />
                            {new Date(s.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        {s.feedback && (
                          <p className="text-[10px] text-[#9A9A9A] mt-0.5 line-clamp-1 italic">{s.feedback}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          s.grade >= 70 ? "bg-green-100 text-green-700" : s.grade >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        }`}>
                          {getLetterGrade(s.grade)}
                        </span>
                        <span className={`text-[16px] font-bold ${gradeColor(s.grade)}`}>
                          {s.grade}%
                        </span>
                      </div>
                    </Link>
                    {idx < filtered.slice(0, 8).length - 1 && <div className="-mx-4 h-px bg-[#2D2D2D]/10" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
