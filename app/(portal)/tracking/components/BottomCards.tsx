"use client";

import { useQuery } from "@tanstack/react-query";
import { Route, Navigation, Cpu, Loader2, SignalHigh, SignalMedium, SignalLow, SignalZero } from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { getActiveTripForVehicle } from "@/lib/api/trips";
import { getDeviceById } from "@/lib/api/tracking";
import { VEHICLE_STATUS, resolveStatusKey } from "@/lib/vehicleStatus";
import { formatVoltage } from "@/lib/resolveVehicleTelemetry";
import { reverseGeocode } from "@/lib/gps";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";

interface BottomCardsProps {
  selectedVehicle: any;
  loc: any;
  hasActiveAlarm?: boolean;
}

function CardShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3 h-full">
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
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-bold text-slate-800 mt-0.5">{value ?? "—"}</p>
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

export function BottomCards({ selectedVehicle, loc, hasActiveAlarm = false }: BottomCardsProps) {
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
  });

  // Most devices never send a resolved address string (no reverse-geocoding
  // happens server-side) — fall back to client-side reverse geocoding the same
  // way useResolvedVehicleTelemetry does for the AssetPanel, so Address isn't
  // permanently blank here.
  const { data: geocodedAddress } = useQuery({
    queryKey: ["reverse-geocode", loc?.lat, loc?.lng],
    queryFn: () => reverseGeocode(loc.lat, loc.lng),
    enabled: !loc?.address && !!loc?.lat && !!loc?.lng,
    staleTime: 5 * 60_000,
  });

  const lastUpdateRelative = useRelativeTime(loc?.lastUpdate ?? loc?.lastPacket);
  const statusKey = resolveStatusKey({ status: loc?.status, is_online: loc?.is_online, speed: loc?.speed }, hasActiveAlarm);
  const statusCfg = VEHICLE_STATUS[statusKey];

  if (!selectedVehicle) return null;

  const tripStart = trip?.attributes?.actual_start_time ?? trip?.attributes?.planned_start_time;
  const tripDuration = tripStart ? formatDistanceStrict(new Date(tripStart), new Date()) : null;
  const tripStops = trip?.attributes?.routes?.filter((r: any) => r.is_stop_point).length ?? null;

  const attrs = deviceInfoData?.data?.attributes ?? {};
  const hardware = deviceInfoData?.data?.relationships?.hardware;
  const device = selectedVehicle.relationships?.device;
  const signal = gpsSignal(loc?.satellites);
  const address = loc?.address ?? geocodedAddress ?? null;

  const fuelPct = loc?.fuel ?? loc?.fuel_level_percent ?? null;
  const fuelL = loc?.fuel_liters ?? loc?.fuel_level_liters ?? null;
  const fuelDisplay =
    fuelPct != null && fuelL != null
      ? `${fuelPct}% · ${Number(fuelL).toFixed(1)}L`
      : fuelPct != null
        ? `${fuelPct}%`
        : fuelL != null
          ? `${Number(fuelL).toFixed(1)}L`
          : null;
  const sim = simLabel(attrs.status ?? device?.status);

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto no-scrollbar min-w-0 p-3">
      <CardShell icon={Route} title="Current Trip">
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
          <Stat label="Speed" value={`${loc?.speed ?? 0} km/h`} />
          <Stat label="Heading" value={loc?.heading != null ? `${Math.round(loc.heading)}°` : null} />
          <Stat label="Ignition" value={loc?.ignition ? "On" : "Off"} />
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
          {/* No carrier/network field exists in the backend yet — shown as "—" until added, not faked from country/etc. */}
          <Stat label="Network" value={null} />
          <Stat label="Battery" value={formatVoltage(loc?.battery_voltage)} />
          <Stat label="Fuel" value={fuelDisplay} />
          <Stat label="Device" value={hardware?.name} />
          <Stat label="SIM" value={sim} />
        </div>
      </CardShell>
    </div>
  );
}
