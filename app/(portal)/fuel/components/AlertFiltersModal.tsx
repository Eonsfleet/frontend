"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  TYPE_META,
  SEVERITY_META,
  EMPTY_FILTERS,
  type AlertFilters,
  type AlertType,
  type Severity,
  type AlertStatus,
} from "./useFuelAlerts";
import { VehicleMultiSelect } from "./VehicleMultiSelect";

interface AlertFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: AlertFilters;
  onApply: (filters: AlertFilters) => void;
}

const TYPE_KEYS = Object.keys(TYPE_META) as AlertType[];
const SEVERITY_KEYS = Object.keys(SEVERITY_META) as Severity[];
const STATUSES: { value: AlertStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "false_positive", label: "False Positive" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-semibold text-slate-600">{children}</p>
  );
}

function SelectBox({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-9 w-full rounded-lg border-0 bg-slate-50 px-3 text-[13px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0055FF]"
    >
      {children}
    </select>
  );
}

function DateInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="date"
      className="h-9 w-full rounded-lg border-0 bg-slate-50 px-3 text-[13px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0055FF]"
    />
  );
}

export function AlertFiltersModal({
  open,
  onOpenChange,
  value,
  onApply,
}: AlertFiltersModalProps) {
  const [draft, setDraft] = useState<AlertFilters>(value);

  // On close (backdrop/esc/cancel), discard edits by reseeding the draft from the
  // committed filters so the next open starts clean — no setState-in-effect needed.
  const handleOpenChange = (next: boolean) => {
    if (!next) setDraft(value);
    onOpenChange(next);
  };

  const toggleType = (t: AlertType) =>
    setDraft((d) => ({
      ...d,
      types: d.types.includes(t)
        ? d.types.filter((x) => x !== t)
        : [...d.types, t],
    }));
  const toggleSeverity = (s: Severity) =>
    setDraft((d) => ({
      ...d,
      severities: d.severities.includes(s)
        ? d.severities.filter((x) => x !== s)
        : [...d.severities, s],
    }));

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-0 p-0 shadow-none sm:max-w-md"
      >
        <SheetHeader className="px-5 pt-5 text-left">
          <SheetTitle>Fuel Alert Filters</SheetTitle>
          <SheetDescription>
            Filter backend alert logs by type, severity, vehicle, status, and
            date range.
          </SheetDescription>
        </SheetHeader>

        <div className="fuel-record-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-5 pt-4">
          <div>
            <FieldLabel>Alert Type</FieldLabel>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2">
              {TYPE_KEYS.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 text-[13px] text-slate-600"
                >
                  <Checkbox
                    checked={draft.types.includes(t)}
                    onCheckedChange={() => toggleType(t)}
                  />
                  <span className="whitespace-nowrap">{TYPE_META[t].label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Severity</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_KEYS.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 text-[13px] text-slate-600"
                >
                  <Checkbox
                    checked={draft.severities.includes(s)}
                    onCheckedChange={() => toggleSeverity(s)}
                  />
                  <span
                    className={cn(
                      s === "critical" && "text-rose-600",
                      s === "warning" && "text-amber-600",
                    )}
                  >
                    {SEVERITY_META[s].label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel>Status</FieldLabel>
              <SelectBox
                value={draft.status}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    status: e.target.value as AlertStatus | "all",
                  }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectBox>
            </div>

            <div>
              <FieldLabel>Vehicle</FieldLabel>
              <VehicleMultiSelect
                value={draft.vehicleIds}
                onChange={(ids) => setDraft((d) => ({ ...d, vehicleIds: ids }))}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <FieldLabel>Date Range</FieldLabel>
              <Calendar className="mb-2 h-4 w-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateInput
                aria-label="Start date"
                value={draft.startDate ?? ""}
                max={draft.endDate || undefined}
                onChange={(event) =>
                  setDraft((d) => ({
                    ...d,
                    startDate: event.target.value || undefined,
                    date: undefined,
                  }))
                }
              />
              <DateInput
                aria-label="End date"
                value={draft.endDate ?? ""}
                min={draft.startDate || undefined}
                onChange={(event) =>
                  setDraft((d) => ({
                    ...d,
                    endDate: event.target.value || undefined,
                    date: undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 px-3 py-3">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_FILTERS)}
              className="text-[13px] font-semibold text-[#0055FF] hover:text-blue-700"
            >
              Reset
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply(draft);
                  onOpenChange(false);
                }}
                className="h-9 rounded-lg bg-[#0055FF] px-4 text-[13px] font-semibold text-white hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
