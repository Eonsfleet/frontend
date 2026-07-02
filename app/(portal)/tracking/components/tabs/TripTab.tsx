"use client";

import { Trip } from "@/types";
import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { format, formatDistanceStrict } from "date-fns";
import { Route, Loader2 } from "lucide-react";

interface TripTabProps {
  trip: Trip | null | undefined;
  isLoading: boolean;
}

export function TripTab({ trip, isLoading }: TripTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
        <Route className="h-8 w-8 text-slate-300 mx-auto mb-3" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          No active trip
        </p>
      </div>
    );
  }

  const a = trip.attributes;
  const start = a.actual_start_time ?? a.planned_start_time;
  const duration = start ? formatDistanceStrict(new Date(start), new Date()) : null;
  const stops = a.routes?.filter((r) => r.is_stop_point).length ?? null;

  return (
    <div className="space-y-1 p-1">
      <TelemetryRow label="Trip Status" value={a.status} />
      <TelemetryRow label="Trip Start" value={start ? format(new Date(start), "MMM d, HH:mm") : null} />
      <TelemetryRow label="Duration" value={duration} />
      <TelemetryRow label="Distance" value={a.distance_covered_km != null ? `${a.distance_covered_km} km` : null} />
      <TelemetryRow label="Stops" value={stops} />
      <TelemetryRow label="Idle Time" value={null} />
      <TelemetryRow label="Average Speed" value={a.avg_speed != null ? `${a.avg_speed} km/h` : null} />
      <TelemetryRow label="Fuel Consumed" value={null} />
      <TelemetryRow label="Estimated Arrival" value={a.eta ? format(new Date(a.eta), "MMM d, HH:mm") : null} />
    </div>
  );
}
