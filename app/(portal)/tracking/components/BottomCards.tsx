"use client";

import { useQuery } from "@tanstack/react-query";
import { Route, Navigation, Cpu, Loader2 } from "lucide-react";
import { getActiveTripForVehicle } from "@/lib/api/trips";
import { VEHICLE_STATUS, resolveStatusKey } from "@/lib/vehicleStatus";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { AIInsightsCard } from "./AIInsightsCard";
import { cn } from "@/lib/utils";

interface BottomCardsProps {
  selectedVehicle: any;
  loc: any;
  hasActiveAlarm?: boolean;
}

function CardShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 min-w-56 shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <span className="text-[11px] font-semibold text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

export function BottomCards({ selectedVehicle, loc, hasActiveAlarm = false }: BottomCardsProps) {
  const { data: trip, isLoading: isLoadingTrip } = useQuery({
    queryKey: ["active-trip", selectedVehicle?.id],
    queryFn: () => getActiveTripForVehicle(selectedVehicle!.id),
    enabled: !!selectedVehicle,
  });

  const lastUpdateRelative = useRelativeTime(loc?.lastUpdate ?? loc?.lastPacket);
  const statusKey = resolveStatusKey({ status: loc?.status, is_online: loc?.is_online, speed: loc?.speed }, hasActiveAlarm);
  const statusCfg = VEHICLE_STATUS[statusKey];

  if (!selectedVehicle) return null;

  return (
    <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar">
      <CardShell icon={Route} title="Current Trip">
        {isLoadingTrip ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
        ) : trip ? (
          <div className="space-y-0.5">
            <Row label="Status" value={trip.attributes.status} />
            <Row label="Distance" value={trip.attributes.distance_covered_km != null ? `${trip.attributes.distance_covered_km} km` : null} />
            <Row label="Avg Speed" value={trip.attributes.avg_speed != null ? `${trip.attributes.avg_speed} km/h` : null} />
          </div>
        ) : (
          <p className="text-[10px] font-bold text-slate-400">No active trip</p>
        )}
      </CardShell>

      <CardShell icon={Navigation} title="Location & Movement">
        <div className="space-y-0.5">
          <Row label="Speed" value={`${loc?.speed ?? 0} km/h`} />
          <Row label="Heading" value={loc?.heading != null ? `${Math.round(loc.heading)}°` : null} />
          <Row label="Ignition" value={loc?.ignition ? "On" : "Off"} />
          <Row
            label="Status"
            value={
              <span className={cn("px-1.5 py-0.5 rounded-full border text-[8px]", statusCfg.badge)}>
                {statusCfg.label}
              </span>
            }
          />
          <Row label="Location" value={loc?.address} />
          <Row label="Last Update" value={lastUpdateRelative} />
        </div>
      </CardShell>

      <CardShell icon={Cpu} title="Device Status">
        <div className="space-y-0.5">
          <Row label="Online" value={loc?.is_online ? "Yes" : "No"} />
          <Row label="Last Packet" value={lastUpdateRelative} />
          <Row label="Satellites" value={loc?.satellites} />
        </div>
      </CardShell>

      <div className="min-w-64 shrink-0">
        <AIInsightsCard
          input={{
            status: loc?.status,
            statusSinceMs: loc?.statusSinceMs,
            speed: loc?.speed,
            satellites: loc?.satellites,
            batteryV: loc?.battery_voltage,
            ignition: loc?.ignition,
            hasActiveAlarm,
          }}
        />
      </div>
    </div>
  );
}
