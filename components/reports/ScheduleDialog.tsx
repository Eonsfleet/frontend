"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as reportsApi from "@/lib/api/reports";
import { DAYS_OF_WEEK, SCHEDULE_PERIODS, VISIBLE_REPORTS, VISIBLE_REPORT_GROUPS, getReportLabel } from "@/lib/reports/registry";
import type { ReportSettings } from "./ExportDialog";
import { VehiclePicker } from "./VehiclePicker";
import { Chip, GhostButton, PrimaryButton, fieldClass } from "./ui";

export interface ScheduleDraft {
  reportType?: string;
  settings?: ReportSettings;
  /** Set when editing a schedule that exists. */
  existing?: reportsApi.ScheduledReport;
}

type Frequency = "daily" | "weekly" | "monthly";

/** A schedule repeats a rolling period; the nearest one it accepts to what was on screen. */
const nearestPeriod = (filter?: string) => {
  if (!filter) return "30d";
  if (SCHEDULE_PERIODS.some((p) => p.value === filter)) return filter;
  return filter === "1d" ? "7d" : filter === "60d" ? "90d" : "30d";
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ScheduleDialog({ draft, onClose, vehicleTypes }: { draft: ScheduleDraft | null; onClose: () => void; vehicleTypes?: Set<string> }) {
  return (
    <Dialog open={!!draft} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto">
        {draft && <ScheduleForm draft={draft} onClose={onClose} vehicleTypes={vehicleTypes} />}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleForm({ draft, onClose, vehicleTypes }: { draft: ScheduleDraft; onClose: () => void; vehicleTypes?: Set<string> }) {
  const queryClient = useQueryClient();
  const existing = draft.existing;
  const fixedType = existing?.report_type ?? draft.reportType;

  const [name, setName] = useState(existing?.name ?? (draft.reportType ? getReportLabel(draft.reportType) : ""));
  const [reportType, setReportType] = useState(fixedType ?? VISIBLE_REPORTS[0]?.type ?? "gps.trips");
  const [filter, setFilter] = useState(nearestPeriod(existing?.filter ?? draft.settings?.filter));
  const [format, setFormat] = useState<"pdf" | "csv">((existing?.format ?? draft.settings?.format) === "csv" ? "csv" : "pdf");
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? "weekly");
  const [dayOfWeek, setDayOfWeek] = useState(existing?.day_of_week ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(existing?.day_of_month ?? 1);
  const [scope, setScope] = useState<"all" | "ids">(() => {
    const saved = existing?.vehicle_ids;
    if (saved) return saved.length ? "ids" : "all";
    return draft.settings?.vehicle_ids?.length ? "ids" : "all";
  });
  const [vehicleIds, setVehicleIds] = useState<number[]>(() =>
    existing?.vehicle_ids ?? draft.settings?.vehicle_ids ?? []);
  const [deliveryTime, setDeliveryTime] = useState(existing?.delivery_time ?? "07:00");
  const [recipients, setRecipients] = useState<string[]>(existing?.recipients ?? []);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addRecipients = (text: string): string[] => {
    const next = [...recipients];
    for (const part of text.split(/[,\s;]+/).filter(Boolean)) {
      if (!EMAIL.test(part)) { setError(`"${part}" is not a valid email address.`); return next; }
      if (!next.includes(part)) next.push(part);
    }
    setError(null);
    setTyped("");
    setRecipients(next);
    return next;
  };

  const canScopeVehicles = !!vehicleTypes?.has(reportType);

  const save = useMutation({
    mutationFn: (payload: Parameters<typeof reportsApi.createScheduledReport>[0]) =>
      existing ? reportsApi.updateScheduledReport(existing.id, payload) : reportsApi.createScheduledReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success(existing ? "Schedule updated" : "Schedule created");
      onClose();
    },
    onError: () => setError("The schedule could not be saved. Check the details and try again."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const list = typed.trim() ? addRecipients(typed) : recipients;
    if (typed.trim() && list.length === recipients.length) return; // the typed address was rejected
    if (!name.trim()) return setError("Give the schedule a name.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(deliveryTime)) return setError("Choose a delivery time.");
    if (list.length === 0) return setError("Add at least one email address to deliver to.");
    if (canScopeVehicles && scope === "ids" && vehicleIds.length === 0) return setError("Choose at least one vehicle, or schedule for all vehicles.");
    save.mutate({
      name: name.trim(),
      report_type: reportType,
      filter,
      format,
      recipients: list,
      delivery_time: deliveryTime,
      ...(canScopeVehicles ? { vehicle_ids: scope === "ids" ? vehicleIds : null } : {}),
      frequency,
      ...(frequency === "weekly" ? { day_of_week: dayOfWeek } : {}),
      ...(frequency === "monthly" ? { day_of_month: dayOfMonth } : {}),
      is_active: existing?.is_active ?? true,
    });
  };

  const settings = draft.settings;
  const dropped = !existing && (settings?.start_date || (settings?.vehicle_ids?.length && !canScopeVehicles));
  const summary =
    `${getReportLabel(reportType)}${canScopeVehicles && scope === "ids" && vehicleIds.length ? ` for ${vehicleIds.length} ${vehicleIds.length === 1 ? "vehicle" : "vehicles"}` : ""}, covering the last ${SCHEDULE_PERIODS.find((p) => p.value === filter)?.label ?? filter}, ` +
    `emailed as ${format.toUpperCase()} ` +
    (frequency === "daily" ? "every day" : frequency === "weekly" ? `every ${DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label}` : `on day ${dayOfMonth} of each month`) + ` at ${deliveryTime}.`;

  return (
    <>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit schedule" : "Schedule this report"}</DialogTitle>
          <DialogDescription>The report is generated and emailed automatically.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="sch-name" className="text-xs font-bold text-slate-600 block mb-1.5">Name</label>
            <input id="sch-name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} placeholder="Weekly fleet utilization" maxLength={150} />
          </div>

          {!fixedType ? (
            <div>
              <label htmlFor="sch-type" className="text-xs font-bold text-slate-600 block mb-1.5">Report</label>
              <select id="sch-type" value={reportType} onChange={(e) => setReportType(e.target.value)} className={fieldClass}>
                {VISIBLE_REPORT_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Report: <span className="font-bold text-slate-800">{getReportLabel(reportType)}</span></p>
          )}

          <div>
            <label htmlFor="sch-period" className="text-xs font-bold text-slate-600 block mb-1.5">Period each delivery covers</label>
            <select id="sch-period" value={filter} onChange={(e) => setFilter(e.target.value)} className={fieldClass}>
              {SCHEDULE_PERIODS.map((p) => <option key={p.value} value={p.value}>Last {p.label}</option>)}
            </select>
          </div>

          {dropped && (
            <div className="flex gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">
              <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <span>Schedules repeat a rolling period, so custom dates are not saved. This report can only be scheduled for the whole fleet.</span>
            </div>
          )}

          {canScopeVehicles && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-1.5">Vehicles</p>
              <div className="flex gap-2" role="group" aria-label="Vehicle scope">
                <Chip active={scope === "all"} onClick={() => setScope("all")}>All vehicles</Chip>
                <Chip active={scope === "ids"} onClick={() => setScope("ids")}>Choose vehicles</Chip>
              </div>
              {scope === "ids" && <div className="mt-2"><VehiclePicker ids={vehicleIds} onChange={setVehicleIds} id="sch-vehicles" /></div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sch-format" className="text-xs font-bold text-slate-600 block mb-1.5">Format</label>
              <select id="sch-format" value={format} onChange={(e) => setFormat(e.target.value as "pdf" | "csv")} className={fieldClass}>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label htmlFor="sch-freq" className="text-xs font-bold text-slate-600 block mb-1.5">Repeats</label>
              <select id="sch-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={fieldClass}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sch-time" className="text-xs font-bold text-slate-600 block mb-1.5">Delivery time</label>
            <input id="sch-time" type="time" required value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className={fieldClass} />
            <p className="text-[11px] text-slate-500 mt-1">Sent once this time has passed, on the day it is due. Delivered within the hour.</p>
          </div>

          {frequency === "weekly" && (
            <div>
              <label htmlFor="sch-dow" className="text-xs font-bold text-slate-600 block mb-1.5">On</label>
              <select id="sch-dow" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className={fieldClass}>
                {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}
          {frequency === "monthly" && (
            <div>
              <label htmlFor="sch-dom" className="text-xs font-bold text-slate-600 block mb-1.5">On day of month</label>
              <select id="sch-dom" value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))} className={fieldClass}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="sch-to" className="text-xs font-bold text-slate-600 block mb-1.5">Email to</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recipients.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-3 pr-1 py-1 text-xs font-semibold text-slate-700">
                  {r}
                  <button type="button" aria-label={`Remove ${r}`} onClick={() => setRecipients(recipients.filter((x) => x !== r))} className="h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-slate-200 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              id="sch-to"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (typed.trim()) addRecipients(typed); } }}
              onBlur={() => typed.trim() && addRecipients(typed)}
              className={fieldClass}
              placeholder="name@company.com, press Enter to add"
            />
          </div>

          <p className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 leading-relaxed">{summary}</p>

          {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {existing ? "Save changes" : "Create schedule"}
            </PrimaryButton>
          </div>
        </form>
    </>
  );
}
