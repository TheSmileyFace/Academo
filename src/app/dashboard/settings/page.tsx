"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Image from "next/image";
import type { UserRole } from "@/lib/types";

/* ─── Types ─── */
type SettingsTab = "account" | "preferences" | "notifications" | "privacy" | "integrations" | "school";

interface ProfileData {
  full_name: string;
  email: string;
  role: UserRole;
  username: string;
  phone: string;
  bio: string;
  avatar_url: string | null;
  school_id: string | null;
}

interface SettingsData {
  accent_color: string;
  default_calendar_view: string;
  default_dashboard_page: string;
  language: string;
  notify_in_app: boolean;
  notify_email: boolean;
  notify_push: boolean;
  notify_new_assignment: boolean;
  notify_deadline_reminder: boolean;
  notify_grade_published: boolean;
  notify_message_received: boolean;
  notify_announcement: boolean;
  notify_admin_alert: boolean;
  notify_weekly_summary: boolean;
  reminder_timing: string;
  profile_visibility: string;
  show_email: boolean;
  show_grades_publicly: boolean;
  show_online_status: boolean;
  auto_late_penalties: boolean;
  default_grade_scale: string;
}

const DEFAULT_SETTINGS: SettingsData = {
  accent_color: "green",
  default_calendar_view: "week",
  default_dashboard_page: "home",
  language: "en",
  notify_in_app: true,
  notify_email: true,
  notify_push: false,
  notify_new_assignment: true,
  notify_deadline_reminder: true,
  notify_grade_published: true,
  notify_message_received: true,
  notify_announcement: true,
  notify_admin_alert: true,
  notify_weekly_summary: false,
  reminder_timing: "1day",
  profile_visibility: "classmates",
  show_email: false,
  show_grades_publicly: false,
  show_online_status: true,
  auto_late_penalties: false,
  default_grade_scale: "percentage",
};

const ACCENT_COLORS = [
  { id: "green", color: "#12E43C", label: "Green" },
  { id: "blue", color: "#3B82F6", label: "Blue" },
  { id: "purple", color: "#8B5CF6", label: "Purple" },
  { id: "orange", color: "#F97316", label: "Orange" },
  { id: "pink", color: "#EC4899", label: "Pink" },
];

/* ─── Toggle Component ─── */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? "bg-[#12E43C]" : "bg-[#E5E5E5] dark:bg-[#3D3D3D]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        } mt-0.5`}
      />
    </button>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-[18px] font-bold text-[#2d2d2d] dark:text-white">{title}</h2>
      <p className="text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-1">{desc}</p>
    </div>
  );
}

/* ─── Setting Row ─── */
function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] hover:border-[#2d2d2d]/20 dark:hover:border-white/20 transition-colors bg-white dark:bg-[#222222]">
      <div className="min-w-0 flex-1 mr-4">
        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">{label}</p>
        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ─── Saved Indicator ─── */
function SavedIndicator({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#12E43C] animate-slide-up">
      <span className="h-1.5 w-1.5 rounded-full bg-[#12E43C]" />
      Saved
    </span>
  );
}

/* ─── Main Settings Page ─── */
export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [searchQuery, setSearchQuery] = useState("");

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "", email: "", role: "student", username: "", phone: "", bio: "", avatar_url: null, school_id: null,
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // School name
  const [schoolName, setSchoolName] = useState("");

  // Profile completion
  const profileCompletion = (() => {
    let filled = 0;
    let total = 5;
    if (profile.full_name) filled++;
    if (profile.username) filled++;
    if (profile.phone) filled++;
    if (profile.bio) filled++;
    if (profile.avatar_url) filled++;
    return Math.round((filled / total) * 100);
  })();

  // Dirty state for Account tab
  const isDirty = originalProfile
    ? profile.full_name !== originalProfile.full_name ||
      profile.username !== originalProfile.username ||
      profile.phone !== originalProfile.phone ||
      profile.bio !== originalProfile.bio
    : false;

  /* ─── Load Data ─── */
  useEffect(() => {
    setMounted(true);
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Load profile
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url, school_id, username, phone, bio")
        .eq("id", user.id)
        .single();

      const profileData: ProfileData = {
        full_name: p?.full_name || "",
        email: user.email || "",
        role: (p?.role as UserRole) || "student",
        username: p?.username || "",
        phone: p?.phone || "",
        bio: p?.bio || "",
        avatar_url: p?.avatar_url || null,
        school_id: p?.school_id || null,
      };
      setProfile(profileData);
      setOriginalProfile(profileData);

      // Load school name
      if (p?.school_id) {
        const { data: school } = await supabase
          .from("schools")
          .select("name")
          .eq("id", p.school_id)
          .single();
        if (school) setSchoolName(school.name);
      }

      // Load settings
      const { data: s } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (s) {
        setSettings({
          accent_color: s.accent_color || DEFAULT_SETTINGS.accent_color,
          default_calendar_view: s.default_calendar_view || DEFAULT_SETTINGS.default_calendar_view,
          default_dashboard_page: s.default_dashboard_page || DEFAULT_SETTINGS.default_dashboard_page,
          language: s.language || DEFAULT_SETTINGS.language,
          notify_in_app: s.notify_in_app ?? DEFAULT_SETTINGS.notify_in_app,
          notify_email: s.notify_email ?? DEFAULT_SETTINGS.notify_email,
          notify_push: s.notify_push ?? DEFAULT_SETTINGS.notify_push,
          notify_new_assignment: s.notify_new_assignment ?? DEFAULT_SETTINGS.notify_new_assignment,
          notify_deadline_reminder: s.notify_deadline_reminder ?? DEFAULT_SETTINGS.notify_deadline_reminder,
          notify_grade_published: s.notify_grade_published ?? DEFAULT_SETTINGS.notify_grade_published,
          notify_message_received: s.notify_message_received ?? DEFAULT_SETTINGS.notify_message_received,
          notify_announcement: s.notify_announcement ?? DEFAULT_SETTINGS.notify_announcement,
          notify_admin_alert: s.notify_admin_alert ?? DEFAULT_SETTINGS.notify_admin_alert,
          notify_weekly_summary: s.notify_weekly_summary ?? DEFAULT_SETTINGS.notify_weekly_summary,
          reminder_timing: s.reminder_timing || DEFAULT_SETTINGS.reminder_timing,
          profile_visibility: s.profile_visibility || DEFAULT_SETTINGS.profile_visibility,
          show_email: s.show_email ?? DEFAULT_SETTINGS.show_email,
          show_grades_publicly: s.show_grades_publicly ?? DEFAULT_SETTINGS.show_grades_publicly,
          show_online_status: s.show_online_status ?? DEFAULT_SETTINGS.show_online_status,
          auto_late_penalties: s.auto_late_penalties ?? DEFAULT_SETTINGS.auto_late_penalties,
          default_grade_scale: s.default_grade_scale || DEFAULT_SETTINGS.default_grade_scale,
        });
      } else {
        // Create default settings row
        await supabase.from("user_settings").insert({ user_id: user.id });
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Auto-save Settings ─── */
  const autoSaveSettings = useCallback(
    async (patch: Partial<SettingsData>) => {
      if (!userId) return;
      const updated = { ...settings, ...patch };
      setSettings(updated);

      const { error } = await supabase
        .from("user_settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) {
        toast.error("Failed to save setting");
      } else {
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2000);
      }
    },
    [userId, settings, supabase]
  );

  /* ─── Save Profile ─── */
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        username: profile.username.trim() || null,
        phone: profile.phone.trim() || null,
        bio: profile.bio.trim() || null,
      })
      .eq("id", userId);

    if (error) {
      if (error.code === "23505") toast.error("Username already taken");
      else toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved");
      setOriginalProfile({ ...profile });
    }
    setSavingProfile(false);
  };

  /* ─── Avatar Upload ─── */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload failed");
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to update avatar");
    } else {
      setProfile((p) => ({ ...p, avatar_url: avatarUrl }));
      toast.success("Avatar updated");
    }
    setUploadingAvatar(false);
  };

  const handleRemoveAvatar = async () => {
    if (!userId) return;
    setUploadingAvatar(true);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    setProfile((p) => ({ ...p, avatar_url: null }));
    toast.success("Avatar removed");
    setUploadingAvatar(false);
  };

  /* ─── Password Change ─── */
  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); }
    setSavingPassword(false);
  };

  /* ─── Delete Account ─── */
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    setDeleting(true);
    toast.error("Account deletion requires admin approval. Contact your school administrator.");
    setDeleting(false);
  };

  /* ─── Sign Out All Devices ─── */
  const handleSignOutAll = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) toast.error("Failed to sign out all devices");
    else { toast.success("Signed out of all devices"); router.push("/login"); }
  };

  /* ─── Initials ─── */
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  /* ─── Nav Items (role-based) ─── */
  const navItems: { id: SettingsTab; label: string; show: boolean }[] = [
    { id: "account", label: "Account", show: true },
    { id: "preferences", label: "Preferences", show: true },
    { id: "notifications", label: "Notifications", show: true },
    { id: "privacy", label: "Privacy & Security", show: true },
    { id: "integrations", label: "Integrations", show: true },
    { id: "school", label: "School Settings", show: profile.role === "admin" },
  ];

  const visibleNavItems = navItems.filter((n) => n.show);

  // Filter by search
  const filteredNavItems = searchQuery
    ? visibleNavItems.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : visibleNavItems;

  /* ─── Loading ─── */
  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 rounded-full border-2 border-[#2d2d2d]/10 border-t-[#2d2d2d] dark:border-white/10 dark:border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 text-[#2d2d2d] dark:text-[#f8f8f8]">
      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between shrink-0" style={{ paddingTop: 23 }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 rounded-lg dash-card dark:border-[#2D2D2D] dark:bg-[#2D2D2D]/30 flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors"
          >
            <span className="text-[14px]">←</span>
          </button>
          <h1 className="text-[22px] leading-tight">
            <span className="font-libre font-bold">Settings</span>
          </h1>
        </div>
        <SavedIndicator show={savedIndicator} />
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex flex-1 min-h-0 gap-6 mt-2">
        {/* ─── LEFT: SIDEBAR NAV ─── */}
        <div className="w-[240px] shrink-0 flex flex-col gap-3">
          {/* Profile card */}
          <div className="dash-card dark:border-[#2D2D2D] rounded-2xl p-4 dark:bg-[#333333]">
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#12E43C] to-[#0BA82A] shrink-0 flex items-center justify-center text-[14px] font-bold text-white shadow-md">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white truncate">{profile.full_name || "No name"}</p>
                <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] capitalize">{profile.role}</p>
              </div>
            </div>

            {/* Profile completion bar */}
            {profileCompletion < 100 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Profile</span>
                  <span className="text-[10px] font-bold text-[#2d2d2d] dark:text-white">{profileCompletion}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#E5E5E5] dark:bg-[#3D3D3D] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#12E43C] to-[#0BA82A] transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings…"
            className="w-full h-9 px-3.5 rounded-xl text-[13px] text-[#2d2d2d] dark:text-white border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/10 dark:focus:ring-white/10 transition-all placeholder:text-[#9A9A9A]"
          />

          {/* Nav tabs */}
          <div className="space-y-1">
            {filteredNavItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center w-full px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-[#2D2D2D] dark:bg-[#2D2D2D] text-white shadow-sm"
                    : "text-[#2d2d2d] dark:text-[#A0A0A0] hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D]/50"
                }`}
              >
                <p className={`text-[13px] font-semibold ${activeTab === tab.id ? "text-white" : "text-[#2d2d2d] dark:text-[#f8f8f8]"}`}>
                  {tab.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ─── RIGHT: CONTENT ─── */}
        <div className="flex-1 min-w-0 overflow-auto pb-8">
          <div className="dash-card dark:border-[#2D2D2D] rounded-3xl p-8 min-h-full dark:bg-[#333333]">

            {/* ════════════════════════════════════════════ */}
            {/* ── ACCOUNT ── */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "account" && (
              <div className="space-y-8 max-w-2xl animate-slide-up">
                <SectionHeader title="Account" desc="Manage your identity, credentials, and personal information." />

                {/* Avatar section */}
                <div className="flex items-center gap-5 p-5 rounded-2xl bg-[#f8f8f8] dark:bg-[#2D2D2D]/30 border border-transparent dark:border-[#2D2D2D]">
                  <div className="relative group">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt="Avatar"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#12E43C] to-[#0BA82A] flex items-center justify-center text-[20px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-[#2D2D2D]/50 flex items-center justify-center">
                        <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-bold text-[#2d2d2d] dark:text-white truncate">{profile.full_name || "No name set"}</p>
                    <p className="text-[13px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[12px] font-semibold hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
                    >
                      Upload
                    </button>
                    {profile.avatar_url && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="h-9 px-4 rounded-xl text-[12px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile fields */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Full Name</label>
                    <input
                      value={profile.full_name}
                      onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl text-[14px] text-[#2d2d2d] dark:text-white border border-[#E5E5E5] dark:border-[#3D3D3D] bg-transparent dark:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/20 dark:focus:ring-white/20 transition-all placeholder:text-[#9A9A9A]"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Username</label>
                    <input
                      value={profile.username}
                      onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") }))}
                      className="w-full h-11 px-4 rounded-xl text-[14px] text-[#2d2d2d] dark:text-white border border-[#E5E5E5] dark:border-[#3D3D3D] bg-transparent dark:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/20 dark:focus:ring-white/20 transition-all placeholder:text-[#9A9A9A]"
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Email</label>
                    <input
                      value={profile.email}
                      disabled
                      className="w-full h-11 px-4 rounded-xl text-[14px] text-[#9A9A9A] border border-[#E5E5E5] dark:border-[#3D3D3D] bg-[#f8f8f8] dark:bg-[#222222]/50 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Phone</label>
                    <input
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl text-[14px] text-[#2d2d2d] dark:text-white border border-[#E5E5E5] dark:border-[#3D3D3D] bg-transparent dark:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/20 dark:focus:ring-white/20 transition-all placeholder:text-[#9A9A9A]"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Role</label>
                    <input
                      value={profile.role}
                      disabled
                      className="w-full h-11 px-4 rounded-xl text-[14px] text-[#9A9A9A] border border-[#E5E5E5] dark:border-[#3D3D3D] bg-[#f8f8f8] dark:bg-[#222222]/50 cursor-not-allowed capitalize"
                    />
                  </div>
                  {schoolName && (
                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">School</label>
                      <input
                        value={schoolName}
                        disabled
                        className="w-full h-11 px-4 rounded-xl text-[14px] text-[#9A9A9A] border border-[#E5E5E5] dark:border-[#3D3D3D] bg-[#f8f8f8] dark:bg-[#222222]/50 cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-xl text-[14px] text-[#2d2d2d] dark:text-white border border-[#E5E5E5] dark:border-[#3D3D3D] bg-transparent dark:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/20 dark:focus:ring-white/20 transition-all placeholder:text-[#9A9A9A] resize-none"
                    placeholder="Tell us about yourself…"
                  />
                  <p className="text-[11px] text-[#9A9A9A] dark:text-[#A0A0A0] text-right">{profile.bio.length}/200</p>
                </div>

                {/* Save button (appears only if dirty) */}
                {isDirty && (
                  <div className="pt-4 border-t border-[#f0f0f0] dark:border-[#2D2D2D]">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="h-10 px-6 rounded-xl bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2d2d2d] text-[14px] font-bold hover:bg-[#3D3D3D] dark:hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      {savingProfile && <div className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                )}

                {/* ── Change Password ── */}
                <div className="pt-6 border-t border-[#f0f0f0] dark:border-[#2D2D2D]">
                  <h3 className="text-[15px] font-bold text-[#2d2d2d] dark:text-white mb-4">Change Password</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl text-[14px] text-[#2d2d2d] dark:text-white border border-[#E5E5E5] dark:border-[#3D3D3D] bg-transparent dark:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/20 dark:focus:ring-white/20 transition-all placeholder:text-[#9A9A9A]"
                        placeholder="Min 8 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl text-[14px] text-[#2d2d2d] dark:text-white border border-[#E5E5E5] dark:border-[#3D3D3D] bg-transparent dark:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-[#2d2d2d]/20 dark:focus:ring-white/20 transition-all placeholder:text-[#9A9A9A]"
                        placeholder="Repeat password"
                      />
                    </div>
                  </div>
                  {newPassword && (
                    <button
                      onClick={handleChangePassword}
                      disabled={savingPassword}
                      className="mt-4 h-10 px-6 rounded-xl bg-[#2D2D2D] dark:bg-white text-white dark:text-[#2d2d2d] text-[14px] font-bold hover:bg-[#3D3D3D] dark:hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      {savingPassword && <div className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />}
                      Update Password
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* ── PREFERENCES ── */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "preferences" && (
              <div className="space-y-8 max-w-2xl animate-slide-up">
                <SectionHeader title="Preferences" desc="Personalize your experience. Changes save automatically." />

                {/* Theme */}
                <div className="space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`group relative flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all duration-300 ${
                          theme === t
                            ? "border-[#2d2d2d] dark:border-white bg-[#f5f5f5] dark:bg-[#2D2D2D]/80 shadow-sm"
                            : "border-[#E5E5E5] dark:border-[#3D3D3D] hover:border-[#2d2d2d]/30 dark:hover:border-white/30 hover:bg-[#fafafa] dark:hover:bg-[#2D2D2D]/30"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[14px] font-semibold capitalize text-[#2d2d2d] dark:text-white">
                            {t}
                          </span>
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                            theme === t 
                              ? "border-[#2d2d2d] dark:border-white" 
                              : "border-[#D4D4D4] dark:border-[#4D4D4D]"
                          }`}>
                            {theme === t && (
                              <div className="h-2 w-2 rounded-full bg-[#2d2d2d] dark:bg-white animate-in zoom-in" />
                            )}
                          </div>
                        </div>

                        {/* Abstract visual representation instead of icons */}
                        <div className="w-full h-20 rounded-xl overflow-hidden mt-1 border border-[#E5E5E5] dark:border-[#3D3D3D]">
                          {t === "light" && (
                            <div className="w-full h-full bg-[#f8fafc] flex flex-col p-2 gap-1.5">
                              <div className="h-3 w-1/3 bg-[#e2e8f0] rounded-full" />
                              <div className="flex-1 rounded-lg bg-white shadow-sm border border-[#e2e8f0]/50" />
                            </div>
                          )}
                          {t === "dark" && (
                            <div className="w-full h-full bg-[#2d2d2d] flex flex-col p-2 gap-1.5">
                              <div className="h-3 w-1/3 bg-[#404040] rounded-full" />
                              <div className="flex-1 rounded-lg bg-[#333333] border border-[#404040]/50" />
                            </div>
                          )}
                          {t === "system" && (
                            <div className="w-full h-full flex">
                              <div className="w-1/2 h-full bg-[#f8fafc] flex flex-col p-2 gap-1.5">
                                <div className="h-3 w-2/3 bg-[#e2e8f0] rounded-full" />
                                <div className="flex-1 rounded-l-lg bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.05)] border-y border-l border-[#e2e8f0]/50" />
                              </div>
                              <div className="w-1/2 h-full bg-[#2d2d2d] flex flex-col p-2 gap-1.5">
                                <div className="h-3 w-2/3 bg-[#404040] rounded-full self-end" />
                                <div className="flex-1 rounded-r-lg bg-[#333333] border-y border-r border-[#404040]/50" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Accent Color</h3>
                  <div className="flex items-center gap-3">
                    {ACCENT_COLORS.map((ac) => (
                      <button
                        key={ac.id}
                        onClick={() => autoSaveSettings({ accent_color: ac.id })}
                        className={`h-10 w-10 rounded-full transition-all ${
                          settings.accent_color === ac.id
                            ? "ring-2 ring-offset-2 ring-[#2d2d2d] dark:ring-white dark:ring-offset-[#333333] scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: ac.color }}
                        title={ac.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Calendar View */}
                <SettingRow label="Default Calendar View" desc="Choose between week or month view">
                  <select
                    value={settings.default_calendar_view}
                    onChange={(e) => autoSaveSettings({ default_calendar_view: e.target.value })}
                    className="h-9 px-3 rounded-lg text-[13px] font-semibold border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] text-[#2d2d2d] dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                </SettingRow>

                {/* Default Dashboard Page */}
                <SettingRow label="Default Dashboard" desc="Which page opens first when you log in">
                  <select
                    value={settings.default_dashboard_page}
                    onChange={(e) => autoSaveSettings({ default_dashboard_page: e.target.value })}
                    className="h-9 px-3 rounded-lg text-[13px] font-semibold border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] text-[#2d2d2d] dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="home">Home</option>
                    <option value="assignments">Assignments</option>
                    <option value="calendar">Calendar</option>
                    <option value="grades">Grades</option>
                    <option value="planner">Planner</option>
                  </select>
                </SettingRow>

                {/* Language */}
                <SettingRow label="Language" desc="Select your preferred language">
                  <select
                    value={settings.language}
                    onChange={(e) => autoSaveSettings({ language: e.target.value })}
                    className="h-9 px-3 rounded-lg text-[13px] font-semibold border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] text-[#2d2d2d] dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="pt">Português</option>
                  </select>
                </SettingRow>

                {/* Teacher-specific preferences */}
                {(profile.role === "teacher" || profile.role === "admin") && (
                  <>
                    <div className="h-px bg-[#2D2D2D]/5 dark:bg-white/5" />
                    <h3 className="text-[15px] font-bold text-[#2d2d2d] dark:text-white">Teacher Settings</h3>
                    <SettingRow label="Auto Late Penalties" desc="Automatically deduct marks for late submissions">
                      <Toggle
                        checked={settings.auto_late_penalties}
                        onChange={(v) => autoSaveSettings({ auto_late_penalties: v })}
                      />
                    </SettingRow>
                    <SettingRow label="Default Grade Scale" desc="Choose your grading system">
                      <select
                        value={settings.default_grade_scale}
                        onChange={(e) => autoSaveSettings({ default_grade_scale: e.target.value })}
                        className="h-9 px-3 rounded-lg text-[13px] font-semibold border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] text-[#2d2d2d] dark:text-white focus:outline-none cursor-pointer"
                      >
                        <option value="percentage">Percentage (0–100%)</option>
                        <option value="letter">Letter (A–F)</option>
                        <option value="gpa">GPA (0.0–4.0)</option>
                        <option value="points">Points</option>
                      </select>
                    </SettingRow>
                  </>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* ── NOTIFICATIONS ── */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "notifications" && (
              <div className="space-y-8 max-w-2xl animate-slide-up">
                <SectionHeader title="Notifications" desc="Control what you get notified about and how. Changes save automatically." />

                {/* Channels */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Channels</h3>
                  <SettingRow label="In-App Notifications" desc="Show notifications inside Academo">
                    <Toggle checked={settings.notify_in_app} onChange={(v) => autoSaveSettings({ notify_in_app: v })} />
                  </SettingRow>
                  <SettingRow label="Email Notifications" desc="Receive important updates via email">
                    <Toggle checked={settings.notify_email} onChange={(v) => autoSaveSettings({ notify_email: v })} />
                  </SettingRow>
                  <SettingRow label="Push Notifications" desc="Browser and mobile push alerts">
                    <Toggle checked={settings.notify_push} onChange={(v) => autoSaveSettings({ notify_push: v })} />
                  </SettingRow>
                </div>

                {/* What to notify */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Events</h3>
                  <SettingRow label="New Assignment Posted" desc="When a teacher creates a new assignment">
                    <Toggle checked={settings.notify_new_assignment} onChange={(v) => autoSaveSettings({ notify_new_assignment: v })} />
                  </SettingRow>
                  <SettingRow label="Assignment Deadline" desc="Reminders before assignments are due">
                    <Toggle checked={settings.notify_deadline_reminder} onChange={(v) => autoSaveSettings({ notify_deadline_reminder: v })} />
                  </SettingRow>
                  <SettingRow label="Grade Published" desc="When a grade is posted for your work">
                    <Toggle checked={settings.notify_grade_published} onChange={(v) => autoSaveSettings({ notify_grade_published: v })} />
                  </SettingRow>
                  <SettingRow label="Message Received" desc="New direct messages from teachers or classmates">
                    <Toggle checked={settings.notify_message_received} onChange={(v) => autoSaveSettings({ notify_message_received: v })} />
                  </SettingRow>
                  <SettingRow label="School Announcements" desc="Important updates from your school">
                    <Toggle checked={settings.notify_announcement} onChange={(v) => autoSaveSettings({ notify_announcement: v })} />
                  </SettingRow>
                  {(profile.role === "admin" || profile.role === "teacher") && (
                    <SettingRow label="Admin Alerts" desc="System and admin-level notifications">
                      <Toggle checked={settings.notify_admin_alert} onChange={(v) => autoSaveSettings({ notify_admin_alert: v })} />
                    </SettingRow>
                  )}
                  <SettingRow label="Weekly Summary" desc="Email digest of your weekly activity">
                    <Toggle checked={settings.notify_weekly_summary} onChange={(v) => autoSaveSettings({ notify_weekly_summary: v })} />
                  </SettingRow>
                </div>

                {/* Reminder Timing */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Reminder Timing</h3>
                  <SettingRow label="Deadline Reminders" desc="How early to remind you before deadlines">
                    <select
                      value={settings.reminder_timing}
                      onChange={(e) => autoSaveSettings({ reminder_timing: e.target.value })}
                      className="h-9 px-3 rounded-lg text-[13px] font-semibold border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] text-[#2d2d2d] dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="1hour">1 hour before</option>
                      <option value="3hours">3 hours before</option>
                      <option value="1day">1 day before</option>
                      <option value="2days">2 days before</option>
                      <option value="1week">1 week before</option>
                    </select>
                  </SettingRow>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* ── PRIVACY & SECURITY ── */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "privacy" && (
              <div className="space-y-8 max-w-2xl animate-slide-up">
                <SectionHeader title="Privacy & Security" desc="Control your visibility, data, and account security." />

                {/* Privacy */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Privacy</h3>
                  <SettingRow label="Profile Visibility" desc="Who can see your profile">
                    <select
                      value={settings.profile_visibility}
                      onChange={(e) => autoSaveSettings({ profile_visibility: e.target.value })}
                      className="h-9 px-3 rounded-lg text-[13px] font-semibold border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] text-[#2d2d2d] dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="classmates">Only Classmates</option>
                      <option value="teachers">Only Teachers</option>
                      <option value="private">Private</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Show Email" desc="Display your email on your profile">
                    <Toggle checked={settings.show_email} onChange={(v) => autoSaveSettings({ show_email: v })} />
                  </SettingRow>
                  <SettingRow label="Show Online Status" desc="Let others see when you're active">
                    <Toggle checked={settings.show_online_status} onChange={(v) => autoSaveSettings({ show_online_status: v })} />
                  </SettingRow>
                  <SettingRow label="Show Grades Publicly" desc="Allow others to see your grades">
                    <Toggle checked={settings.show_grades_publicly} onChange={(v) => autoSaveSettings({ show_grades_publicly: v })} />
                  </SettingRow>
                </div>

                {/* Security */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Security</h3>
                  <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Sign Out All Devices</p>
                        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">End all active sessions everywhere</p>
                      </div>
                      <button
                        onClick={handleSignOutAll}
                        className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors"
                      >
                        Sign Out All
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Export My Data</p>
                        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Download all your data in JSON format</p>
                      </div>
                      <button
                        onClick={() => toast.info("Data export will be sent to your email")}
                        className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors"
                      >
                        Export
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-2xl p-5 border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                  <h3 className="text-[14px] font-bold text-red-600 dark:text-red-500">Danger Zone</h3>
                  <p className="text-[13px] text-red-600/80 dark:text-red-400/80 mt-1 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder='Type "DELETE" to confirm'
                      className="h-10 px-4 rounded-xl text-[13px] border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#222222] text-red-600 dark:text-red-400 placeholder:text-red-300 dark:placeholder:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 w-48"
                    />
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteConfirm !== "DELETE"}
                      className="h-10 px-5 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Delete Account"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* ── INTEGRATIONS ── */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "integrations" && (
              <div className="space-y-8 max-w-2xl animate-slide-up">
                <SectionHeader title="Integrations" desc="Connect external services to enhance your workflow." />

                {/* Student integrations */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Calendar & Storage</h3>
                  {[
                    { name: "Google Calendar", desc: "Sync assignments and deadlines to your calendar", connected: false },
                    { name: "Microsoft Outlook", desc: "Sync with Outlook calendar and email", connected: false },
                    { name: "Google Drive", desc: "Attach and submit files from Drive", connected: false },
                  ].map((i) => (
                    <div key={i.name} className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] hover:border-[#2d2d2d]/20 dark:hover:border-white/20 transition-colors bg-white dark:bg-[#222222]">
                      <div>
                        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">{i.name}</p>
                        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{i.desc}</p>
                      </div>
                      {i.connected ? (
                        <span className="text-[12px] font-bold text-[#12E43C] bg-[#12E43C]/10 dark:bg-[#12E43C]/20 px-3 py-1.5 rounded-lg">Connected</span>
                      ) : (
                        <button className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors">
                          Connect
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Teacher-specific integrations */}
                {(profile.role === "teacher" || profile.role === "admin") && (
                  <div className="space-y-3">
                    <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Teaching Tools</h3>
                    {[
                      { name: "Google Classroom", desc: "Import classes and sync grades", connected: false },
                      { name: "Grade Export (CSV)", desc: "Export gradebook data as spreadsheet", connected: false },
                    ].map((i) => (
                      <div key={i.name} className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] hover:border-[#2d2d2d]/20 dark:hover:border-white/20 transition-colors bg-white dark:bg-[#222222]">
                        <div>
                          <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">{i.name}</p>
                          <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{i.desc}</p>
                        </div>
                        <button className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors">
                          {i.name.includes("Export") ? "Export" : "Connect"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin-specific integrations */}
                {profile.role === "admin" && (
                  <div className="space-y-3">
                    <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Administration</h3>
                    {[
                      { name: "SIS Integration", desc: "Connect your Student Information System", connected: false },
                      { name: "Analytics Dashboard", desc: "Advanced school-wide analytics", connected: false },
                    ].map((i) => (
                      <div key={i.name} className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] hover:border-[#2d2d2d]/20 dark:hover:border-white/20 transition-colors bg-white dark:bg-[#222222]">
                        <div>
                          <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">{i.name}</p>
                          <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">{i.desc}</p>
                        </div>
                        <button className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors">
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* ── SCHOOL SETTINGS (Admin Only) ── */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "school" && profile.role === "admin" && (
              <div className="space-y-8 max-w-2xl animate-slide-up">
                <SectionHeader title="School Settings" desc="Configure school-wide settings and branding." />

                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Branding</h3>
                  <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">School Logo</p>
                        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Upload your school&apos;s logo for branding</p>
                      </div>
                      <button className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors">
                        Upload Logo
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222]">
                    <div className="space-y-2">
                      <label className="text-[12px] font-bold text-[#9A9A9A] dark:text-[#A0A0A0] uppercase tracking-wider">School Name</label>
                      <input
                        value={schoolName}
                        disabled
                        className="w-full h-11 px-4 rounded-xl text-[14px] text-[#9A9A9A] border border-[#E5E5E5] dark:border-[#3D3D3D] bg-[#f8f8f8] dark:bg-[#222222]/50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Academic Configuration</h3>
                  <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Academic Year</p>
                        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Configure academic year and term dates</p>
                      </div>
                      <button className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors">
                        Configure
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">User Management</p>
                        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Manage teachers, students, and permissions</p>
                      </div>
                      <button
                        onClick={() => router.push("/dashboard/admin/users")}
                        className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#3D3D3D] bg-white dark:bg-[#222222]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Global Notifications</p>
                        <p className="text-[12px] text-[#9A9A9A] dark:text-[#A0A0A0] mt-0.5">Send announcements to all users</p>
                      </div>
                      <button
                        onClick={() => router.push("/dashboard/admin/announcements")}
                        className="h-9 px-4 rounded-xl border border-[#E5E5E5] dark:border-[#3D3D3D] text-[13px] font-semibold text-[#2d2d2d] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2D2D2D] transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-[#2d2d2d] dark:text-white">Feature Toggles</h3>
                  <SettingRow label="AI Tutor" desc="Enable the AI assistant for students">
                    <Toggle checked={true} onChange={() => toast.info("Feature toggle coming soon")} />
                  </SettingRow>
                  <SettingRow label="Chat System" desc="Enable direct messaging between users">
                    <Toggle checked={true} onChange={() => toast.info("Feature toggle coming soon")} />
                  </SettingRow>
                  <SettingRow label="Student Planner" desc="Enable personal planner for students">
                    <Toggle checked={true} onChange={() => toast.info("Feature toggle coming soon")} />
                  </SettingRow>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
