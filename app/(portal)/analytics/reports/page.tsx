"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Clock,
  Settings,
  Plus,
  Mail,
  Loader2,
  Filter,
  FileSpreadsheet,
  Trash2,
  Calendar,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Download,
  Star,
  History,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as reportsApi from "@/lib/api/reports";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────────

const REPORT_TYPE_GROUPS = [
  {
    group: "Fleet",
    options: [
      {
        value: "fleet.utilization-summary",
        label: "Utilization Rate, Active Vehicles & Distance",
      },
      {
        value: "fleet.vehicle-list",
        label: "Per-Vehicle Utilization & Active Days",
      },
      {
        value: "fleet.availability-snapshot",
        label: "Vehicle Status Snapshot (Available / In-Use / Maintenance)",
      },
      {
        value: "fleet.top-vehicles",
        label: "Top Vehicles by GPS Distance Driven",
      },
      {
        value: "fleet.asset-performance",
        label: "Asset Performance Score (Distance × Activity)",
      },
      {
        value: "fleet.health-score",
        label: "Vehicle Health Score (Maintenance + Fuel)",
      },
      { value: "fleet.opex-trend", label: "Operating Expenditure Trend" },
      {
        value: "fleet.cost-per-km",
        label: "Cost Per KM Trend (Fuel ÷ Distance)",
      },
      {
        value: "fleet.driver-risk",
        label: "Driver Risk Profile (Incident History)",
      },
      {
        value: "fleet.predictive-maintenance",
        label: "Vehicles Approaching Maintenance Thresholds",
      },
    ],
  },
  {
    group: "Drivers",
    options: [
      {
        value: "drivers.trip-summary",
        label: "Per-Driver Activity (Segments, Distance, Fuel)",
      },
      {
        value: "drivers.top-by-trips",
        label: "Top Drivers Ranked by Distance / Segments",
      },
      { value: "drivers.compliance", label: "Driver Compliance Metrics" },
      {
        value: "drivers.incident-history",
        label: "Incident History Per Driver",
      },
      {
        value: "drivers.workload-distribution",
        label: "Workload Distribution (Light / Moderate / Heavy)",
      },
    ],
  },
  {
    group: "Fuel",
    options: [
      {
        value: "fuel.consumption-report",
        label: "Fuel Consumption Totals & Trend",
      },
      { value: "fuel.cost-report", label: "Fuel Cost Analysis" },
      {
        value: "fuel.efficiency-report",
        label: "L/100km Efficiency Per Vehicle",
      },
      {
        value: "fuel.anomaly-report",
        label: "Fuel Anomalies (Theft Risk, Overconsumption)",
      },
      { value: "fuel.usage-report", label: "Daily Fuel Usage Per Vehicle" },
    ],
  },
  {
    group: "Maintenance",
    options: [
      {
        value: "maintenance.schedule-compliance",
        label: "On-Time vs Overdue Maintenance Compliance",
      },
      {
        value: "maintenance.cost-report",
        label: "Maintenance Spend Breakdown",
      },
      {
        value: "maintenance.workflow-report",
        label: "Maintenance Job Workflow Status",
      },
      {
        value: "maintenance.workshop-summary",
        label: "Workshop Throughput & Job Status",
      },
    ],
  },
  {
    group: "Incidents",
    options: [
      {
        value: "incidents.summary",
        label: "Total Incidents — Open vs Resolved",
      },
      {
        value: "incidents.type-distribution",
        label: "Incidents Broken Down by Type",
      },
      { value: "incidents.by-vehicle", label: "Incident Count Per Vehicle" },
    ],
  },
  {
    group: "GPS & Routes",
    options: [
      {
        value: "gps.driving-summary",
        label: "Trip Summary (Distance, Active Vehicles, Segments)",
      },
      {
        value: "gps.distance-report",
        label: "Distance Trend + Top Vehicles by Distance",
      },
      {
        value: "gps.top-by-distance",
        label: "Ranked Vehicles by Total KM Driven",
      },
      {
        value: "gps.device-status",
        label: "Device Online / Offline / Connected Counts",
      },
    ],
  },
  {
    group: "Insights (AI)",
    options: [
      {
        value: "insights.anomalies",
        label: "All Detected Anomalies (Fuel, Driver, Vehicle, Efficiency)",
      },
    ],
  },
];

const ALL_REPORT_TYPES = REPORT_TYPE_GROUPS.flatMap((g) => g.options);

const FILTER_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last 12 Months" },
];

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`,
}));

type Frequency = "daily" | "weekly" | "monthly";
type Format = "pdf" | "csv" | "excel";
type Tab = "export" | "scheduled" | "history";

interface FormState {
  name: string;
  report_type: string;
  filter: string;
  format: "pdf" | "csv";
  recipients: string;
  frequency: Frequency;
  day_of_week: number;
  day_of_month: number;
}

const DEFAULT_FORM: FormState = {
  name: "",
  report_type: "fleet.utilization-summary",
  filter: "30d",
  format: "pdf",
  recipients: "",
  frequency: "weekly",
  day_of_week: 1,
  day_of_month: 1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getReportLabel(type: string) {
  return (
    ALL_REPORT_TYPES.find((r) => r.value === type)?.label ??
    type.replace(/[._]/g, " ")
  );
}

function getFilterLabel(filter: string) {
  return FILTER_OPTIONS.find((f) => f.value === filter)?.label ?? filter;
}

function getFormatIcon(fmt: string) {
  if (fmt === "pdf") return <FileText className="w-3.5 h-3.5 text-rose-500" />;
  if (fmt === "excel")
    return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />;
  return <FileText className="w-3.5 h-3.5 text-blue-500" />;
}

function getFrequencyLabel(schedule: any) {
  if (schedule.frequency === "weekly" && schedule.day_of_week) {
    const day =
      DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label ?? "";
    return `Weekly · ${day}`;
  }
  if (schedule.frequency === "monthly" && schedule.day_of_month) {
    return `Monthly · Day ${schedule.day_of_month}`;
  }
  return (
    schedule.frequency?.charAt(0).toUpperCase() + schedule.frequency?.slice(1)
  );
}

function formatFileSize(kb: number) {
  if (!kb) return "—";
  if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

async function blobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsCentralPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("export");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);
  const [scheduleToDelete, setScheduleToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Export form state
  const [exportType, setExportType] = useState("fleet.utilization-summary");
  const [exportFilter, setExportFilter] = useState("30d");
  const [exportFormat, setExportFormat] = useState<Format>("excel");
  const [isExporting, setIsExporting] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: recommendedData } = useQuery({
    queryKey: ["recommended-reports"],
    queryFn: () => reportsApi.getRecommendedReports(),
    enabled: tab === "export",
  });

  const { data: scheduledData, isLoading: isScheduledLoading } = useQuery({
    queryKey: ["scheduled-reports", scheduledPage],
    queryFn: () =>
      reportsApi.getScheduledReports({ page: scheduledPage, per_page: 10 }),
    enabled: tab === "scheduled",
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["report-history", historyPage],
    queryFn: () =>
      reportsApi.getReportHistory({ page: historyPage, per_page: 20 }),
    enabled: tab === "history",
  });

  const scheduledReports: any[] =
    scheduledData?.data ?? (Array.isArray(scheduledData) ? scheduledData : []);
  const scheduledTotal: number =
    scheduledData?.meta?.total ??
    scheduledData?.total ??
    scheduledReports.length;
  const scheduledLastPage: number = Math.ceil(scheduledTotal / 10) || 1;

  const historyItems: any[] =
    historyData?.data ?? (Array.isArray(historyData) ? historyData : []);
  const historyTotal: number =
    historyData?.meta?.total ?? historyData?.total ?? historyItems.length;
  const historyLastPage: number = Math.ceil(historyTotal / 20) || 1;

  const recommendations: any[] =
    recommendedData?.recommendations ??
    (Array.isArray(recommendedData) ? recommendedData : []);

  // ── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: any) => reportsApi.createScheduledReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      setIsCreateOpen(false);
      setFormData(DEFAULT_FORM);
      toast.success("Report schedule created");
    },
    onError: () => toast.error("Failed to create schedule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reportsApi.deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Schedule removed");
      setScheduleToDelete(null);
    },
    onError: () => toast.error("Failed to remove schedule"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      reportsApi.updateScheduledReport(id, { is_active }),
    onSuccess: (_data, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success(is_active ? "Schedule activated" : "Schedule paused");
    },
    onError: () => toast.error("Failed to update schedule"),
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (id: number) => reportsApi.deleteReportHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-history"] });
      toast.success("Report deleted");
    },
    onError: () => toast.error("Failed to delete report"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportReport({
        report_type: exportType,
        format: exportFormat,
        filter: exportFilter as any,
      });
      const ext = exportFormat === "excel" ? "xlsx" : exportFormat;
      await blobDownload(blob, `${exportType}-${exportFilter}.${ext}`);
      toast.success("Report downloaded");
      // Refresh history if on history tab
      queryClient.invalidateQueries({ queryKey: ["report-history"] });
    } catch {
      toast.error("Export failed — check report type and try again");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadHistory = async (item: any) => {
    try {
      const blob = await reportsApi.downloadReportHistory(item.id);
      const ext = item.format === "excel" ? "xlsx" : item.format;
      await blobDownload(
        blob,
        `${item.report_type ?? "report"}-${item.id}.${ext}`,
      );
    } catch {
      toast.error("Download failed");
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipientsList = formData.recipients
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    if (!recipientsList.length) {
      toast.error("At least one recipient required");
      return;
    }
    const payload: any = {
      name: formData.name,
      report_type: formData.report_type,
      filter: formData.filter,
      format: formData.format,
      recipients: recipientsList,
      frequency: formData.frequency,
      is_active: true,
    };
    if (formData.frequency === "weekly")
      payload.day_of_week = formData.day_of_week;
    if (formData.frequency === "monthly")
      payload.day_of_month = formData.day_of_month;
    createMutation.mutate(payload);
  };

  const set = (key: keyof FormState, value: any) =>
    setFormData((p) => ({ ...p, [key]: value }));

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
            Reports <span className="text-blue-600">Central</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            On-Demand Exports • Scheduled Dispatch • Download History
          </p>
        </div>
        {tab === "scheduled" && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            <Plus className="h-4 w-4" />
            New Schedule
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
        {(
          [
            { id: "export", label: "On-Demand Export", icon: Download },
            { id: "scheduled", label: "Scheduled Reports", icon: Clock },
            { id: "history", label: "Report History", icon: History },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              tab === t.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: On-Demand Export ─────────────────────────────────── */}
      {tab === "export" && (
        <div className="space-y-6">
          {/* Export Form */}
          <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Generate Report
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                Select a report type, period, and format then download instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              {/* Report Type */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Report Type
                </Label>
                <div className="relative">
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value)}
                    className="w-full h-12 px-4 pr-10 rounded-2xl border border-slate-200 bg-slate-50 text-[11px] font-black uppercase italic tracking-tight appearance-none cursor-pointer focus:outline-none focus:border-blue-400"
                  >
                    {REPORT_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Period */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Data Period
                  </Label>
                  <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setExportFilter(opt.value)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          exportFilter === opt.value
                            ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                            : "text-slate-400 hover:text-slate-600",
                        )}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Format
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["excel", "pdf", "csv"] as Format[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportFormat(fmt)}
                        className={cn(
                          "h-12 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2",
                          exportFormat === fmt
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-100 text-slate-500 hover:border-blue-400 hover:text-blue-600",
                        )}
                      >
                        {getFormatIcon(fmt)}
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-3 px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {isExporting ? "Preparing Download..." : "Generate & Download"}
              </button>
            </CardContent>
          </Card>

          {/* Recommended Reports */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Recommended Reports
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recommendations.map((rec: any) => (
                  <Card
                    key={rec.id}
                    className="border-slate-200 shadow-sm bg-white rounded-[24px] overflow-hidden hover:border-blue-300 transition-all cursor-pointer group"
                    onClick={() => {
                      setExportType(rec.report_type ?? rec.type ?? exportType);
                      setExportFormat(rec.format ?? "excel");
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Star className="h-4 w-4 text-blue-500" />
                        </div>
                        {rec.is_created && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase">
                            Scheduled
                          </Badge>
                        )}
                        {rec.priority === "high" && !rec.is_created && (
                          <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                        {rec.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        {rec.description ?? rec.use_case}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase">
                          {rec.frequency}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase">
                          {rec.format?.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Scheduled Reports ────────────────────────────────── */}
      {tab === "scheduled" && (
        <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Report Schedules
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                Automated dispatches configured for your stakeholders
              </CardDescription>
            </div>
          </CardHeader>
          {isScheduledLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Report
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Period
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Frequency
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Recipients
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Status
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-50">
                  {scheduledReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase">
                              No Schedules Yet
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                              Click "New Schedule" to automate report delivery
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduledReports.map((s: any) => (
                      <TableRow
                        key={s.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                              {getFormatIcon(s.format)}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase">
                                {s.name}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">
                                {getReportLabel(s.report_type)} ·{" "}
                                {s.format?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-5">
                          <span className="text-[10px] font-black text-slate-600 uppercase">
                            {getFilterLabel(s.filter) || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-center">
                          <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase">
                            {getFrequencyLabel(s)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-5">
                          <div className="flex -space-x-2">
                            {s.recipients
                              ?.slice(0, 3)
                              .map((email: string, i: number) => (
                                <div
                                  key={i}
                                  title={email}
                                  className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-600 uppercase"
                                >
                                  {email.charAt(0)}
                                </div>
                              ))}
                            {s.recipients?.length > 3 && (
                              <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600">
                                +{s.recipients.length - 3}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-center">
                          <Badge
                            className={cn(
                              "text-[8px] font-black uppercase border-none",
                              s.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {s.is_active ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                toggleMutation.mutate({
                                  id: s.id,
                                  is_active: !s.is_active,
                                })
                              }
                              className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all"
                            >
                              {s.is_active ? (
                                <ToggleRight className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                setScheduleToDelete({ id: s.id, name: s.name })
                              }
                              className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {scheduledLastPage > 1 && (
            <div className="p-6 border-t border-slate-50 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase">
                Page {scheduledPage} of {scheduledLastPage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduledPage((p) => Math.max(1, p - 1))}
                  disabled={scheduledPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-500 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setScheduledPage((p) => Math.min(scheduledLastPage, p + 1))
                  }
                  disabled={scheduledPage === scheduledLastPage}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-500 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab 3: Report History ───────────────────────────────────── */}
      {tab === "history" && (
        <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Download History
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                Previously generated reports — retained for 30 days
              </CardDescription>
            </div>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["report-history"] })
              }
              className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </CardHeader>
          {isHistoryLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Report
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Period
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Format
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Size
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Status
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Generated
                    </TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-50">
                  {historyItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <History className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase">
                              No Reports Yet
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                              Generate a report from the "On-Demand Export" tab
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyItems.map((item: any) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                              {getFormatIcon(item.format)}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase">
                                {item.title ?? getReportLabel(item.report_type)}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">
                                {getReportLabel(item.report_type)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-5">
                          <span className="text-[10px] font-black text-slate-600 uppercase">
                            {getFilterLabel(item.filter) || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-center">
                          <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase">
                            {item.format?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-center">
                          <span className="text-[10px] font-bold text-slate-500">
                            {formatFileSize(item.file_size_kb)}
                          </span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-center">
                          <Badge
                            className={cn(
                              "text-[8px] font-black uppercase border-none",
                              item.status === "ready"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.status === "processing"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700",
                            )}
                          >
                            {item.status ?? "ready"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-5">
                          <span className="text-[10px] font-bold text-slate-500">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {item.status === "ready" && (
                              <button
                                onClick={() => handleDownloadHistory(item)}
                                className="h-8 w-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-all"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5 text-blue-600" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm("Delete this report?"))
                                  deleteHistoryMutation.mutate(item.id);
                              }}
                              className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-all"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {historyLastPage > 1 && (
            <div className="p-6 border-t border-slate-50 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase">
                Page {historyPage} of {historyLastPage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-500 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setHistoryPage((p) => Math.min(historyLastPage, p + 1))
                  }
                  disabled={historyPage === historyLastPage}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-500 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Create Schedule Dialog ──────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden max-w-xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="text-xl font-black uppercase italic">
              Create <span className="text-blue-400">Schedule</span>
            </DialogTitle>
            <DialogDescription className="text-blue-100/60 font-medium uppercase text-[10px] tracking-widest mt-1">
              Automate generation and delivery of fleet intelligence
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit}>
            <div className="p-8 space-y-5 bg-white max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Schedule Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-black text-slate-900 placeholder:text-slate-300 uppercase italic"
                  placeholder="e.g. Weekly Fuel Digest..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Report Type
                </Label>
                <div className="relative">
                  <select
                    value={formData.report_type}
                    onChange={(e) => set("report_type", e.target.value)}
                    className="w-full h-12 px-4 pr-10 rounded-2xl border border-slate-100 bg-slate-50 text-[11px] font-black uppercase italic appearance-none cursor-pointer"
                  >
                    {REPORT_TYPE_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Data Period
                  </Label>
                  <div className="relative">
                    <select
                      value={formData.filter}
                      onChange={(e) => set("filter", e.target.value)}
                      className="w-full h-12 px-4 pr-10 rounded-2xl border border-slate-100 bg-slate-50 text-[11px] font-black uppercase italic appearance-none cursor-pointer"
                    >
                      {FILTER_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Format
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["pdf", "csv"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => set("format", fmt)}
                        className={cn(
                          "h-12 rounded-2xl border font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all",
                          formData.format === fmt
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-100 text-slate-500 hover:border-blue-400",
                        )}
                      >
                        {getFormatIcon(fmt)}
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Recipients (comma-separated)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                  <Input
                    value={formData.recipients}
                    onChange={(e) => set("recipients", e.target.value)}
                    required
                    className="h-12 pl-12 rounded-2xl border-slate-100 bg-slate-50"
                    placeholder="finance@company.com, ops@..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Delivery Frequency
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => set("frequency", f)}
                      className={cn(
                        "h-10 rounded-xl border font-black uppercase text-[10px] transition-all",
                        formData.frequency === f
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-slate-100 text-slate-600 hover:border-blue-400",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {formData.frequency === "weekly" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Send Every
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => set("day_of_week", d.value)}
                        className={cn(
                          "h-9 rounded-xl border font-black uppercase text-[9px] transition-all",
                          formData.day_of_week === d.value
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-100 text-slate-500 hover:border-blue-400",
                        )}
                      >
                        {d.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {formData.frequency === "monthly" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Send on Day of Month
                  </Label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_MONTH.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => set("day_of_month", d.value)}
                        className={cn(
                          "h-9 rounded-xl border font-black text-[10px] transition-all",
                          formData.day_of_month === d.value
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-100 text-slate-500 hover:border-blue-400",
                        )}
                      >
                        {d.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsCreateOpen(false);
                  setFormData(DEFAULT_FORM);
                }}
                className="rounded-xl text-[10px] font-black uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl text-[10px] font-black uppercase px-8 shadow-md flex items-center gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!scheduleToDelete}
        onOpenChange={(open) => {
          if (!open) setScheduleToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete scheduled report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete
              {scheduleToDelete?.name
                ? ` "${scheduleToDelete.name}"`
                : " this report"}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setScheduleToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              No
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                scheduleToDelete && deleteMutation.mutate(scheduleToDelete.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Yes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
