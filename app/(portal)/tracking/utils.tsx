import { startOfDay } from "date-fns";
import { Navigation, Truck, Layers, Car, Bus, Bike, Van, Caravan, type LucideIcon } from "lucide-react";
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
 * playback/replay marker.
 */
export function buildMarkerHtml(params: {
  registrationNumber?: string;
  speedOrStatus?: string;
  isSelected?: boolean;
  heading?: number;
  state: MarkerState;
}): string {
  const { registrationNumber, speedOrStatus, isSelected = false, heading = 0, state } = params;
  const cfg = VEHICLE_STATUS[state.statusKey];

  if (registrationNumber) {
    const pinSvg = `
      <svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 34L8 22H20L14 34Z" fill="${cfg.marker}" />
        <circle cx="14" cy="14" r="14" fill="${cfg.marker}" />
        <circle cx="14" cy="14" r="8" fill="white" />
        <circle cx="14" cy="14" r="4.5" fill="${cfg.marker}" />
      </svg>
    `;

    const borderClass = isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-100/80";

    return `
      <div class="custom-tracking-marker flex items-center" style="width: 220px; height: 45px; pointer-events: none; transform: translate3d(0,0,0);">
        <div class="flex-shrink-0" style="width: 28px; height: 34px;">
          ${pinSvg}
        </div>
        <div class="ml-2 bg-white rounded-xl shadow-lg border ${borderClass} px-3 py-1.5 flex flex-col justify-center pointer-events-auto" style="min-width: 95px; line-height: 1.25;">
          <div class="text-[11px] font-extrabold text-slate-900 whitespace-nowrap">${registrationNumber}</div>
          <div class="text-[9px] font-bold text-slate-500 whitespace-nowrap mt-0.5 capitalize">${speedOrStatus}</div>
        </div>
      </div>
    `;
  }

  // Fallback for playback marker or legacy calls without registrationNumber
  return `
    <div class="marker-container flex items-center justify-center" style="width:36px;height:36px;">
      <div class="marker-base" style="transform: rotate(${heading || 0}deg); background:${cfg.marker}; border-color:${cfg.ring}; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
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

/**
 * Maps a vehicle's body_type to a matching lucide icon *component* (not JSX), so
 * the caller controls size/color via className. Covers the common road-fleet set;
 * anything unrecognized falls back to a generic car so the slot is never empty.
 */
export function getVehicleTypeIcon(bodyType: string | null | undefined): LucideIcon {
  switch ((bodyType ?? "").toLowerCase().trim()) {
    case "truck":
    case "lorry":
    case "trailer":
    case "tanker":
      return Truck;
    case "van":
    case "minivan":
      return Van;
    case "bus":
    case "coach":
      return Bus;
    case "motorcycle":
    case "motorbike":
    case "bike":
    case "scooter":
      return Bike;
    case "caravan":
    case "rv":
      return Caravan;
    case "car":
    case "sedan":
    case "suv":
    case "pickup":
    case "hatchback":
      return Car;
    default:
      return Car;
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
