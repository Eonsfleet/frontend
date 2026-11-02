"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Mail, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import * as reportsApi from "@/lib/api/reports";
import { DAYS_OF_WEEK, SCHEDULE_PERIODS, getReportLabel } from "@/lib/reports/registry";
import type { ScheduleDraft } from "./ScheduleDialog";
import { EmptyState, GhostButton, PrimaryButton, StatusBadge } from "./ui";

const PER_PAGE = 10;

const cadence = (s: reportsApi.ScheduledReport) =>
  (s.frequency === "weekly"
    ? `Weekly on ${DAYS_OF_WEEK.find((d) => d.value === s.day_of_week)?.label ?? "Monday"}`
    : s.frequency === "monthly"
      ? `Monthly on day ${s.day_of_month ?? 1}`
      : "Every day") + (s.delivery_time ? ` at ${s.delivery_time}` : "");

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export function SchedulesTab({ onEdit }: { onEdit: (draft: ScheduleDraft) => void }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<reportsApi.ScheduledReport | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["scheduled-reports", page],
    queryFn: () => reportsApi.getScheduledReports({ page, per_page: PER_PAGE }),
    // A send in progress settles within a minute or so: keep looking until it does.
    refetchInterval: (query) => {
      const d = query.state.data;
      const list: reportsApi.ScheduledReport[] = d?.data ?? (Array.isArray(d) ? d : []);
      return list.some((s) => s.last_status === "queued") ? 4000 : false;
    },
  });

  const items: reportsApi.ScheduledReport[] = data?.data ?? (Array.isArray(data) ? data : []);
  const total: number = data?.total ?? data?.meta?.total ?? items.length;
  const lastPage = data?.last_page ?? data?.meta?.last_page ?? (Math.ceil(total / PER_PAGE) || 1);

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => reportsApi.updateScheduledReport(id, { is_active }),
    onSuccess: (_d, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success(is_active ? "Schedule resumed" : "Schedule paused");
    },
    onError: () => toast.error("The schedule could not be updated"),
  });

  const sendNow = useMutation({
    mutationFn: (id: number) => reportsApi.runScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Sending now. The status updates here when it finishes.");
    },
    onError: () => toast.error("The report could not be queued. Try again in a moment."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => reportsApi.deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Schedule deleted");
      setToDelete(null);
    },
    onError: () => toast.error("The schedule could not be deleted"),
  });

  const newButton = (
    <PrimaryButton onClick={() => onEdit({})}><Plus className="h-4 w-4" aria-hidden /> New schedule</PrimaryButton>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Reports delivered to your team by email, on repeat. To schedule a report with its settings already filled in, open it and choose Schedule.</p>
        <div className="hidden sm:block shrink-0">{newButton}</div>
      </div>
      <div className="sm:hidden">{newButton}</div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 flex items-center justify-between gap-3">
          <span>Schedules could not be loaded.</span>
          <GhostButton onClick={() => refetch()}>Try again</GhostButton>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
          <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No schedules yet" action={newButton}>
            Schedule a report once and it arrives by email every day, week or month.
          </EmptyState>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{s.name}</p>
                    <StatusBadge status={s.is_active ? "active" : "paused"} />
                    {s.last_status && <StatusBadge status={s.last_status} />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{getReportLabel(s.report_type)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(checked) => toggle.mutate({ id: s.id, is_active: checked })}
                    aria-label={s.is_active ? `Pause ${s.name}` : `Resume ${s.name}`}
                  />
                  <button
                    type="button"
                    aria-label={`Send ${s.name} now`}
                    title={s.last_status === "failed" ? "Retry now" : "Send now"}
                    disabled={sendNow.isPending || s.last_status === "queued"}
                    onClick={() => sendNow.mutate(s.id)}
                    className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {s.last_status === "queued" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                  <button type="button" aria-label={`Edit ${s.name}`} onClick={() => onEdit({ existing: s })} className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label={`Delete ${s.name}`} onClick={() => setToDelete(s)} className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-slate-400 font-semibold">Repeats</dt><dd className="text-slate-800 font-bold mt-0.5">{cadence(s)}</dd></div>
                <div><dt className="text-slate-400 font-semibold">Covers</dt><dd className="text-slate-800 font-bold mt-0.5">Last {SCHEDULE_PERIODS.find((p) => p.value === s.filter)?.label ?? s.filter ?? "30 days"} · {s.format?.toUpperCase()}</dd></div>
                <div><dt className="text-slate-400 font-semibold">Last delivered</dt><dd className="text-slate-800 font-bold mt-0.5">{s.last_delivered_at ? new Date(s.last_delivered_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not yet"}</dd></div>
                <div><dt className="text-slate-400 font-semibold">Sent to</dt><dd className="text-slate-800 font-bold mt-0.5 flex items-center gap-1.5 min-w-0"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /><span className="truncate">{(s.recipients ?? []).join(", ") || "—"}</span></dd></div>
              </dl>
              {s.last_status === "failed" && (
                <p role="alert" className="mt-3 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-900">
                  The last delivery failed{s.last_attempted_at ? ` on ${when(s.last_attempted_at)}` : ""}{s.last_error ? `: ${s.last_error}` : "."} It is tried again at the next hourly run, or use Send now.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {lastPage}</span>
          <div className="flex gap-2">
            <GhostButton className="min-h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></GhostButton>
            <GhostButton className="min-h-9 px-3" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></GhostButton>
          </div>
        </div>
      )}

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this schedule?</DialogTitle>
            <DialogDescription>{toDelete?.name} will stop being emailed. Reports already delivered are not affected.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setToDelete(null)}>Keep it</GhostButton>
            <button type="button" disabled={remove.isPending} onClick={() => toDelete && remove.mutate(toDelete.id)} className="min-h-10 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer">
              Delete schedule
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
