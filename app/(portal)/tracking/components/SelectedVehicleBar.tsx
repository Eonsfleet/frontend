"use client";

import { Truck, MapPin, History, Activity, X } from "lucide-react";
import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SelectedVehicleBarProps {
  selectedVehicle: Vehicle;
  locations: Record<string, any>;
  onReplay: () => void;
  onTelemetry: () => void;
  onClose: () => void;
}

export function SelectedVehicleBar({
  selectedVehicle,
  locations,
  onReplay,
  onTelemetry,
  onClose,
}: SelectedVehicleBarProps) {
  const loc = locations[selectedVehicle.id];

  return (
    <div className="hidden md:block absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in slide-in-from-bottom-5 duration-500 delay-100 w-full max-w-xl">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] border border-white/50 p-4 flex items-center gap-6 pointer-events-auto">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
            <Truck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter truncate">
                {selectedVehicle.attributes.registration_number}
              </h3>
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  loc?.status === "moving" || loc?.speed > 0
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-300",
                )}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-2.5 w-2.5 text-blue-500" />
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">
                {(() => {
                  const ts = loc?.lastUpdate;
                  if (!ts) return "SYNCED REAL-TIME";
                  const d = new Date(
                    ts.endsWith("Z") || ts.includes("+") ? ts : ts + "Z",
                  );
                  return d.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                })()}
              </span>
            </div>
          </div>
        </div>

        <div className="h-10 w-px bg-slate-100 shrink-0" />

        <div className="flex items-center gap-5 shrink-0 px-2">
          <div className="text-center">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
              Velocity
            </p>
            <p className="text-base font-black text-slate-900 italic tracking-tighter leading-none">
              {loc?.speed || 0}
              <span className="text-[8px] font-bold text-slate-400 ml-0.5 font-sans not-italic">
                KPH
              </span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
              Fuel
            </p>
            <p className="text-base font-black text-slate-900 italic tracking-tighter leading-none">
              {loc?.fuel || 0}
              <span className="text-[8px] font-bold text-slate-400 ml-0.5 font-sans not-italic">
                %
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onReplay}
                  className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center border border-blue-100"
                >
                  <History className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest">
                Replay
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onTelemetry}
                  className="h-10 w-10 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"
                >
                  <Activity className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest">
                Sensors
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-8 w-px bg-slate-100 mx-1" />

          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
