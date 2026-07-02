"use client";

import { Truck } from "lucide-react";
import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import { VEHICLE_STATUS, resolveStatusKey } from "@/lib/vehicleStatus";
import { useRelativeTime } from "@/hooks/useRelativeTime";

interface VehicleListItemProps {
  vehicle: Vehicle;
  loc: any;
  isSelected: boolean;
  onSelect: () => void;
  hasActiveAlarm?: boolean;
}

export function VehicleListItem({
  vehicle,
  loc,
  isSelected,
  onSelect,
  hasActiveAlarm = false,
}: VehicleListItemProps) {
  const statusKey = resolveStatusKey(
    { status: loc?.status, is_online: loc?.is_online, speed: loc?.speed },
    hasActiveAlarm,
  );
  const statusCfg = VEHICLE_STATUS[statusKey];
  const lastUpdate = useRelativeTime(loc?.lastPacket || loc?.lastUpdate);
  const fuelPct = loc?.fuel ?? loc?.fuel_level_percent ?? null;
  const fuelL = loc?.fuel_liters ?? loc?.fuel_level_liters ?? null;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`${vehicle.attributes.registration_number}, ${statusCfg.label}, ${loc?.speed ?? 0} km/h`}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        isSelected ? "bg-blue-50" : "hover:bg-slate-50",
      )}
    >
      <div className="h-9 w-9 rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 text-slate-400">
        {vehicle.attributes.image ? (
          <img src={vehicle.attributes.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Truck className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-900 truncate">
            {vehicle.attributes.registration_number}
          </h4>
          <span className={cn("text-[11px] font-semibold shrink-0", statusCfg.text)}>{statusCfg.label}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[11px] text-slate-400 truncate">
            {loc?.address || `${vehicle.attributes.make} ${vehicle.attributes.model}`}
          </p>
          <span className="text-[11px] text-slate-400 shrink-0">
            {fuelPct != null
              ? `${fuelPct}% · `
              : fuelL != null
                ? `${Number(fuelL).toFixed(1)}L · `
                : ""}
            {loc?.speed ?? 0} km/h
          </span>
        </div>
        <p className="text-[10px] text-slate-300 mt-0.5">{lastUpdate}</p>
      </div>
    </div>
  );
}
