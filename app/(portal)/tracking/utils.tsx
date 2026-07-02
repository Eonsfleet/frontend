import { startOfDay } from "date-fns";
import { Navigation, Truck, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_STATUS, resolveStatusKey, type VehicleStatusKey } from "@/lib/vehicleStatus";

export const MAP_LAYERS = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

export type TrackingMapStyle = keyof typeof MAP_LAYERS;

/**
 * Per-marker visual state derived from status + selection + alarm, feeding both the
 * Leaflet divIcon HTML (buildMarkerHtml) and any React-side badges/legends.
 */
export interface MarkerState {
  statusKey: VehicleStatusKey;
  /** Moving or alarming vehicles pulse; stationary/offline vehicles don't */
  pulse: boolean;
  /** Offline vehicles render greyed/dimmed */
  greyed: boolean;
  scale: number;
  zIndexOffset: number;
}

export function getMarkerState(
  normalized: { status?: string | null; is_online?: boolean | null; speed?: number | null } | null | undefined,
  isSelected: boolean,
  hasActiveAlarm = false,
): MarkerState {
  const statusKey = resolveStatusKey(normalized, hasActiveAlarm);
  return {
    statusKey,
    pulse: statusKey === "moving" || statusKey === "alarm",
    greyed: statusKey === "offline",
    scale: isSelected ? 1.15 : 1,
    zIndexOffset: isSelected ? 1000 : 0,
  };
}

/**
 * Builds the inline HTML for a vehicle's Leaflet divIcon. Centralized here so marker
 * appearance stays consistent with lib/vehicleStatus.ts across the fleet map and the
 * playback/replay marker (previously two independently hand-rolled template strings).
 */
export function buildMarkerHtml(params: {
  bodySvg: string;
  heading: number;
  state: MarkerState;
}): string {
  const { bodySvg, heading, state } = params;
  const cfg = VEHICLE_STATUS[state.statusKey];
  const size = Math.round(40 * state.scale);
  return `
    <div class="marker-container ${state.pulse ? "is-pulsing" : ""} ${state.greyed ? "is-greyed" : ""}" style="width:${size}px;height:${size}px;">
      <div class="marker-pulse" style="background:${cfg.marker}33;"></div>
      <div class="marker-base" style="transform: rotate(${heading || 0}deg); background:${cfg.marker}; border-color:${cfg.ring};">
        <div class="marker-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white">
            ${bodySvg}
          </svg>
        </div>
      </div>
    </div>
  `;
}

export const getMarkerSVG = (bodyType: string) => {
  switch (bodyType?.toLowerCase()) {
    case "truck":
      return '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h3a5 5 0 0 0 5-5v-1h-8v6Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>';
    case "van":
      return '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M18 18h2"/><path d="M4 18h2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M7 6v12"/><path d="M17 6v12"/>';
    default:
      return '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.3 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>';
  }
};

export function deriveVehicleStatus(loc: any, vehicle: any): string {
  const state = (loc?.state ?? "").toLowerCase();
  if (state === "moving") return "in_transit";
  if (state === "idle") return "idle";
  if (state === "parked") return "parked";
  const vs = ((vehicle as any)?.attributes?.status ?? "").toLowerCase();
  if (vs === "in_transit") return "in_transit";
  if (vs === "idle") return "idle";
  if (vs === "online") return "online";
  if (vs === "offline") return "offline";
  return "parked";
}

export function isStaleOffline(
  isOnline: boolean | undefined,
  timestamp: string | undefined | null,
): boolean {
  if (isOnline || !timestamp) return false;
  try {
    const d = new Date(
      timestamp.endsWith("Z") || timestamp.includes("+")
        ? timestamp
        : timestamp + "Z",
    );
    return !isNaN(d.getTime()) && d < startOfDay(new Date());
  } catch {
    return false;
  }
}

export function fmtTimestamp(ts: string | null | undefined): string {
  if (!ts) return "N/A";
  try {
    const d = new Date(ts.endsWith("Z") || ts.includes("+") ? ts : ts + "Z");
    if (isNaN(d.getTime())) return ts;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return ts;
  }
}

export const getVehicleIcon = (bodyType: string, statusKey: VehicleStatusKey | string) => {
  const isMoving = statusKey === "moving" || statusKey === "in_transit";
  switch (bodyType?.toLowerCase()) {
    case "truck":
      return (
        <Truck
          className={cn(
            "h-4 w-4",
            isMoving ? "text-emerald-500" : "text-slate-400",
          )}
        />
      );
    case "van":
      return (
        <Layers
          className={cn(
            "h-4 w-4",
            isMoving ? "text-emerald-500" : "text-slate-400",
          )}
        />
      );
    default:
      return (
        <Navigation
          className={cn(
            "h-4 w-4",
            isMoving ? "text-emerald-500" : "text-slate-400",
          )}
        />
      );
  }
};
