"use client";

import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import { VEHICLE_STATUS } from "@/lib/vehicleStatus";

export type StatusFilter =
  | "all"
  | "moving"
  | "idle"
  | "parked"
  | "online"
  | "offline"
  | "alarm";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
  { key: "moving", label: "Moving" },
  { key: "idle", label: "Idle" },
  { key: "parked", label: "Parked" },
  { key: "alarm", label: "Alarm" },
] as const;

// "online" and "all" are meta-filters (not part of the 5-way status taxonomy in
// lib/vehicleStatus.ts), so they keep their own colors; the rest are sourced from
// the canonical status map so filter chips, markers, and badges never drift apart.
const ACTIVE_COLOR: Record<StatusFilter, string> = {
  moving: VEHICLE_STATUS.moving.solid,
  idle: VEHICLE_STATUS.idle.solid,
  parked: VEHICLE_STATUS.parked.solid,
  offline: VEHICLE_STATUS.offline.solid,
  alarm: VEHICLE_STATUS.alarm.solid,
  online: "bg-blue-600 border-blue-600 text-white",
  all: "bg-slate-900 border-slate-900 text-white",
};

interface StatusFiltersProps {
  vehicles: Vehicle[];
  locations: Record<string, any>;
  alarmState?: Record<string, boolean>;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
}

export function StatusFilters({
  vehicles,
  locations,
  alarmState = {},
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
                if (s === "alarm") return alarmState[v.id] === true;
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
