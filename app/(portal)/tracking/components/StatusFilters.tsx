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
  { key: "moving", label: "Moving" },
  { key: "idle", label: "Idle" },
  { key: "parked", label: "Parked" },
  { key: "offline", label: "Offline" },
  { key: "online", label: "Online" },
  { key: "alarm", label: "Alarm" },
] as const;

const ACTIVE_TEXT: Record<StatusFilter, string> = {
  moving: VEHICLE_STATUS.moving.text,
  idle: VEHICLE_STATUS.idle.text,
  parked: VEHICLE_STATUS.parked.text,
  offline: VEHICLE_STATUS.offline.text,
  alarm: VEHICLE_STATUS.alarm.text,
  online: "text-blue-600",
  all: "text-slate-900",
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
    <div className="flex gap-4 overflow-x-auto no-scrollbar border-b border-slate-100">
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

        const isActive = statusFilter === s;

        return (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={cn(
              "shrink-0 pb-2 pt-1 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
              isActive
                ? cn(ACTIVE_TEXT[s], "border-current")
                : "text-slate-400 border-transparent hover:text-slate-600",
            )}
          >
            {label} {count}
          </button>
        );
      })}
    </div>
  );
}
