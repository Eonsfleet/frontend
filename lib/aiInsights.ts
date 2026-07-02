/**
 * Client-side heuristic insights for a selected vehicle — NOT a real ML/AI
 * backend. Every rule here is a plain threshold check against already-available
 * telemetry/location data. Insights are recomputed on every telemetry tick via
 * useMemo; there is no persistence or training involved.
 */

export type InsightSeverity = "info" | "warning" | "critical";

export interface AIInsight {
  id: string;
  severity: InsightSeverity;
  message: string;
}

export interface AIInsightsInput {
  status?: string | null;
  statusSinceMs?: number | null;
  speed?: number | null;
  satellites?: number | null;
  batteryV?: number | string | null;
  ignition?: boolean | null;
  hasActiveAlarm?: boolean;
  /** Odometer-based maintenance-due signal, only included if cheaply available — omitted (not faked) otherwise */
  maintenanceDueKm?: number | null;
  odometerKm?: number | null;
}

const IDLE_WARNING_MS = 15 * 60_000;
const OVERSPEED_KMH = 100;
const WEAK_GPS_SATELLITES = 4;
const LOW_BATTERY_V = 11.8;
const NO_MOVEMENT_HOURS = 24;

function parseVoltage(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v.replace(/v$/i, "").trim()) : v;
  return isNaN(n) ? null : n;
}

export function computeAIInsights(input: AIInsightsInput): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = Date.now();

  if (input.hasActiveAlarm) {
    insights.push({ id: "alarm", severity: "critical", message: "Active alarm — geofence breach or fuel anomaly detected" });
  }

  if (input.status === "idle" && input.statusSinceMs && now - input.statusSinceMs > IDLE_WARNING_MS) {
    const minutes = Math.round((now - input.statusSinceMs) / 60_000);
    insights.push({ id: "idle", severity: "warning", message: `Idle for ${minutes} minutes` });
  }

  if ((input.speed ?? 0) > OVERSPEED_KMH) {
    insights.push({ id: "overspeed", severity: "critical", message: `Possible overspeed: ${input.speed} km/h` });
  }

  if (input.satellites != null && input.satellites < WEAK_GPS_SATELLITES) {
    insights.push({ id: "weak-gps", severity: "warning", message: `Weak GPS signal (${input.satellites} satellites)` });
  }

  const battery = parseVoltage(input.batteryV);
  if (battery != null && battery < LOW_BATTERY_V) {
    insights.push({ id: "battery", severity: "warning", message: `Battery voltage dropping (${battery.toFixed(1)}V)` });
  }

  if (
    input.status === "parked" &&
    !input.ignition &&
    input.statusSinceMs &&
    now - input.statusSinceMs > NO_MOVEMENT_HOURS * 60 * 60_000
  ) {
    insights.push({ id: "no-movement", severity: "info", message: "No movement detected in over 24 hours" });
  }

  if (input.maintenanceDueKm != null && input.odometerKm != null && input.odometerKm >= input.maintenanceDueKm) {
    insights.push({ id: "maintenance", severity: "warning", message: "Maintenance approaching based on odometer" });
  }

  return insights;
}
