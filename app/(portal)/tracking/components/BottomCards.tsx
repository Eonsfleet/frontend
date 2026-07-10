"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Navigation,
  Cpu,
  Camera,
  Maximize2,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
} from "lucide-react";
import { getDeviceById } from "@/lib/api/tracking";
import { VEHICLE_STATUS, resolveStatusKey } from "@/lib/vehicleStatus";
import { formatVoltage, type ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";
import { StreetViewModal } from "./StreetViewModal";

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

function StreetViewCard({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [expanded, setExpanded] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY;
  const hasCoords = lat != null && lng != null;

  return (
    <div className="bg-white px-4 py-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Street View</span>
        </div>
        {apiKey && hasCoords && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Expand street view"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-[110px] rounded-lg overflow-hidden bg-slate-100">
        {apiKey && hasCoords ? (
          <iframe
            key={`${lat},${lng}`}
            title="Street View"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {hasCoords ? "Street View unavailable" : "Location unavailable"}
          </div>
        )}
      </div>
      {apiKey && hasCoords && (
        <StreetViewModal lat={lat} lng={lng} open={expanded} onOpenChange={setExpanded} />
      )}
    </div>
  );
}

export function BottomCards({ selectedVehicle, resolved, loc, hasActiveAlarm = false }: BottomCardsProps) {
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

      <StreetViewCard lat={loc?.lat ?? resolved.lat} lng={loc?.lng ?? resolved.lng} />
    </div>
  );
}
