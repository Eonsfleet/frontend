"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as reportsApi from "@/lib/api/reports";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

const REPORT_TYPE_GROUPS = [
  {
    group: "Fleet Utilization",
    options: [
      { value: "fleet.utilization-summary", label: "Fleet Utilization Summary" },
      { value: "fleet.vehicle-list", label: "Vehicle List & Utilization %" },
      { value: "fleet.availability-snapshot", label: "Fleet Availability Snapshot" },
      { value: "fleet.top-vehicles", label: "Top Vehicles by Trips" },
      { value: "fleet.asset-performance", label: "Asset Performance (Top/Bottom)" },
    ],
  },
  {
    group: "Driver Performance",
    options: [
      { value: "drivers.trip-summary", label: "Driver Trip Summary" },
      { value: "drivers.top-by-trips", label: "Top Drivers by Trip Count" },
      { value: "drivers.compliance", label: "Driver Document Compliance" },
      { value: "drivers.incident-history", label: "Driver Incident History" },
    ],
  },
  {
    group: "Fuel Management",
    options: [
      { value: "fuel.consumption-report", label: "Fuel Consumption Report" },
      { value: "fuel.cost-report", label: "Fuel Cost Report" },
      { value: "fuel.efficiency-report", label: "Fuel Efficiency Report" },
      { value: "fuel.anomaly-report", label: "Fuel Anomaly Report" },
    ],
  },
  {
    group: "Maintenance",
    options: [
      { value: "maintenance.schedule-compliance", label: "Schedule Compliance" },
      { value: "maintenance.cost-report", label: "Maintenance Cost Report" },
      { value: "maintenance.workflow-report", label: "Workflow Status Report" },
      { value: "maintenance.workshop-summary", label: "Workshop Summary" },
    ],
  },
  {
    group: "Incidents",
    options: [
      { value: "incidents.summary", label: "Incident Summary" },
      { value: "incidents.type-distribution", label: "Incident Type Distribution" },
      { value: "incidents.by-vehicle", label: "Incidents by Vehicle" },
    ],
  },
];

const ALL_REPORT_TYPES = REPORT_TYPE_GROUPS.flatMap((g) => g.options);

const FILTER_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last 365 Days" },
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
  label: `${i + 1}${[, "st", "nd", "rd"][((i + 1) % 10 < 4 && Math.floor((i + 1) / 10) !== 1) ? (i + 1) % 10 : 0] || "th"}`,
}));

type Frequency = "daily" | "weekly" | "monthly";

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
  return ALL_REPORT_TYPES.find((r) => r.value === type)?.label ?? type.replace(/[._]/g, " ");
}

function getFilterLabel(filter: string) {
  return FILTER_OPTIONS.find((f) => f.value === filter)?.label ?? filter;
}

function getFormatIcon(fmt: string) {
  if (fmt === "pdf") return <FileText className="w-4 h-4 text-rose-500" />;
  return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
}

function getFrequencyBadgeLabel(schedule: any) {
  if (schedule.frequency === "weekly" && schedule.day_of_week) {
    const day = DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label ?? "";
    return `Weekly · ${day}`;
  }
  if (schedule.frequency === "monthly" && schedule.day_of_month) {
    return `Monthly · Day ${schedule.day_of_month}`;
  }
  return schedule.frequency?.charAt(0).toUpperCase() + schedule.frequency?.slice(1);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsCentralPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["scheduled-reports", page],
    queryFn: () => reportsApi.getScheduledReports({ page, per_page: 10 }),
  });

  const reports: any[] = reportsData?.data ?? (Array.isArray(reportsData) ? reportsData : []);
  const totalReports: number = reportsData?.total ?? reports.length;
  const lastPage: number = reportsData?.last_page ?? 1;
  const activeCount = reports.filter((r: any) => r.is_active).length;

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: any) => reportsApi.createScheduledReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      setIsCreateOpen(false);
      setFormData(DEFAULT_FORM);
      toast.success("Report schedule created successfully");
    },
    onError: () => toast.error("Failed to create schedule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reportsApi.deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Schedule removed");
    },
    onError: () => toast.error("Failed to remove schedule"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      reportsApi.updateScheduledReport(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
    },
    onError: () => toast.error("Failed to update schedule"),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipientsList = formData.recipients
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (recipientsList.length === 0) {
      toast.error("At least one recipient email is required");
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

    if (formData.frequency === "weekly") payload.day_of_week = formData.day_of_week;
    if (formData.frequency === "monthly") payload.day_of_month = formData.day_of_month;

    createMutation.mutate(payload);
  };

  const set = (key: keyof FormState, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
            Reports <span className="text-blue-600">Central</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Automated Intelligence • Scheduled Dispatch • Compliance Storage
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
        >
          <Plus className="h-4 w-4" />
          New Schedule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Schedules</p>
              <h3 className="text-2xl font-black text-slate-900">{totalReports}</h3>
            </div>
          </div>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Schedules</p>
              <h3 className="text-2xl font-black text-slate-900">{activeCount}</h3>
            </div>
          </div>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Types</p>
              <h3 className="text-2xl font-black text-slate-900">{ALL_REPORT_TYPES.length}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
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
          <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
            <Filter className="h-3 w-3 text-slate-400" />
            <span className="text-[9px] font-black text-slate-600 uppercase">Filter</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Report</TableHead>
                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter</TableHead>
                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Frequency</TableHead>
                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipients</TableHead>
                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</TableHead>
                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-50">
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase">No Schedules Yet</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                          Create your first automated report schedule
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((schedule: any) => (
                  <TableRow key={schedule.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                          {getFormatIcon(schedule.format)}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{schedule.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {getReportLabel(schedule.report_type)} · {schedule.format?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-5">
                      <span className="text-[10px] font-black text-slate-600 uppercase">
                        {getFilterLabel(schedule.filter) || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-8 py-5 text-center">
                      <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                        {getFrequencyBadgeLabel(schedule)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-8 py-5">
                      <div className="flex -space-x-2">
                        {schedule.recipients?.slice(0, 3).map((email: string, i: number) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-600 uppercase"
                            title={email}
                          >
                            {email.charAt(0)}
                          </div>
                        ))}
                        {schedule.recipients?.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600">
                            +{schedule.recipients.length - 3}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-5 text-center">
                      <Badge
                        className={cn(
                          "text-[8px] font-black uppercase border-none px-2 py-0.5",
                          schedule.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {schedule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          title={schedule.is_active ? "Pause schedule" : "Activate schedule"}
                          onClick={() => toggleMutation.mutate({ id: schedule.id, is_active: !schedule.is_active })}
                          disabled={toggleMutation.isPending}
                          className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center"
                        >
                          {schedule.is_active
                            ? <ToggleRight className="h-3.5 w-3.5 text-emerald-500" />
                            : <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />
                          }
                        </button>
                        <button
                          title="Delete schedule"
                          onClick={() => {
                            if (confirm(`Delete "${schedule.name}"?`)) {
                              deleteMutation.mutate(schedule.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all flex items-center justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="p-6 border-t border-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Page {page} of {lastPage}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
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

          <form onSubmit={handleSubmit}>
            <div className="p-8 space-y-5 bg-white max-h-[70vh] overflow-y-auto">

              {/* Name */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Schedule Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-black text-slate-900 placeholder:text-slate-300 uppercase italic tracking-tight"
                  placeholder="e.g. Weekly Fuel Digest..."
                />
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Report Type</Label>
                <div className="relative">
                  <select
                    value={formData.report_type}
                    onChange={(e) => set("report_type", e.target.value)}
                    className="w-full h-12 px-4 pr-10 rounded-2xl border border-slate-100 bg-slate-50 text-[11px] font-black uppercase italic tracking-tight appearance-none cursor-pointer"
                  >
                    {REPORT_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Filter + Format */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data Period</Label>
                  <div className="relative">
                    <select
                      value={formData.filter}
                      onChange={(e) => set("filter", e.target.value)}
                      className="w-full h-12 px-4 pr-10 rounded-2xl border border-slate-100 bg-slate-50 text-[11px] font-black uppercase italic tracking-tight appearance-none cursor-pointer"
                    >
                      {FILTER_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Format</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["pdf", "csv"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => set("format", fmt)}
                        className={cn(
                          "h-12 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2",
                          formData.format === fmt
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-100 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                        )}
                      >
                        {fmt === "pdf" ? <FileText className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recipients (comma-separated)</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                  <Input
                    value={formData.recipients}
                    onChange={(e) => set("recipients", e.target.value)}
                    required
                    className="h-12 pl-12 rounded-2xl border-slate-100 bg-slate-50 font-bold text-slate-900 placeholder:text-slate-300"
                    placeholder="finance@company.com, ops@..."
                  />
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Delivery Frequency</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => set("frequency", f)}
                      className={cn(
                        "h-10 rounded-xl border font-black uppercase text-[10px] tracking-widest transition-all",
                        formData.frequency === f
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-slate-100 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of week (weekly only) */}
              {formData.frequency === "weekly" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Send Every</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => set("day_of_week", d.value)}
                        className={cn(
                          "h-9 rounded-xl border font-black uppercase text-[9px] tracking-widest transition-all",
                          formData.day_of_week === d.value
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-100 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                        )}
                      >
                        {d.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of month (monthly only) */}
              {formData.frequency === "monthly" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Send on Day of Month</Label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_MONTH.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => set("day_of_month", d.value)}
                        className={cn(
                          "h-9 w-full rounded-xl border font-black text-[10px] transition-all",
                          formData.day_of_month === d.value
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-100 text-slate-500 hover:border-blue-400 hover:text-blue-600"
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
                onClick={() => { setIsCreateOpen(false); setFormData(DEFAULT_FORM); }}
                className="rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest px-8 shadow-md flex items-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
