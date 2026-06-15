"use client";

import { useState } from "react";
import { MaintenanceAlertList } from "@/components/maintenance/MaintenanceAlertList";
import { useQuery } from "@tanstack/react-query";
import { getMaintenanceAlerts } from "@/lib/api/maintenance";
import { getPolicies } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { BellRing, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
    { value: "",                  label: "All" },
    { value: "triggered",         label: "Triggered" },
    { value: "overdue",           label: "Overdue" },
    { value: "acknowledged",      label: "Acknowledged" },
    { value: "snoozed",           label: "Snoozed" },
    { value: "work_order_created", label: "Work Order" },
] as const;

const PER_PAGE = 10;

export default function MaintenanceAlertsPage() {
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);

    const { data: alertData, isLoading } = useQuery({
        queryKey: ["maintenance-alerts-full", statusFilter, page],
        queryFn: () =>
            getMaintenanceAlerts({
                status: statusFilter || undefined,
                page,
                per_page: PER_PAGE,
            }),
    });

    const { data: policyData } = useQuery({
        queryKey: ["org-policies"],
        queryFn: getPolicies,
    });

    const alerts = alertData?.data?.alerts ?? [];
    const pagination = alertData?.data?.pagination;
    const overdueCount = alerts.filter(
        (a: any) => a.attributes.status === "overdue"
    ).length;
    const policy = policyData?.data;

    const handleTabChange = (value: string) => {
        setStatusFilter(value);
        setPage(1);
    };

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
                            {pagination?.total ?? alerts.length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-4">
                    {/* Status filter tabs */}
                    <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex flex-wrap gap-1">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => handleTabChange(tab.value)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    statusFilter === tab.value
                                        ? "bg-white text-slate-900 shadow-lg"
                                        : "text-slate-400 hover:text-slate-700"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-8 py-6">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <BellRing className="h-4 w-4 text-slate-400" />
                                Active Alert Stream
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <MaintenanceAlertList alerts={alerts} isLoading={isLoading} />
                        </CardContent>
                    </Card>

                    {pagination && pagination.last_page > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="text-[10px] font-black uppercase tracking-widest border-slate-200 h-9"
                            >
                                <ChevronLeft className="h-3 w-3 mr-1" /> Prev
                            </Button>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Page {page} of {pagination.last_page}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === pagination.last_page}
                                onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                                className="text-[10px] font-black uppercase tracking-widest border-slate-200 h-9"
                            >
                                Next <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                        </div>
                    )}
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
                                    {policy
                                        ? `Alerts generated ${policy.maintenance_approaching_days} days or ${policy.maintenance_approaching_km} km before scheduled target.`
                                        : "Loading policy…"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                                    Escalation Window
                                </p>
                                <p className="text-xs font-bold leading-relaxed">
                                    {policy
                                        ? `Unacknowledged alerts escalate after ${policy.maintenance_escalation_hours}h.`
                                        : "Loading policy…"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
