"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── Types ──
interface GrowthPoint {
  month: string;
  users: number;
}

interface YearGroupBar {
  name: string;
  students: number;
}

interface RoleSlice {
  name: string;
  value: number;
  color: string;
}

interface SubjectBar {
  name: string;
  classes: number;
  color: string;
}

interface OverviewChartsProps {
  growthData: GrowthPoint[];
  yearGroupData: YearGroupBar[];
  roleData: RoleSlice[];
  subjectData: SubjectBar[];
}

// ── Custom Tooltip ──
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
      {label && <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-gray-900">
          {entry.name}: <span style={{ color: entry.color || "#1e3a5f" }}>{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Donut center label ──
function DonutCenterLabel({ viewBox, total }: { viewBox?: { cx?: number; cy?: number }; total: number }) {
  const cx = viewBox?.cx || 0;
  const cy = viewBox?.cy || 0;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} y={cy - 8} className="fill-gray-900 text-2xl font-bold">
        {total}
      </tspan>
      <tspan x={cx} y={cy + 14} className="fill-gray-400 text-xs">
        Total
      </tspan>
    </text>
  );
}

// ── Growth Line Chart ──
export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
        No growth data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="users"
          name="Users"
          stroke="#2563eb"
          strokeWidth={2.5}
          fill="url(#growthGradient)"
          dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Students per Year Group Bar Chart ──
export function YearGroupChart({ data }: { data: YearGroupBar[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
        No year group data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="students"
          name="Students"
          fill="#1e3a5f"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Role Distribution Donut Chart ──
export function RoleDonutChart({ data }: { data: RoleSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
        No users yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
          <DonutCenterLabel total={total} />
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as RoleSlice;
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
            return (
              <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
                <p className="text-sm font-semibold" style={{ color: d.color }}>
                  {d.name}: {d.value}
                </p>
                <p className="text-xs text-gray-400">{pct}% of total</p>
              </div>
            );
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-xs text-gray-600 ml-1">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Subjects by Classes Bar Chart ──
export function SubjectChart({ data }: { data: SubjectBar[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
        No subject data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="classes" name="Classes" radius={[0, 6, 6, 0]} maxBarSize={24}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Composed Export ──
export default function OverviewCharts({ growthData, yearGroupData, roleData, subjectData }: OverviewChartsProps) {
  return { growthData, yearGroupData, roleData, subjectData };
}
