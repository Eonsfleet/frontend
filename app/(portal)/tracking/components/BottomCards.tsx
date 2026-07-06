"use client";

import { useQuery } from "@tanstack/react-query";
import { Route, Navigation, Cpu, Loader2, SignalHigh, SignalMedium, SignalLow, SignalZero } from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { getActiveTripForVehicle } from "@/lib/api/trips";
import { getDeviceById } from "@/lib/api/tracking";
import { VEHICLE_STATUS, resolveStatusKey } from "@/lib/vehicleStatus";
import { formatVoltage, type ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";

interface BottomCardsProps {
  selectedVehicle: any;
  /** Live-resolved telemetry (WS + REST-merged), computed once at the page level. */
  resolved: ResolvedVehicleTelemetry;
  /** The fleet-stream snapshot (locations[id]) the sidebar reads — used so the
   * headline status here matches the sidebar/list exactly. */
  loc?: any;
  hasActiveAlarm?: boolean;
}

function CardShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white px-4 py-3 h-full">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-xs font-bold text-slate-800 mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

function gpsSignal(satellites: number | null | undefined) {
  if (satellites == null) return { label: "—", Icon: SignalZero, color: "text-slate-300" };
  if (satellites >= 6) return { label: "Strong", Icon: SignalHigh, color: "text-emerald-600" };
  if (satellites >= 3) return { label: "Fair", Icon: SignalMedium, color: "text-amber-600" };
  return { label: "Weak", Icon: SignalLow, color: "text-rose-600" };
}

function simLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "offline") return "Offline";
  return status;
}

export function BottomCards({ selectedVehicle, resolved, loc, hasActiveAlarm = false }: BottomCardsProps) {
  const { data: trip, isLoading: isLoadingTrip } = useQuery({
    queryKey: ["active-trip", selectedVehicle?.id],
    queryFn: () => getActiveTripForVehicle(selectedVehicle!.id),
    enabled: !!selectedVehicle,
  });

  // /devices/{id} (device HARDWARE record) — not /tracker/{imei}, which only
  // returns GPS telemetry and never included model/network/SIM fields.
  const deviceRecordId = selectedVehicle?.relationships?.device?.id ?? selectedVehicle?.relationships?.device?.data?.id;
  const { data: deviceInfoData } = useQuery({
    queryKey: ["device-info", deviceRecordId],
    queryFn: () => getDeviceById(deviceRecordId),
    enabled: !!deviceRecordId,
    refetchInterval: 30_000,
  });

  const lastUpdateRelative = useRelativeTime(resolved.lastUpdate);
  // Headline status comes from the same fleet-stream snapshot the sidebar uses, so
  // the lower sheet can't show "Stopped" while the list still says "Moving".
  const statusKey = resolveStatusKey(
    {
      status: loc?.status ?? resolved.status,
      is_online: loc?.is_online ?? resolved.isDeviceOnline,
      speed: loc?.speed ?? resolved.speed,
    },
    hasActiveAlarm,
  );
  const statusCfg = VEHICLE_STATUS[statusKey];

  if (!selectedVehicle) return null;

  const tripStart = trip?.attributes?.actual_start_time ?? trip?.attributes?.planned_start_time;
  const tripDuration = tripStart ? formatDistanceStrict(new Date(tripStart), new Date()) : null;
  const tripStops = trip?.attributes?.routes?.filter((r: any) => r.is_stop_point).length ?? null;

  const attrs = deviceInfoData?.data?.attributes ?? {};
  const hardware = deviceInfoData?.data?.relationships?.hardware;
  const device = selectedVehicle.relationships?.device;
  const signal = gpsSignal(resolved.satellites);
  const address = resolved.address ?? null;

  const fuelDisplay =
    resolved.fuel != null && resolved.fuelLiters != null
      ? `${resolved.fuel}% · ${Number(resolved.fuelLiters).toFixed(1)}L`
      : resolved.fuel != null
        ? `${resolved.fuel}%`
        : resolved.fuelLiters != null
          ? `${Number(resolved.fuelLiters).toFixed(1)}L`
          : null;
  const sim = simLabel(attrs.status ?? device?.status);

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto no-scrollbar min-w-0 p-3">
      <CardShell icon={Route} title="Summary">
        {isLoadingTrip ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
        ) : trip ? (
          <div className="grid grid-cols-2 gap-x-6">
            <div className="space-y-2">
              <Stat label="Started" value={tripStart ? format(new Date(tripStart), "hh:mm a") : null} />
              <Stat label="Duration" value={tripDuration} />
              <Stat
                label="Distance"
                value={trip.attributes.distance_covered_km != null ? `${trip.attributes.distance_covered_km} km` : null}
              />
              <Stat label="Stops" value={tripStops} />
            </div>
            <div className="space-y-2">
              <Stat label="Avg. Speed" value={trip.attributes.avg_speed != null ? `${trip.attributes.avg_speed} km/h` : null} />
              <Stat label="Fuel Used" value={null} />
              <Stat label="Idle Time" value={null} />
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-bold text-slate-400">No active trip</p>
        )}
      </CardShell>

      <CardShell icon={Navigation} title="Location & Movement">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-2">
          <Stat label="Speed" value={`${loc?.speed ?? resolved.speed ?? 0} km/h`} />
          <Stat label="Heading" value={resolved.heading != null ? `${Math.round(resolved.heading)}°` : null} />
          <Stat label="Ignition" value={resolved.ignition ? "On" : "Off"} />
          <Stat
            label="Status"
            value={
              <span className={cn("px-1.5 py-0.5 rounded-full border text-[9px]", statusCfg.badge)}>
                {statusCfg.label}
              </span>
            }
          />
        </div>
        <Stat label="Address" value={address} />
        <div className="mt-2">
          <Stat label="Last Update" value={lastUpdateRelative} />
        </div>
      </CardShell>

      <CardShell icon={Cpu} title="Device Status">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Stat
            label="GPS Signal"
            value={
              <span className={cn("inline-flex items-center gap-1", signal.color)}>
                <signal.Icon className="h-3.5 w-3.5" /> {signal.label}
              </span>
            }
          />
          <Stat label="Network" value={resolved.gsmOperator} />
          <Stat label="Battery" value={formatVoltage(resolved.batteryV)} />
          <Stat
            label="Fuel"
            value={
              resolved.fuel != null ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        resolved.fuel < 20 ? "bg-rose-500" : resolved.fuel < 40 ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${resolved.fuel}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                    {resolved.fuelLiters != null ? `${Number(resolved.fuelLiters).toFixed(1)}L` : `${resolved.fuel}%`}
                  </span>
                </div>
              ) : (
                <span className="text-slate-300 font-normal italic">—</span>
              )
            }
          />
          <Stat label="Device" value={hardware?.name} />
          <Stat label="Status" value={sim} />
        </div>
      </CardShell>
    </div>
  );
}
