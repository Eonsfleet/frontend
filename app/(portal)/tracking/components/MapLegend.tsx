"use client";

import { VEHICLE_STATUS, VEHICLE_STATUS_ORDER } from "@/lib/vehicleStatus";
import { cn } from "@/lib/utils";

export function MapLegend() {
  return (
    <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-30 items-center gap-4 bg-white border border-slate-200 rounded-full shadow-lg px-5 py-2.5 pointer-events-none">
      {VEHICLE_STATUS_ORDER.map((key) => {
        const cfg = VEHICLE_STATUS[key];
        return (
          <div key={key} data-testid="legend-entry" className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}
