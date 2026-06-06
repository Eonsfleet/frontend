"use client";

import React from "react";
import { MaintenanceAlertList } from "@/components/maintenance/MaintenanceAlertList";
import { useQuery } from "@tanstack/react-query";
import { getMaintenanceAlerts } from "@/lib/api/maintenance";
import { Button } from "@/components/ui/button";
import { BellRing, Filter, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MaintenanceAlertsPage() {
  const [page, setPage] = React.useState(1);
  const [perPage] = React.useState(15);

  const { data: alertData, isLoading } = useQuery({
    queryKey: ["maintenance-alerts-full", page, perPage],
    queryFn: () => getMaintenanceAlerts({ page, per_page: perPage }),
  });

  const alerts = alertData?.data?.alerts || [];
  const pagination = alertData?.data?.pagination;
  
  // Calculate metrics based on status (not alert_type)
  const triggeredCount = alerts.filter((a: any) => a.attributes.status === "triggered").length;
  const overdueCount = alerts.filter((a: any) => a.attributes.status === "overdue").length;
  const acknowledgedCount = alerts.filter((a: any) => a.attributes.status === "acknowledged").length;
  const snoozedCount = alerts.filter((a: any) => a.attributes.status === "snoozed").length;

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
                Overdue
              </span>
              <span className="text-sm font-black text-rose-600 text-center">
                {overdueCount}
              </span>
            </div>
            <div className="w-px h-8 bg-rose-50" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest text-center">
                Active
              </span>
              <span className="text-sm font-black text-amber-600 text-center">
                {triggeredCount}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-50" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                Total
              </span>
              <span className="text-sm font-black text-slate-900 text-center">
                {pagination?.total || alerts.length}
              </span>
            </div>
          </div>
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
              <MaintenanceAlertList alerts={alerts} isLoading={isLoading} showAll={true} />
              
              {/* Pagination Controls */}
              {pagination && pagination.last_page > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{" "}
                    {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{" "}
                    {pagination.total} alerts
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.current_page === 1}
                      className="h-9 px-4 font-bold text-xs uppercase tracking-wider"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                        .filter(
                          (pageNum) =>
                            pageNum === 1 ||
                            pageNum === pagination.last_page ||
                            Math.abs(pageNum - pagination.current_page) <= 1
                        )
                        .map((pageNum, idx, arr) => (
                          <React.Fragment key={pageNum}>
                            {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                              <span className="px-2 text-slate-400">...</span>
                            )}
                            <Button
                              variant={pagination.current_page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={`h-9 w-9 font-bold text-xs ${
                                pagination.current_page === pageNum
                                  ? "bg-slate-900 text-white"
                                  : ""
                              }`}
                            >
                              {pageNum}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                      disabled={pagination.current_page === pagination.last_page}
                      className="h-9 px-4 font-bold text-xs uppercase tracking-wider"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-slate-900 text-white">
            <CardHeader className="border-b border-white/5 bg-white/5 py-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/50">
                Alert Workflow
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  Auto-Trigger Thresholds
                </p>
                <p className="text-xs font-bold leading-relaxed">
                  Mileage: 200km before target · Time: 14 days before due date
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                  Auto-Escalation
                </p>
                <p className="text-xs font-bold leading-relaxed">
                  Alerts escalate to OVERDUE after 48 hours without acknowledgment
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  Snooze Policy
                </p>
                <p className="text-xs font-bold leading-relaxed">
                  Must acknowledge first. Snoozed alerts auto-trigger when expired
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 py-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Acknowledged</span>
                <Badge className="bg-emerald-500 text-white">{acknowledgedCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Snoozed</span>
                <Badge className="bg-amber-500 text-white">{snoozedCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Active</span>
                <Badge className="bg-blue-500 text-white">{triggeredCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Overdue</span>
                <Badge className="bg-rose-600 text-white">{overdueCount}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
