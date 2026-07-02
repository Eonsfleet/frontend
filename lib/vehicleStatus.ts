/**
 * Canonical vehicle/asset status taxonomy for Live Tracking.
 *
 * This is the single source of truth for status → color/label mapping across
 * markers, cards, badges, filters, and legends. Do not hardcode status colors
 * elsewhere — import from here instead.
 */

export type VehicleStatusKey = "moving" | "parked" | "idle" | "offline" | "alarm";

export interface VehicleStatusConfig {
  key: VehicleStatusKey;
  label: string;
  /** Small status dot (list items, legends) */
  dot: string;
  /** Pill/chip badge classes (bg + text + border) — light background, for inactive/default state */
  badge: string;
  /** Solid chip classes (bg + border + white text) — for the active/selected filter chip state */
  solid: string;
  /** Text-only color class */
  text: string;
  /** Hex color used inside Leaflet divIcon inline SVG/HTML (can't use Tailwind classes there) */
  marker: string;
  /** Lighter marker ring/outline hex, used for pulse/selected rings */
  ring: string;
}

export const VEHICLE_STATUS: Record<VehicleStatusKey, VehicleStatusConfig> = {
  moving: {
    key: "moving",
    label: "Moving",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    solid: "bg-emerald-600 border-emerald-600 text-white",
    text: "text-emerald-600",
    marker: "#059669",
    ring: "#10b981",
  },
  parked: {
    key: "parked",
    label: "Parked",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    solid: "bg-blue-600 border-blue-600 text-white",
    text: "text-blue-600",
    marker: "#2563eb",
    ring: "#60a5fa",
  },
  idle: {
    key: "idle",
    label: "Idle",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    solid: "bg-amber-500 border-amber-500 text-white",
    text: "text-amber-600",
    marker: "#d97706",
    ring: "#fbbf24",
  },
  offline: {
    key: "offline",
    label: "Offline",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-600 border-rose-100",
    solid: "bg-rose-600 border-rose-600 text-white",
    text: "text-rose-600",
    marker: "#e11d48",
    ring: "#fb7185",
  },
  alarm: {
    key: "alarm",
    label: "Alarm",
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    solid: "bg-purple-600 border-purple-600 text-white",
    text: "text-purple-600",
    marker: "#7c3aed",
    ring: "#a78bfa",
  },
};

export const VEHICLE_STATUS_ORDER: VehicleStatusKey[] = [
  "moving",
  "parked",
  "idle",
  "offline",
  "alarm",
];

/** Minimal shape this module needs from a normalized telemetry/location record. */
export interface NormalizedStatusInput {
  /** Output of lib/utils.ts normalizeTelemetry, or the equivalent REST-derived status */
  status?: string | null;
  is_online?: boolean | null;
  speed?: number | null;
}

/**
 * Maps the existing 5-way normalizeTelemetry taxonomy (in_transit|idle|parked|offline|online)
 * plus an out-of-band "active alarm" flag (geofence breach / fuel anomaly) onto the new
 * 5-way UI taxonomy (moving|parked|idle|offline|alarm) used across the Live Tracking redesign.
 *
 * Alarm takes priority over motion status — an alarming vehicle is always shown as "alarm"
 * regardless of whether it's currently moving or parked, since that's the more urgent signal.
 */
export function resolveStatusKey(
  input: NormalizedStatusInput | null | undefined,
  hasActiveAlarm = false,
): VehicleStatusKey {
  if (hasActiveAlarm) return "alarm";
  if (!input) return "offline";

  const status = (input.status || "").toLowerCase();

  if (!input.is_online || status === "offline") return "offline";
  if (status === "in_transit" || (input.speed ?? 0) > 0) return "moving";
  if (status === "idle") return "idle";
  // "parked" and "online" (device online, no motion data yet) both render as parked
  return "parked";
}

export function getStatusConfig(key: VehicleStatusKey): VehicleStatusConfig {
  return VEHICLE_STATUS[key];
}
