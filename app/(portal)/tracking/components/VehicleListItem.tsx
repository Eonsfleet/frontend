"use client";

import { Truck } from "lucide-react";
import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import { fmtTimestamp } from "../utils";

interface VehicleListItemProps {
  vehicle: Vehicle;
  loc: any;
  isSelected: boolean;
  onSelect: () => void;
}

export function VehicleListItem({
  vehicle,
  loc,
  isSelected,
  onSelect,
}: VehicleListItemProps) {
  const status = loc?.status;
  const lastUpdate = fmtTimestamp(loc?.lastPacket || loc?.lastUpdate);
  // Fuel only comes from WebSocket telemetry in the new API (not in REST location)
  const fuelPct = loc?.fuel ?? loc?.fuel_level_percent ?? null;
  const fuelL = loc?.fuel_liters ?? loc?.fuel_level_liters ?? null;

  const statusLabel = !loc?.is_online
    ? "Offline"
    : status === "in_transit"
      ? "Moving"
      : status === "idle"
        ? "Idling"
        : status === "parked"
          ? "Parked"
          : "Online";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex flex-col p-3 rounded-xl border transition-all cursor-pointer gap-2",
        isSelected
          ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.01]"
          : "bg-white border-slate-50 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg transition-colors",
              isSelected
                ? "bg-white/20"
                : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500",
            )}
          >
            <Truck className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase italic tracking-tight leading-none mb-1">
              {vehicle.attributes.registration_number}
            </h4>
            <p
              className={cn(
                "text-[8px] font-bold uppercase",
                isSelected ? "text-blue-100" : "text-slate-400",
              )}
            >
              {vehicle.attributes.make} {vehicle.attributes.model}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
              isSelected
                ? "bg-white/20 text-white"
                : !loc?.is_online
                  ? "bg-rose-100 text-rose-600"
                  : status === "in_transit"
                    ? "bg-emerald-100 text-emerald-700"
                    : status === "idle"
                      ? "bg-amber-100 text-amber-700"
                      : status === "parked"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-blue-100 text-blue-700",
            )}
          >
            {statusLabel}
          </span>
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full shadow-[0_0_8px]",
              !loc?.is_online
                ? "bg-rose-500 shadow-rose-500/50"
                : status === "in_transit"
                  ? "bg-emerald-500 shadow-emerald-500/50"
                  : status === "idle"
                    ? "bg-amber-400 shadow-amber-400/50"
                    : status === "parked"
                      ? "bg-slate-400 shadow-slate-400/50"
                      : "bg-blue-500 shadow-blue-500/50",
            )}
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
