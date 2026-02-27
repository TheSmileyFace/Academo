"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  iconWithBadge?: string;
  badge?: boolean;
}

const mainNavByRole: Record<UserRole, NavItem[]> = {
  student: [
    { label: "Home", href: "/dashboard/student", icon: "/Icons/white/home white.svg" },
    { label: "Resources", href: "/dashboard/student/resources", icon: "/Icons/white/resources white.svg" },
    { label: "Assignments", href: "/dashboard/student/assignments", icon: "/Icons/white/assignments or tasks without noti.svg", iconWithBadge: "/Icons/white/tasks with noti white.svg", badge: true },
    { label: "Planner", href: "/dashboard/student/planner", icon: "/Icons/white/planer white.svg" },
    { label: "Grades", href: "/dashboard/student/grades", icon: "/Icons/white/grades white.svg" },
    { label: "AI assistant", href: "/dashboard/student/ai-tutor", icon: "ai-orb" },
  ],
  teacher: [
    { label: "Home", href: "/dashboard/teacher", icon: "/Icons/white/home white.svg" },
    { label: "Assignments", href: "/dashboard/teacher/assignments", icon: "/Icons/white/assignments or tasks without noti.svg" },
    { label: "Create", href: "/dashboard/teacher/create", icon: "/Icons/white/resources white.svg" },
    { label: "Submissions", href: "/dashboard/teacher/submissions", icon: "/Icons/white/exams white.svg" },
    { label: "AI Digitizer", href: "/dashboard/teacher/ai-digitizer", icon: "/Icons/ai.svg" },
  ],
  parent: [
    { label: "Overview", href: "/dashboard/parent", icon: "/Icons/white/home white.svg" },
    { label: "Assignments", href: "/dashboard/parent/assignments", icon: "/Icons/white/assignments or tasks without noti.svg" },
    { label: "Grades", href: "/dashboard/parent/grades", icon: "/Icons/white/grades white.svg" },
    { label: "Notifications", href: "/dashboard/parent/notifications", icon: "/Icons/white/messages with noti whiite.svg", badge: true },
  ],
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: "/Icons/white/home white.svg" },
    { label: "Setup", href: "/dashboard/admin/setup", icon: "/Icons/white/resources white.svg" },
    { label: "Invite Codes", href: "/dashboard/admin/invite-codes", icon: "/Icons/white/exams white.svg" },
    { label: "Users", href: "/dashboard/admin/users", icon: "/Icons/white/home white.svg" },
    { label: "Announcements", href: "/dashboard/admin/announcements", icon: "/Icons/white/messages with noti whiite.svg", badge: true },
    { label: "Calendar", href: "/dashboard/admin/calendar", icon: "/Icons/white/schedule white.svg" },
  ],
};

const bottomNavByRole: Record<UserRole, NavItem[]> = {
  student: [
    { label: "Search", href: "/dashboard/student/search", icon: "/Icons/white/search white.svg" },
    { label: "Chat", href: "/dashboard/student/chat", icon: "/Icons/white/messages without noti.svg", iconWithBadge: "/Icons/white/messages with noti whiite.svg", badge: true },
  ],
  teacher: [
    { label: "Search", href: "/dashboard/teacher/search", icon: "/Icons/white/search white.svg" },
    { label: "Chat", href: "/dashboard/teacher/chat", icon: "/Icons/white/messages without noti.svg", iconWithBadge: "/Icons/white/messages with noti whiite.svg", badge: true },
  ],
  parent: [
    { label: "Search", href: "/dashboard/parent/search", icon: "/Icons/white/search white.svg" },
    { label: "Chat", href: "/dashboard/parent/chat", icon: "/Icons/white/messages without noti.svg", iconWithBadge: "/Icons/white/messages with noti whiite.svg", badge: true },
  ],
  admin: [
    { label: "Search", href: "/dashboard/admin/search", icon: "/Icons/white/search white.svg" },
    { label: "Chat", href: "/dashboard/admin/chat", icon: "/Icons/white/messages without noti.svg" },
  ],
};

interface DashboardSidebarProps {
  role: UserRole;
  userName?: string;
}

export function DashboardSidebar({ role, userName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const sidebarRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const mainNav = mainNavByRole[role];
  const bottomNav = bottomNavByRole[role];
  const allItems = [...mainNav, ...bottomNav];

  const displayName = userName || "User";
  const firstName = displayName.split(" ")[0];

  const isActive = useCallback(
    (href: string) => {
      const homeHref = `/dashboard/${role}`;
      return href === homeHref ? pathname === href : pathname.startsWith(href);
    },
    [pathname, role]
  );

  const activeHref = allItems.find((item) => isActive(item.href))?.href || null;
  const selectorHref = hoveredHref || activeHref;

  useEffect(() => {
    async function fetchBadges() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
      if (!profile?.school_id) return;

      if (role === "student") {
        const { data: links } = await supabase
          .from("assignment_students")
          .select("assignment_id, completed_at")
          .eq("student_id", user.id)
          .is("completed_at", null);
        const pendingCount = links?.length || 0;
        if (pendingCount > 0) {
          setBadgeCounts((prev) => ({ ...prev, [`/dashboard/student/assignments`]: pendingCount }));
        }
      }

      if (role === "admin") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count } = await supabase
          .from("announcements")
          .select("id", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .gte("created_at", weekAgo.toISOString());
        if (count && count > 0) {
          setBadgeCounts((prev) => ({ ...prev, "/dashboard/admin/announcements": count }));
        }
      }
    }
    fetchBadges();
  }, [role]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const renderIcon = (item: NavItem, isSelector: boolean) => {
    if (item.icon === "ai-orb") {
      return (
        <div className="w-6 h-6 shrink-0 flex items-center justify-center">
          <div
            className="w-5 h-5 rounded-full"
            style={{
              background: "radial-gradient(circle at 30% 30%, #92D1FF 0%, #0094FF 50%, #E45C12 100%)",
            }}
          />
        </div>
      );
    }

    const hasBadge = item.badge && (badgeCounts[item.href] || 0) > 0;
    const iconSrc = hasBadge && item.iconWithBadge ? item.iconWithBadge : item.icon;
    const isAI = item.icon === "/Icons/ai.svg";

    return (
      <div className="w-6 h-6 shrink-0 flex items-center justify-center relative">
        <Image
          src={iconSrc}
          alt={item.label}
          width={24}
          height={24}
          className={cn(
            "shrink-0 transition-all duration-200",
            !isAI && isSelector ? "brightness-0" : "",
            !isAI && !isSelector ? "opacity-100" : ""
          )}
        />
      </div>
    );
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const isSelector = selectorHref === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        ref={(el) => { navItemRefs.current[item.href] = el; }}
        onMouseEnter={() => setHoveredHref(item.href)}
        onMouseLeave={() => setHoveredHref(null)}
        className="relative flex items-center gap-3 px-2 py-1 text-[13px] font-bold transition-colors duration-200 z-[1]"
        style={{ height: 33 }}
      >
        {isSelector && (
          <motion.div
            layoutId="nav-selector"
            layout="position"
            className="absolute top-0 bg-white"
            animate={{
              width: isExpanded ? "calc(100% - 10px)" : 41,
              left: isExpanded ? 5 : 0,
            }}
            style={{ height: 33, borderRadius: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className={cn("relative z-[2] flex items-center gap-3 w-full", isSelector ? "text-[#090909]" : "text-white")}>  
          {renderIcon(item, isSelector)}
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="truncate whitespace-nowrap overflow-hidden font-bold"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </Link>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="relative z-10 flex flex-col h-full shrink-0 py-3 pl-3 select-none"
      style={{ width: isExpanded ? 200 : 68, transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 h-8">
        <Image
          src="/academo.png"
          alt="Academo"
          width={28}
          height={28}
          className="shrink-0 object-contain"
        />
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[20px] font-bold tracking-tight text-white whitespace-nowrap overflow-hidden"
            >
              Academo
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Divider below logo */}
      <div className="my-3 mx-2 h-px bg-white/10" />

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col min-h-0">
        <div style={{ display: "flex", flexDirection: "column", gap: 27 }}>
          {mainNav.map(renderNavItem)}
        </div>

        <div className="flex-1" />

        {/* Divider above bottom section */}
        <div className="my-3 mx-2 h-px bg-white/10" />

        {/* Bottom Nav: Search + Messages */}
        <div style={{ display: "flex", flexDirection: "column", gap: 27 }}>
          {bottomNav.map(renderNavItem)}
        </div>

        {/* Account at very bottom */}
        <div className="mt-3">
          <div
            className="flex items-center gap-3 px-2 py-1 cursor-pointer hover:bg-white/5 rounded-lg transition-colors duration-200"
            onClick={() => router.push("/dashboard/settings")}
            onMouseEnter={() => setHoveredHref(null)}
          >
            <div className="h-7 w-7 rounded-full bg-[#12E43C] shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
                >
                  <span className="text-[13px] font-medium text-white">{firstName}</span>
                  <ChevronDown className="h-3 w-3 text-white/40" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </aside>
  );
}
