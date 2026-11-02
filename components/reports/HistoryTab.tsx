"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, History, RotateCw, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as reportsApi from "@/lib/api/reports";
import { getReportLabel } from "@/lib/reports/registry";
import { daysLeft, formatBytes, saveBlob } from "@/lib/reports/download";
import { Chip, EmptyState, GhostButton, StatusBadge } from "./ui";
import type { ReportSettings } from "./ExportDialog";

const PER_PAGE = 15;

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** "Expires in 12 days", or "Expired": downloads are kept for 30 days. */
function Expiry({ expiresAt, status }: { expiresAt?: string | null; status: string }) {
  if (status !== "ready") return <span className="text-slate-400">—</span>;
  const left = daysLeft(expiresAt);
  if (left === null) return <span className="text-slate-400">—</span>;
  if (left <= 0) return <StatusBadge status="expired" />;
  return <span className={left <= 3 ? "text-amber-700 font-semibold" : "text-slate-500"}>Expires in {left} {left === 1 ? "day" : "days"}</span>;
}

export function HistoryTab({ onRerun }: { onRerun: (type: string, settings: ReportSettings) => void }) {
  const [source, setSource] = useState<"exports" | "runs">("exports");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Files are kept for 30 days. After that, run the report again.</p>
        <div className="flex gap-2" role="group" aria-label="History type">
          <Chip active={source === "exports"} onClick={() => setSource("exports")}>Exports</Chip>
          <Chip active={source === "runs"} onClick={() => setSource("runs")}>Template runs</Chip>
        </div>
      </div>
      {source === "exports" ? <ExportHistory onRerun={onRerun} /> : <RunHistory />}
    </div>
  );
}

function Pager({ page, last, onPage }: { page: number; last: number; onPage: (p: number) => void }) {
  if (last <= 1) return null;
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>Page {page} of {last}</span>
      <div className="flex gap-2">
        <GhostButton className="min-h-9 px-3" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></GhostButton>
        <GhostButton className="min-h-9 px-3" disabled={page >= last} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></GhostButton>
      </div>
    </div>
  );
}

interface ExportItem {
  id: number;
  report_type: string;
  title?: string;
  format: string;
  filter?: string;
  /** What the export was made with; absent on exports from before it was kept. */
  params?: { filter?: string; start_date?: string; end_date?: string; vehicle_ids?: number[] } | null;
  status: string;
  file_size_kb?: number;
  created_at?: string;
  expires_at?: string | null;
  error?: string | null;
}

const formatOf = (f: string): ReportSettings["format"] => (f === "pdf" || f === "csv" ? f : "excel");

/** Exactly what the export was made with, as far as it was recorded. */
const settingsOf = (item: ExportItem): ReportSettings => ({
  filter: item.params?.start_date ? undefined : item.params?.filter ?? item.filter,
  start_date: item.params?.start_date,
  end_date: item.params?.end_date,
  vehicle_ids: item.params?.vehicle_ids,
  format: formatOf(item.format),
});

const rangeLabel = (item: ExportItem) => {
  const p = item.params;
  const period = p?.start_date ? `${p.start_date} to ${p.end_date ?? p.start_date}` : p?.filter ?? item.filter ?? "custom range";
  return p?.vehicle_ids?.length ? `${period} · ${p.vehicle_ids.length} ${p.vehicle_ids.length === 1 ? "vehicle" : "vehicles"}` : period;
};

function ExportHistory({ onRerun }: { onRerun: (type: string, settings: ReportSettings) => void }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-history", page],
    queryFn: () => reportsApi.getReportHistory({ page, per_page: PER_PAGE }),
  });
  const items: ExportItem[] = data?.data ?? (Array.isArray(data) ? data : []);
  const total: number = data?.total ?? data?.meta?.total ?? items.length;
  const last = data?.last_page ?? data?.meta?.last_page ?? (Math.ceil(total / PER_PAGE) || 1);

  const remove = useMutation({
    mutationFn: (id: number) => reportsApi.deleteReportHistory(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["report-history"] }); toast.success("Export removed"); },
    onError: () => toast.error("The export could not be removed"),
  });

  const download = async (item: ExportItem) => {
    try {
      const blob = await reportsApi.downloadReportHistory(item.id);
      saveBlob(blob, `${item.report_type}-${item.id}.${item.format === "excel" ? "xlsx" : item.format}`);
    } catch {
      toast.error("This file is no longer available. Run the report again.");
    }
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>;
  if (isError) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 flex items-center justify-between gap-3"><span>History could not be loaded.</span><GhostButton onClick={() => refetch()}>Try again</GhostButton></div>;
  if (items.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white"><EmptyState icon={<History className="h-5 w-5" />} title="No exports yet">Reports you export appear here, so you can run them again in one click.</EmptyState></div>;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item) => {
          const expired = (daysLeft(item.expires_at) ?? 1) <= 0;
          const canDownload = item.status === "ready" && !expired;
          return (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-sm font-bold text-slate-900 truncate">{item.title ?? getReportLabel(item.report_type)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{when(item.created_at)} · {item.format?.toUpperCase()} · {rangeLabel(item)} · {formatBytes(null, item.file_size_kb)}</p>
                {item.status === "failed" && item.error && <p className="text-xs text-rose-600 mt-1">{item.error}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <StatusBadge status={item.status} />
                <Expiry expiresAt={item.expires_at} status={item.status} />
              </div>
              <div className="flex items-center gap-1 ml-auto">
                {canDownload && <GhostButton className="min-h-9 px-3" onClick={() => download(item)}><Download className="h-4 w-4" aria-hidden /> Download</GhostButton>}
                <GhostButton className="min-h-9 px-3" onClick={() => onRerun(item.report_type, settingsOf(item))}>
                  <RotateCw className="h-4 w-4" aria-hidden /> Run again
                </GhostButton>
                <button type="button" aria-label={`Remove ${item.title ?? item.report_type}`} onClick={() => remove.mutate(item.id)} className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>
      <Pager page={page} last={last} onPage={setPage} />
    </div>
  );
}

function RunHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-runs", page],
    queryFn: () => reportsApi.getReportRuns({ page, per_page: PER_PAGE }),
    // A run that is still generating refreshes itself until it is ready or failed.
    refetchInterval: (q) => {
      const rows: reportsApi.ReportRun[] = q.state.data?.data ?? [];
      return rows.some((r) => r.status === "pending" || r.status === "processing") ? 4000 : false;
    },
  });
  const items: reportsApi.ReportRun[] = data?.data ?? [];
  const last = data?.last_page ?? 1;

  const download = async (run: reportsApi.ReportRun) => {
    try {
      saveBlob(await reportsApi.downloadReportRun(run.id), `${run.template_name}.${run.format}`);
    } catch {
      toast.error("This file has expired or is not available. Run the template again.");
    }
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>;
  if (isError) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 flex items-center justify-between gap-3"><span>Template runs could not be loaded.</span><GhostButton onClick={() => refetch()}>Try again</GhostButton></div>;
  if (items.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white"><EmptyState icon={<History className="h-5 w-5" />} title="No template runs yet">Run one of your templates from the Templates tab and its files appear here.</EmptyState></div>;

  return (
    <div className="space-y-3">
      <ul className="space-y-2" aria-live="polite">
        {items.map((run) => {
          const expired = run.status === "ready" && (daysLeft(run.expires_at) ?? 1) <= 0;
          return (
            <li key={run.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-sm font-bold text-slate-900 truncate">{run.template_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{when(run.created_at ?? run.started_at)} · {run.format.toUpperCase()} · {formatBytes(run.file_size_bytes)}</p>
                {run.status === "failed" && <p className="text-xs text-rose-600 mt-1">{run.error_message ?? "Generation failed. Run the template again."}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <StatusBadge status={run.status} />
                <Expiry expiresAt={run.expires_at} status={run.status} />
              </div>
              {run.status === "ready" && !expired && (
                <GhostButton className="min-h-9 px-3 ml-auto" onClick={() => download(run)}><Download className="h-4 w-4" aria-hidden /> Download</GhostButton>
              )}
            </li>
          );
        })}
      </ul>
      <Pager page={page} last={last} onPage={setPage} />
    </div>
  );
}
