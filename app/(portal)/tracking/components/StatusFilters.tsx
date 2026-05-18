"use client";

import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";

export type StatusFilter =
  | "all"
  | "moving"
  | "idle"
  | "parked"
  | "online"
  | "offline";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
  { key: "moving", label: "Moving" },
  { key: "idle", label: "Idle" },
  { key: "parked", label: "Parked" },
] as const;

const ACTIVE_COLOR: Record<StatusFilter, string> = {
  moving: "bg-emerald-600 border-emerald-600 text-white",
  idle: "bg-amber-500 border-amber-500 text-white",
  parked: "bg-slate-500 border-slate-500 text-white",
  online: "bg-blue-600 border-blue-600 text-white",
  offline: "bg-rose-600 border-rose-600 text-white",
  all: "bg-slate-900 border-slate-900 text-white",
};

interface StatusFiltersProps {
  vehicles: Vehicle[];
  locations: Record<string, any>;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
}

export function StatusFilters({
  vehicles,
  locations,
  statusFilter,
  onStatusChange,
}: StatusFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {FILTERS.map(({ key: s, label }) => {
        const count =
          s === "all"
            ? vehicles.length
            : vehicles.filter((v: Vehicle) => {
                const loc = locations[v.id];
                if (s === "moving") return loc?.status === "in_transit";
                if (s === "idle") return loc?.status === "idle";
                if (s === "parked") return loc?.status === "parked";
                if (s === "online") return loc?.is_online === true;
                if (s === "offline") return loc?.is_online === false || !loc;
                return false;
              }).length;

        return (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
              statusFilter === s
                ? ACTIVE_COLOR[s]
                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200",
            )}
          >
            {label} ({count})
          </button>
        );
      })}
    </div>
  );
}
