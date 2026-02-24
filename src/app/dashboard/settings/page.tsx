"use client";

import { useState, useEffect } from "react";
import { User, Bell, Lock, Globe, Link2, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();
      if (profile) {
        setName(profile.full_name || "");
        setRole(profile.role || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user.id);
      if (error) {
        toast.error("Failed to save. Please try again.");
      } else {
        toast.success("Settings saved successfully!");
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Manage your account preferences</p>
      </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-white border border-gray-200 rounded-xl p-1">
              <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-[#1e3a5f]">
                <User className="mr-2 h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-[#1e3a5f]">
                <Bell className="mr-2 h-4 w-4" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-[#1e3a5f]">
                <Lock className="mr-2 h-4 w-4" /> Privacy
              </TabsTrigger>
              <TabsTrigger value="integrations" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-[#1e3a5f]">
                <Link2 className="mr-2 h-4 w-4" /> Integrations
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-[#1e3a5f]">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{name || "No name set"}</p>
                      <p className="text-xs text-gray-500 capitalize">{role}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1.5 rounded-xl border-gray-200"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <Input
                        value={email}
                        className="mt-1.5 rounded-xl border-gray-200"
                        disabled
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="mt-1.5 rounded-xl border-gray-200 w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    { label: "Assignment Reminders", desc: "Get notified about upcoming deadlines", default: true },
                    { label: "Grade Updates", desc: "Receive alerts when grades are posted", default: true },
                    { label: "New Messages", desc: "Notifications for incoming messages", default: true },
                    { label: "School Announcements", desc: "Important updates from your school", default: true },
                    { label: "Weekly Summary", desc: "Weekly email digest of your activity", default: false },
                  ].map((pref) => (
                    <div key={pref.label} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{pref.label}</p>
                        <p className="text-xs text-gray-500">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={pref.default} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e3a5f]"></div>
                      </label>
                    </div>
                  ))}
                  <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl">
                    <Save className="mr-2 h-4 w-4" /> Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Privacy Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    { label: "Profile Visibility", desc: "Who can see your profile information", default: true },
                    { label: "Show Online Status", desc: "Let others see when you're active", default: true },
                    { label: "Show Progress to Classmates", desc: "Allow classmates to see your streaks and XP", default: false },
                  ].map((pref) => (
                    <div key={pref.label} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{pref.label}</p>
                        <p className="text-xs text-gray-500">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={pref.default} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e3a5f]"></div>
                      </label>
                    </div>
                  ))}
                  <Separator />
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="font-medium text-red-700 text-sm">Danger Zone</p>
                    <p className="text-xs text-red-600 mt-1">Permanently delete your account and all associated data.</p>
                    <Button variant="destructive" size="sm" className="mt-3 rounded-lg">Delete Account</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Integrations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Google Classroom", desc: "Sync assignments and grades", connected: false, color: "bg-blue-50" },
                    { name: "Microsoft Teams", desc: "Connect with Teams for messaging", connected: false, color: "bg-blue-50" },
                    { name: "Google Drive", desc: "Attach files from Google Drive", connected: true, color: "bg-blue-50" },
                    { name: "Zoom", desc: "Launch video classes directly", connected: false, color: "bg-blue-50" },
                  ].map((integration) => (
                    <div key={integration.name} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${integration.color}`}>
                          <Globe className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{integration.name}</p>
                          <p className="text-xs text-gray-500">{integration.desc}</p>
                        </div>
                      </div>
                      <Button
                        variant={integration.connected ? "outline" : "default"}
                        size="sm"
                        className={`rounded-lg ${!integration.connected ? "bg-[#1e3a5f] hover:bg-[#162d4a]" : ""}`}
                      >
                        {integration.connected ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
    </div>
  );
}
