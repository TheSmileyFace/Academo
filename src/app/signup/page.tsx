"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, School, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const roles: { value: UserRole; label: string; desc: string }[] = [
    { value: "student", label: "Student", desc: "I have a student invite code" },
    { value: "teacher", label: "Teacher", desc: "I have a teacher invite code" },
    { value: "parent", label: "Parent", desc: "I have a parent invite code" },
    { value: "admin", label: "School Admin", desc: "Setting up a new institution" },
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      let schoolId: string | null = null;
      let classId: string | null = null;

      if (selectedRole === "admin") {
        if (!schoolName.trim()) {
          setError("Please enter your institution name");
          setLoading(false);
          return;
        }
      } else {
        if (!inviteCode.trim()) {
          setError("Please enter your invite code");
          setLoading(false);
          return;
        }

        const { data: invite, error: inviteError } = await supabase
          .from("school_invite_codes")
          .select("*")
          .eq("code", inviteCode.trim())
          .single();

        if (inviteError || !invite) {
          setError("Invalid invite code. Please check with your administrator.");
          setLoading(false);
          return;
        }

        if (invite.role !== selectedRole) {
          setError(`This invite code is for ${invite.role}s, not ${selectedRole}s.`);
          setLoading(false);
          return;
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          setError("This invite code has expired.");
          setLoading(false);
          return;
        }

        if (invite.max_uses && invite.uses_count >= invite.max_uses) {
          setError("This invite code has reached its maximum uses.");
          setLoading(false);
          return;
        }

        schoolId = invite.school_id;
        classId = invite.class_id;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: selectedRole,
            school_name: selectedRole === "admin" ? schoolName : null,
            invite_code: selectedRole !== "admin" ? inviteCode : null,
            school_id: schoolId,
            class_id: classId,
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push(`/login?message=Account created successfully. Please log in.`);
      router.refresh();

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1e3a5f]">
        <div className="relative z-10 flex flex-col justify-center p-16 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-xl">
              A
            </div>
            <span className="text-2xl font-bold tracking-tight">Academo</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Create your account
          </h2>
          <p className="text-base text-slate-300 max-w-md leading-relaxed">
            Join your institution&apos;s portal to access assignments, grades, timetables, and communication tools.
          </p>
          <div className="mt-10 space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              Invite-code based registration
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              Automatic school and class linking
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              Role-specific dashboard access
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a5f] text-white font-bold text-lg">
              A
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Academo</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign Up</h1>
          <p className="text-slate-500 mb-8 text-sm">
            {step === 1 ? "Select your role to get started" : "Enter your details to create your account"}
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-600">{error}</div>
          )}

          {step === 1 ? (
            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => { setSelectedRole(role.value); setError(""); }}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    selectedRole === role.value
                      ? "border-[#1e3a5f] bg-blue-50/50 ring-1 ring-[#1e3a5f]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900 text-sm">{role.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{role.desc}</div>
                </button>
              ))}

              <Button
                onClick={() => setStep(2)}
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#162d4a] text-sm font-semibold mt-4"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-11 border-slate-200 bg-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-slate-200 bg-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-slate-200 bg-white text-sm"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {selectedRole === "admin" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="school" className="text-sm font-medium text-slate-700">Institution Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="school"
                      placeholder="e.g. St. Patrick's Academy"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="pl-10 h-11 border-slate-200 bg-white text-sm"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400">You will configure access controls after account creation.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="invite" className="text-sm font-medium text-slate-700">Invite Code</Label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="invite"
                      placeholder="Enter your invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="pl-10 h-11 border-slate-200 bg-white text-sm"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400">Request this code from your school administrator.</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(1); setError(""); }}
                  className="h-11 px-5 border-slate-300 text-slate-700 text-sm"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 bg-[#1e3a5f] hover:bg-[#162d4a] text-sm font-semibold"
                >
                  {loading ? "Creating account..." : "Create Account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#1e3a5f] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
