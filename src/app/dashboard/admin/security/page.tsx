"use client";

import { Shield, Lock, Eye, Users, FileCheck, AlertTriangle, CheckCircle2, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function AdminSecurity() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security & Compliance</h1>
        <p className="mt-1 text-gray-500">GDPR tools, data controls, and permissions management</p>
      </div>

      {/* Security Score */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Security Score</h2>
              <p className="text-sm text-gray-600">Your school&apos;s security posture</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-[#1e3a5f]">
              92
            </div>
          </div>
          <Progress value={92} className="mt-4 h-3" />
          <p className="mt-2 text-xs text-gray-500">Excellent — 2 minor recommendations pending</p>
        </CardContent>
      </Card>

      {/* Security Checks */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "GDPR Compliant", status: "pass", icon: Shield, desc: "All data handling follows GDPR requirements" },
          { label: "Data Encryption", status: "pass", icon: Lock, desc: "All data encrypted at rest and in transit" },
          { label: "Access Controls", status: "pass", icon: Key, desc: "Role-based access properly configured" },
          { label: "Audit Logging", status: "pass", icon: Eye, desc: "All actions are logged and traceable" },
          { label: "User Permissions", status: "warning", icon: Users, desc: "2 users have excessive permissions" },
          { label: "Data Retention", status: "pass", icon: FileCheck, desc: "Retention policies are up to date" },
        ].map((check) => (
          <Card key={check.label} className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  check.status === "pass" ? "bg-blue-50" : "bg-blue-50"
                }`}>
                  <check.icon className={`h-5 w-5 ${check.status === "pass" ? "text-[#1e3a5f]" : "text-[#1e3a5f]"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{check.label}</p>
                    {check.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 text-[#1e3a5f]" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-[#1e3a5f]" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{check.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Controls */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Data Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { action: "Export All Student Data", desc: "Download complete student records (GDPR compliance)", buttonText: "Export", variant: "outline" as const },
            { action: "Data Deletion Request", desc: "Process a data deletion request for a user", buttonText: "Process", variant: "outline" as const },
            { action: "Audit Log Download", desc: "Download the complete audit log for review", buttonText: "Download", variant: "outline" as const },
            { action: "Reset All Permissions", desc: "Reset all user permissions to default role settings", buttonText: "Reset", variant: "destructive" as const },
          ].map((control) => (
            <div key={control.action} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
              <div>
                <p className="font-medium text-gray-900 text-sm">{control.action}</p>
                <p className="text-xs text-gray-500">{control.desc}</p>
              </div>
              <Button variant={control.variant} size="sm" className="rounded-lg shrink-0">
                {control.buttonText}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
