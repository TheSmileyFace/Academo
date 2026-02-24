"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  MessageCircle,
  BarChart3,
  Settings,
  LogOut,
  Users,
  PlusCircle,
  CheckSquare,
  Brain,
  ClipboardList,
  Bell,
  Calendar,
  Layers,
  KeyRound,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navByRole: Record<UserRole, NavItem[]> = {
  student: [
    { label: "Home", href: "/dashboard/student", icon: Home },
    { label: "Tasks", href: "/dashboard/student/assignments", icon: BookOpen },
    { label: "Grades", href: "/dashboard/student/grades", icon: BarChart3 },
    { label: "Chat", href: "/dashboard/student/chat", icon: MessageCircle },
    { label: "AI Tutor", href: "/dashboard/student/ai-tutor", icon: Brain },
  ],
  teacher: [
    { label: "Home", href: "/dashboard/teacher", icon: Home },
    { label: "Assignments", href: "/dashboard/teacher/assignments", icon: BookOpen },
    { label: "Create", href: "/dashboard/teacher/create", icon: PlusCircle },
    { label: "Submissions", href: "/dashboard/teacher/submissions", icon: CheckSquare },
    { label: "AI Digitizer", href: "/dashboard/teacher/ai-digitizer", icon: Brain },
    { label: "Chat", href: "/dashboard/teacher/chat", icon: MessageCircle },
  ],
  parent: [
    { label: "Overview", href: "/dashboard/parent", icon: Home },
    { label: "Assignments", href: "/dashboard/parent/assignments", icon: ClipboardList },
    { label: "Grades", href: "/dashboard/parent/grades", icon: BarChart3 },
    { label: "Chat", href: "/dashboard/parent/chat", icon: MessageCircle },
    { label: "Notifications", href: "/dashboard/parent/notifications", icon: Bell },
  ],
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: Home },
    { label: "Setup", href: "/dashboard/admin/setup", icon: Layers },
    { label: "Invite Codes", href: "/dashboard/admin/invite-codes", icon: KeyRound },
    { label: "Users", href: "/dashboard/admin/users", icon: Users },
    { label: "Announcements", href: "/dashboard/admin/announcements", icon: Megaphone },
    { label: "Calendar", href: "/dashboard/admin/calendar", icon: Calendar },
  ],
};

const roleLabels: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  parent: "Parent",
  admin: "Admin",
};

const roleColors: Record<UserRole, string> = {
  student: "bg-blue-50 text-[#1e3a5f]",
  teacher: "bg-blue-50 text-[#1e3a5f]",
  parent: "bg-blue-50 text-[#1e3a5f]",
  admin: "bg-blue-50 text-[#1e3a5f]",
};

interface DashboardSidebarProps {
  role: UserRole;
  userName?: string;
}

export function DashboardSidebar({ role, userName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navByRole[role];

  const displayName = userName || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-6">
        <Image src="/academo.png" alt="Academo" width={36} height={36} className="rounded-lg" />
        <span className="text-xl font-bold text-gray-900">Academo</span>
      </div>

      {/* User Info */}
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-50 text-[#1e3a5f] font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[role]}`}>
              {roleLabels[role]}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-50 text-[#1e3a5f] shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-[#1e3a5f]" : "text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings className="h-5 w-5 text-gray-400" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
