"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as reportsApi from "@/lib/api/reports";
import { getReportLabel, periodsFor } from "@/lib/reports/registry";
import { saveBlob } from "@/lib/reports/download";
import { VehiclePicker } from "./VehiclePicker";
import { Chip, GhostButton, PrimaryButton, fieldClass } from "./ui";

export type ExportFormat = "csv" | "excel" | "pdf";

export interface ReportSettings {
  filter?: string;
  start_date?: string;
  end_date?: string;
  vehicle_ids?: number[];
  format?: ExportFormat;
}

const CUSTOM = "custom";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
];

interface Props {
  /** The report to export; the dialog is closed while this is null. */
  type: string | null;
  initial?: ReportSettings;
  /** Whether the report can be limited to chosen vehicles. */
  canScopeVehicles: boolean;
  /** Reports whose catalog entry reads only the last 60 days of telemetry. */
  sixtyDays: boolean;
  onClose: () => void;
  onRan: (type: string) => void;
}

export function ExportDialog({ type, initial, canScopeVehicles, sixtyDays, onClose, onRan }: Props) {
  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto">
        {type && <ExportForm key={type} type={type} initial={initial} canScopeVehicles={canScopeVehicles} sixtyDays={sixtyDays} onClose={onClose} onRan={onRan} />}
      </DialogContent>
    </Dialog>
  );
}

function ExportForm({ type, initial, canScopeVehicles, sixtyDays, onClose, onRan }: Omit<Props, "type"> & { type: string }) {
  const periods = periodsFor(type);
  const [period, setPeriod] = useState(
    initial?.start_date ? CUSTOM : periods.some((p) => p.value === initial?.filter) ? (initial?.filter as string) : "30d",
  );
  const [start, setStart] = useState(initial?.start_date ?? "");
  const [end, setEnd] = useState(initial?.end_date ?? "");
  const [format, setFormat] = useState<ExportFormat>(initial?.format ?? "excel");
  const [scope, setScope] = useState<"all" | "ids">(initial?.vehicle_ids?.length && canScopeVehicles ? "ids" : "all");
  const [vehicleIds, setVehicleIds] = useState<number[]>(initial?.vehicle_ids ?? []);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const custom = period === CUSTOM;
  const filter = custom ? undefined : period;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custom && !start) return setError("Choose the first day of the range.");
    if (custom && end && end < start) return setError("The end date must be on or after the start date.");
    if (canScopeVehicles && scope === "ids" && vehicleIds.length === 0) return setError("Choose at least one vehicle, or export all vehicles.");
    setError(null);
    setExporting(true);
    try {
      const blob = await reportsApi.exportReport({
        report_type: type,
        format,
        filter: custom ? undefined : filter,
        start_date: custom ? start : undefined,
        end_date: custom ? end || start : undefined,
        vehicle_ids: canScopeVehicles && scope === "ids" ? vehicleIds : undefined,
      });
      saveBlob(blob, `${type}-${custom ? start : period}.${format === "excel" ? "xlsx" : format}`);
      toast.success("Report downloaded");
      onRan(type);
      onClose();
    } catch {
      setError("The export failed. Check the dates and try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Export report</DialogTitle>
        <DialogDescription>{getReportLabel(type)}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="export-period" className="text-xs font-bold text-slate-600 block mb-1.5">Period</label>
          <select id="export-period" value={period} onChange={(e) => setPeriod(e.target.value)} className={fieldClass}>
            {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            <option value={CUSTOM}>Custom range</option>
          </select>
          {sixtyDays && <p className="text-xs text-slate-500 mt-1.5">This report reads the last 60 days of telemetry.</p>}
          {custom && (
            <div className="mt-2 flex items-center gap-2">
              <input type="date" aria-label="From" value={start} onChange={(e) => { setStart(e.target.value); if (!end) setEnd(e.target.value); }} className={fieldClass} />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" aria-label="To" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={fieldClass} />
            </div>
          )}
        </div>

        {canScopeVehicles && (
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">Vehicles</p>
            <div className="flex gap-2" role="group" aria-label="Vehicle scope">
              <Chip active={scope === "all"} onClick={() => setScope("all")}>All vehicles</Chip>
              <Chip active={scope === "ids"} onClick={() => setScope("ids")}>Choose vehicles</Chip>
            </div>
            {scope === "ids" && <div className="mt-2"><VehiclePicker ids={vehicleIds} onChange={setVehicleIds} id="export-vehicles" /></div>}
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-slate-600 mb-1.5">Format</p>
          <div className="flex gap-2" role="group" aria-label="Export format">
            {FORMATS.map((f) => (
              <Chip key={f.value} active={format === f.value} onClick={() => setFormat(f.value)}>{f.label}</Chip>
            ))}
          </div>
        </div>

        {error && <p role="alert" className={cn("text-xs font-semibold text-rose-600")}>{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            Export
          </PrimaryButton>
        </div>
      </form>
    </>
  );
}
