"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Columns3, Loader2, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import * as reportsApi from "@/lib/api/reports";
import { VehiclePicker } from "./VehiclePicker";
import { Chip, EmptyState, GhostButton, PrimaryButton, fieldClass } from "./ui";

const TYPE_LABEL: Record<string, string> = {
  trip: "Trips (start and end, places, distance)",
  vehicle: "Vehicle readings (every GPS point)",
  driver: "Driver activity",
};
/** Report types whose rows belong to vehicles, so a run can be limited to chosen ones. */
const VEHICLE_TYPES = new Set(["vehicle", "trip"]);
const typeLabel = (key: string, fallback?: string) => TYPE_LABEL[key] ?? fallback ?? key;
const MAX_DAYS = 31;
const PERIOD_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };

export function TemplatesTab({ onRunQueued }: { onRunQueued: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<reportsApi.ReportTemplate | "new" | null>(null);
  const [running, setRunning] = useState<reportsApi.ReportTemplate | null>(null);
  const [toDelete, setToDelete] = useState<reportsApi.ReportTemplate | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => reportsApi.getReportTemplates({ per_page: 50 }),
  });
  const templates: reportsApi.ReportTemplate[] = data?.data ?? [];

  const remove = useMutation({
    mutationFn: (id: number) => reportsApi.deleteReportTemplate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["report-templates"] }); toast.success("Template deleted"); setToDelete(null); },
    onError: () => toast.error("The template could not be deleted"),
  });

  const newButton = <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden /> New template</PrimaryButton>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Save the columns you care about once, then run the template for any period.</p>
        <div className="hidden sm:block shrink-0">{newButton}</div>
      </div>
      <div className="sm:hidden">{newButton}</div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 flex items-center justify-between gap-3"><span>Templates could not be loaded.</span><GhostButton onClick={() => refetch()}>Try again</GhostButton></div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
          <EmptyState icon={<Columns3 className="h-5 w-5" />} title="No templates yet" action={newButton}>
            Pick a report type, choose and order its columns, and save it. Running it gives you a CSV or Excel file with just those columns.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
              <div>
                <p className="text-[11px] font-bold text-blue-600">{typeLabel(t.report_type)}</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{t.name}</p>
                <p className="text-xs text-slate-500 mt-1">{t.columns.length} {t.columns.length === 1 ? "column" : "columns"}</p>
              </div>
              <div className="mt-auto flex items-center gap-1">
                <PrimaryButton className="min-h-9 px-3 flex-1" onClick={() => setRunning(t)}><Play className="h-4 w-4" aria-hidden /> Run</PrimaryButton>
                <button type="button" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)} className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label={`Delete ${t.name}`} onClick={() => setToDelete(t)} className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TemplateBuilder editing={editing} onClose={() => setEditing(null)} />
      <RunDialog template={running} onClose={() => setRunning(null)} onQueued={() => { setRunning(null); onRunQueued(); }} />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this template?</DialogTitle>
            <DialogDescription>{toDelete?.name} will be removed. Files from earlier runs stay in History until they expire.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setToDelete(null)}>Keep it</GhostButton>
            <button type="button" disabled={remove.isPending} onClick={() => toDelete && remove.mutate(toDelete.id)} className="min-h-10 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer">Delete template</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Builder ────────────────────────────────────────────────────────────────────

function TemplateBuilder({ editing, onClose }: { editing: reportsApi.ReportTemplate | "new" | null; onClose: () => void }) {
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto">
        {editing && <TemplateForm existing={editing === "new" ? null : editing} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TemplateForm({ existing, onClose }: { existing: reportsApi.ReportTemplate | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState(existing?.report_type ?? "trip");
  const [columns, setColumns] = useState<string[]>(existing?.columns ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [period, setPeriod] = useState<reportsApi.TemplateSettings["period"]>(existing?.settings?.period ?? "7d");
  const [fileFormat, setFileFormat] = useState<"csv" | "xlsx">(existing?.settings?.format ?? "csv");
  const [vehicleScope, setVehicleScope] = useState<"all" | "ids">(existing?.settings?.vehicle_ids?.length ? "ids" : "all");
  const [vehicleIds, setVehicleIds] = useState<number[]>(existing?.settings?.vehicle_ids ?? []);

  const types =useQuery({ queryKey: ["report-types"], queryFn: reportsApi.getReportTypes });
  const fields = useQuery({ queryKey: ["report-fields", type], queryFn: () => reportsApi.getReportFields(type) });

  const byKey = useMemo(() => new Map((fields.data ?? []).map((f) => [f.key, f])), [fields.data]);
  const groups = useMemo(() => {
    const out = new Map<string, reportsApi.ReportField[]>();
    for (const f of fields.data ?? []) out.set(f.group, [...(out.get(f.group) ?? []), f]);
    return Array.from(out);
  }, [fields.data]);

  const toggle = (key: string) => setColumns((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));
  const move = (i: number, by: -1 | 1) =>
    setColumns((c) => { const next = [...c]; const j = i + by; if (j < 0 || j >= next.length) return c; [next[i], next[j]] = [next[j], next[i]]; return next; });

  const settings: reportsApi.TemplateSettings = {
    period,
    format: fileFormat,
    vehicle_ids: VEHICLE_TYPES.has(type) && vehicleScope === "ids" ? vehicleIds : null,
  };

  const save = useMutation({
    mutationFn: () => existing
      ? reportsApi.updateReportTemplate(existing.id, { name: name.trim(), report_type: type, columns, settings })
      : reportsApi.createReportTemplate({ name: name.trim(), report_type: type, columns, settings }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["report-templates"] }); toast.success(existing ? "Template updated" : "Template saved"); onClose(); },
    onError: (e: { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }) => {
      const errors = e.response?.data?.errors;
      setError(errors ? Object.values(errors).flat()[0] : e.response?.data?.message ?? "The template could not be saved.");
    },
  });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!name.trim()) return setError("Give the template a name.");
    if (columns.length === 0) return setError("Choose at least one column.");
    if (VEHICLE_TYPES.has(type) && vehicleScope === "ids" && vehicleIds.length === 0) return setError("Choose at least one vehicle, or use all vehicles.");
    save.mutate();
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>Choose the columns your file should have, and put them in the order you want to read them.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="tpl-name" className="text-xs font-bold text-slate-600 block mb-1.5">Template name</label>
              <input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} className={fieldClass} placeholder="Vehicle movement" />
            </div>
            <div>
              <label htmlFor="tpl-type" className="text-xs font-bold text-slate-600 block mb-1.5">Based on</label>
              <select id="tpl-type" value={type} onChange={(e) => { setType(e.target.value); setColumns([]); }} className={fieldClass}>
                {(types.data ?? [{ key: "vehicle", label: "Vehicle", definition_version: 1 }]).map((t) => <option key={t.key} value={t.key}>{typeLabel(t.key, t.label)}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p id="tpl-columns-label" className="text-xs font-bold text-slate-600 mb-1.5">Columns</p>
              {fields.isLoading ? <Skeleton className="h-10 w-full" /> : fields.isError ? (
                <p className="text-xs text-rose-600">The columns could not be loaded.</p>
              ) : (
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={pickerOpen}
                      aria-controls="tpl-columns-list"
                      aria-labelledby="tpl-columns-label"
                      className={`${fieldClass} flex items-center justify-between text-left cursor-pointer`}
                    >
                      <span className={columns.length ? "text-slate-900" : "text-slate-500"}>
                        {columns.length === 0 ? "Select columns…" : `${columns.length} ${columns.length === 1 ? "column" : "columns"} selected`}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search columns…" />
                      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-xs">
                        <button type="button" onClick={() => setColumns((fields.data ?? []).map((f) => f.key))} className="font-semibold text-blue-600 hover:underline cursor-pointer">Select all</button>
                        <button type="button" onClick={() => setColumns([])} disabled={columns.length === 0} className="font-semibold text-slate-500 hover:underline disabled:opacity-40 cursor-pointer">Clear</button>
                      </div>
                      <CommandList id="tpl-columns-list" className="max-h-64">
                        <CommandEmpty>No columns found.</CommandEmpty>
                        {groups.map(([group, list]) => (
                          <CommandGroup key={group} heading={group}>
                            {list.map((f) => {
                              const selected = columns.includes(f.key);
                              return (
                                <CommandItem key={f.key} value={`${group} ${f.label} ${f.key}`} onSelect={() => toggle(f.key)} className="gap-2">
                                  <Checkbox checked={selected} className="shadow-none pointer-events-none" aria-hidden tabIndex={-1} />
                                  <span className="flex-1 text-sm">{f.label}{f.unit ? ` (${f.unit})` : ""}</span>
                                  {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-600 mb-2">Column order ({columns.length})</p>
              {columns.length === 0 ? <p className="text-xs text-slate-400">Selected columns appear here, in the order they will appear in the file.</p> : (
                <ol className="space-y-1">
                  {columns.map((key, i) => (
                    <li key={key} className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 pl-2.5 pr-1 py-1 text-xs font-semibold text-slate-700">
                      <span className="flex-1 truncate">{byKey.get(key)?.label ?? key}</span>
                      <button type="button" aria-label={`Move ${byKey.get(key)?.label ?? key} up`} disabled={i === 0} onClick={() => move(i, -1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Move ${byKey.get(key)?.label ?? key} down`} disabled={i === columns.length - 1} onClick={() => move(i, 1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Remove ${byKey.get(key)?.label ?? key}`} onClick={() => toggle(key)} className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <fieldset className="rounded-2xl border border-slate-200 p-3 space-y-3">
            <legend className="px-1 text-xs font-bold text-slate-600">Run defaults</legend>
            <p className="text-xs text-slate-500">Prefilled each time you run this template. You can still change them per run.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="tpl-period" className="text-xs font-bold text-slate-600 block mb-1.5">Period</label>
                <select id="tpl-period" value={period} onChange={(e) => setPeriod(e.target.value as reportsApi.TemplateSettings["period"])} className={fieldClass}>
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
              <div>
                <label htmlFor="tpl-format" className="text-xs font-bold text-slate-600 block mb-1.5">Format</label>
                <select id="tpl-format" value={fileFormat} onChange={(e) => setFileFormat(e.target.value as "csv" | "xlsx")} className={fieldClass}>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
            </div>
            {VEHICLE_TYPES.has(type) && (
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">Vehicles</p>
                <div className="flex gap-2" role="group" aria-label="Vehicle scope">
                  <Chip active={vehicleScope === "all"} onClick={() => setVehicleScope("all")}>All vehicles</Chip>
                  <Chip active={vehicleScope === "ids"} onClick={() => setVehicleScope("ids")}>Choose vehicles</Chip>
                </div>
                {vehicleScope === "ids" && <div className="mt-2"><VehiclePicker ids={vehicleIds} onChange={setVehicleIds} id="tpl-vehicles" /></div>}
              </div>
            )}
          </fieldset>

          {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{existing ? "Save changes" : "Save template"}</PrimaryButton>
          </div>
        </form>
    </>
  );
}

// ── Run ────────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function RunDialog({ template, onClose, onQueued }: { template: reportsApi.ReportTemplate | null; onClose: () => void; onQueued: () => void }) {
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto">
        {template && <RunForm template={template} onClose={onClose} onQueued={onQueued} />}
      </DialogContent>
    </Dialog>
  );
}

function RunForm({ template, onClose, onQueued }: { template: reportsApi.ReportTemplate; onClose: () => void; onQueued: () => void }) {
  const defaults = template.settings;
  const [mode, setMode] = useState<"all" | "ids">(defaults?.vehicle_ids?.length ? "ids" : "all");
  const [ids, setIds] = useState<number[]>(defaults?.vehicle_ids ?? []);
  const [start, setStart] = useState(() => localInput(new Date(Date.now() - (PERIOD_DAYS[defaults?.period ?? "1d"] ?? 1) * 86_400_000)));
  const [end, setEnd] = useState(() => localInput(new Date()));
  const [format, setFormat] = useState<"csv" | "xlsx">(defaults?.format ?? "csv");
  const [error, setError] = useState<string | null>(null);
  const isVehicle = VEHICLE_TYPES.has(template.report_type);

  const run = useMutation({
    mutationFn: () => reportsApi.runReportTemplate(template.id, {
      selection: mode === "ids" ? { mode: "ids", ids } : { mode: "all" },
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
      format,
    }),
    onSuccess: () => { toast.success("Generating your report. It will be ready in History."); onQueued(); },
    onError: (e: { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }) => {
      const errors = e.response?.data?.errors;
      setError(errors ? Object.values(errors).flat()[0] : e.response?.data?.message ?? "The report could not be started.");
    },
  });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!s || !e || e <= s) return setError("The end must be after the start.");
    if (e > Date.now() + 60_000) return setError("The period cannot end in the future.");
    if ((e - s) / 86_400_000 > MAX_DAYS) return setError(`Choose a period of at most ${MAX_DAYS} days.`);
    if (mode === "ids" && ids.length === 0) return setError("Choose at least one vehicle, or run for all vehicles.");
    setError(null);
    run.mutate();
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>Run {template.name}</DialogTitle>
          <DialogDescription>The file is generated in the background and appears in History.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="run-start" className="text-xs font-bold text-slate-600 block mb-1.5">From</label>
              <input id="run-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="run-end" className="text-xs font-bold text-slate-600 block mb-1.5">To</label>
              <input id="run-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={fieldClass} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Up to {MAX_DAYS} days, within the last 60 days of telemetry.</p>

          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">{isVehicle ? "Vehicles" : "Drivers"}</p>
            <div className="flex gap-2">
              <Chip active={mode === "all"} onClick={() => setMode("all")}>{isVehicle ? "All vehicles" : "All drivers"}</Chip>
              {isVehicle && <Chip active={mode === "ids"} onClick={() => setMode("ids")}>Choose vehicles</Chip>}
            </div>
            {isVehicle && mode === "ids" && (
              <div className="mt-2"><VehiclePicker ids={ids} onChange={setIds} id="run-vehicles" /></div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">Format</p>
            <div className="flex gap-2">
              <Chip active={format === "csv"} onClick={() => setFormat("csv")}>CSV</Chip>
              <Chip active={format === "xlsx"} onClick={() => setFormat("xlsx")}>Excel</Chip>
            </div>
          </div>

          {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton type="submit" disabled={run.isPending}>{run.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Generate report</PrimaryButton>
          </div>
        </form>
    </>
  );
}
