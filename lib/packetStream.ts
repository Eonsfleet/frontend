/**
 * Live IoT Packet Stream — client-side classification of inbound WS events.
 *
 * The backend (see docs/livetracking.md) does not broadcast a distinct multi-type
 * packet stream — it broadcasts exactly 5 real-time events: `current.recent`,
 * `vehicle.status.changed`, `fuel.event`/`fuel.level`, `device.status`, and
 * `geofence.monitor`. This module classifies each inbound event into a PacketType
 * purely by which event fired, and produces a short human-readable summary line.
 * The full decoded payload (available on expand) already contains the richer
 * engine/fuel/battery/door telemetry fields nested inside `current.recent`.
 */

export type PacketType = "Location" | "Status" | "Fuel" | "Device" | "Alarm";

export interface PacketStreamEntry {
  id: string;
  vehicleId: string;
  type: PacketType;
  /** Client clock (Date.now()) at receipt — used for ordering & relative-time display */
  receivedAt: number;
  summary: string;
  raw: unknown;
}

let seq = 0;
function nextId(vehicleId: string): string {
  seq += 1;
  return `${vehicleId}-${Date.now()}-${seq}`;
}

export function classifyPacket(channelEvent: string, _payload: unknown): PacketType {
  const evt = channelEvent.toLowerCase();
  if (evt.includes("current.recent")) return "Location";
  if (evt.includes("vehicle.status.changed")) return "Status";
  if (evt.includes("fuel.")) return "Fuel";
  if (evt.includes("device.status")) return "Device";
  if (evt.includes("geofence.monitor")) return "Alarm";
  return "Status";
}

function fmtNum(n: unknown, suffix = ""): string | null {
  if (n === null || n === undefined || n === "") return null;
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (typeof num !== "number" || isNaN(num)) return null;
  return `${num}${suffix}`;
}

export function summarizePacket(type: PacketType, payload: any): string {
  if (!payload || typeof payload !== "object") return "No payload";

  switch (type) {
    case "Location": {
      const parts = [
        fmtNum(payload.speed, " km/h"),
        payload.heading != null ? `heading ${Math.round(payload.heading)}°` : null,
        payload.status ? `status ${payload.status}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(", ") : "Location update";
    }
    case "Status":
      return payload.new_status
        ? `Status changed to ${payload.new_status}`
        : "Status update";
    case "Fuel": {
      const pct = fmtNum(payload.fuel_level_percent, "%");
      const liters = fmtNum(payload.fuel_level_liters, " L");
      if (pct || liters) return [pct, liters].filter(Boolean).join(" / ");
      return payload.anomaly_type ? `Anomaly: ${payload.anomaly_type}` : "Fuel event";
    }
    case "Device":
      return payload.status ? `Device ${payload.status}` : "Device status update";
    case "Alarm":
      return payload.geofence_name
        ? `${payload.event_type ?? "Breach"} — ${payload.geofence_name}`
        : "Geofence alert";
    default:
      return "Event";
  }
}

export function buildPacketEntry(
  vehicleId: string,
  channelEvent: string,
  payload: unknown,
): PacketStreamEntry {
  const type = classifyPacket(channelEvent, payload);
  return {
    id: nextId(vehicleId),
    vehicleId,
    type,
    receivedAt: Date.now(),
    summary: summarizePacket(type, payload),
    raw: payload,
  };
}
