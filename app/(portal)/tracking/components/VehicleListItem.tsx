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
        "group flex flex-col p-3 rounded-xl border transition-all cursor-pointer gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isSelected
          ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.01]"
          : "bg-white border-slate-50 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-8 w-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center transition-colors",
              isSelected
                ? "bg-white/20"
                : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500",
            )}
          >
            {vehicle.attributes.image ? (
              <img src={vehicle.attributes.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <Truck className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-black uppercase italic tracking-tight leading-none mb-1 truncate">
              {vehicle.attributes.registration_number}
            </h4>
            <p
              className={cn(
                "text-[8px] font-bold uppercase truncate",
                isSelected ? "text-blue-100" : "text-slate-400",
              )}
            >
              {loc?.address || `${vehicle.attributes.make} ${vehicle.attributes.model}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
              isSelected ? "bg-white/20 text-white" : statusCfg.badge,
            )}
          >
            {statusCfg.label}
          </span>
          <div
            className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px]", statusCfg.dot)}
            style={!isSelected ? { boxShadow: `0 0 8px ${statusCfg.marker}80` } : undefined}
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <span
          className={cn(
            "text-[7px] font-black uppercase tracking-widest",
            isSelected ? "text-blue-200" : "text-slate-400",
          )}
        >
          {lastUpdate}
        </span>
        <div className="flex items-center gap-3">
          {(fuelPct != null || fuelL != null) && (
            <span
              className={cn(
                "text-[7px] font-black uppercase tracking-widest",
                isSelected
                  ? "text-blue-200"
                  : fuelPct != null && fuelPct < 20
                    ? "text-rose-500"
                    : "text-slate-400",
              )}
            >
              ⛽{" "}
              {fuelPct != null && fuelL != null
                ? `${fuelPct}% · ${Number(fuelL).toFixed(1)}L`
                : fuelPct != null
                  ? `${fuelPct}%`
                  : `${Number(fuelL).toFixed(1)}L`}
            </span>
          )}
          <span
            className={cn(
              "text-[7px] font-black uppercase tracking-widest",
              isSelected ? "text-blue-200" : "text-slate-400",
            )}
          >
            {loc?.speed ?? 0} KPH
          </span>
        </div>
      </div>
    </div>
  );
}
