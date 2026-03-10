"use client";

import React from "react";
import { MaintenanceAlertList } from "@/components/maintenance/MaintenanceAlertList";
import { useQuery } from "@tanstack/react-query";
import { getMaintenanceAlerts } from "@/lib/api/maintenance";
import { Button } from "@/components/ui/button";
import { BellRing, Filter, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MaintenanceAlertsPage() {
  const { data: alertData, isLoading } = useQuery({
    queryKey: ["maintenance-alerts-full"],
    queryFn: () => getMaintenanceAlerts(),
  });

  const alerts = alertData?.data?.alerts || [];
  const overdueCount = alerts.filter(
    (a: any) => a.attributes.alert_type === "overdue",
  ).length;

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/maintenance"
              className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
            >
              Maintenance Command
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              Alerts Inbox
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
            Health <span className="text-rose-600">Signals</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic text-sm">
            Critical event monitoring and real-time failure detection log.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-rose-100 shadow-sm gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest text-center">
                Critical
              </span>
              <span className="text-sm font-black text-rose-600 text-center">
                {overdueCount}
              </span>
            </div>
            <div className="w-px h-8 bg-rose-50" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                Total
              </span>
              <span className="text-sm font-black text-slate-900 text-center">
                {alerts.length}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-slate-200 bg-white shadow-sm font-bold text-xs uppercase tracking-widest px-6 h-12"
          >
            Mark All Resolved
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-8 py-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-slate-400" /> Active Alert
                  Stream
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-400"
                >
                  <Filter className="h-3.5 w-3.5 mr-2" /> All Priority
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <MaintenanceAlertList alerts={alerts} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-slate-900 text-white">
            <CardHeader className="border-b border-white/5 bg-white/5 py-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/50">
                Maintenance Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  Auto-Alert Trigger
                </p>
                <p className="text-xs font-bold leading-relaxed">
                  Alerts are generated 7 days or 500KM before the scheduled
                  target.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                  Escalation
                </p>
                <p className="text-xs font-bold leading-relaxed">
                  Overdue items are marked CRITICAL and highlighted in the
                  Command Center.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="9 5l7 7-7 7"
      />
    </svg>
  );
}
