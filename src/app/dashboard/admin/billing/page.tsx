"use client";

import { CreditCard, TrendingUp, Users, Receipt, Download, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const invoices = [
  { id: "INV-2026-002", date: "Feb 1, 2026", amount: "$1,944", status: "paid" },
  { id: "INV-2026-001", date: "Jan 1, 2026", amount: "$1,944", status: "paid" },
  { id: "INV-2025-012", date: "Dec 1, 2025", amount: "$1,860", status: "paid" },
  { id: "INV-2025-011", date: "Nov 1, 2025", amount: "$1,860", status: "paid" },
];

export default function AdminBilling() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-1 text-gray-500">Manage your school&apos;s plan and payments</p>
        </div>
        <Button className="bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl">
          <ArrowUpRight className="mr-2 h-4 w-4" /> Upgrade Plan
        </Button>
      </div>

      {/* Current Plan */}
      <Card className="border-2 border-blue-200 shadow-sm bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#1e3a5f] text-white">Professional Plan</Badge>
                <Badge variant="secondary">Active</Badge>
              </div>
              <p className="mt-2 text-sm text-gray-600">$4/student per month &bull; 486 students</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">$1,944<span className="text-sm font-normal text-gray-500">/month</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Next billing date</p>
              <p className="text-lg font-semibold text-gray-900">March 1, 2026</p>
              <p className="text-xs text-gray-400 mt-1">Auto-renewal enabled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Users className="h-5 w-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Student Licenses</p>
                <p className="text-xl font-bold text-gray-900">486 / 500</p>
              </div>
            </div>
            <Progress value={97} className="h-2" />
            <p className="mt-1.5 text-xs text-[#1e3a5f] font-medium">97% used — consider upgrading</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <TrendingUp className="h-5 w-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">AI Credits Used</p>
                <p className="text-xl font-bold text-gray-900">8,420 / 10,000</p>
              </div>
            </div>
            <Progress value={84} className="h-2" />
            <p className="mt-1.5 text-xs text-gray-500">Resets March 1</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <CreditCard className="h-5 w-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Spent (2026)</p>
                <p className="text-xl font-bold text-gray-900">$3,888</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">2 invoices this year</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-400" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-4 px-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                    <Receipt className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{inv.id}</p>
                    <p className="text-xs text-gray-500">{inv.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-gray-900">{inv.amount}</p>
                  <Badge className="bg-blue-100 text-[#1e3a5f]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Paid
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
