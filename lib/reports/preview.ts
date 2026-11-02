import { dash, formatDateTime, formatDuration, formatNumber } from "@/components/analytics/telemetry/format";

/**
 * The catalogued reports each return rows of their own shape. The preview
 * reads the shape instead of hard-coding every report: it picks readable
 * columns, formats a value by what its key says (`_s` seconds, `_km`, `_pct`…),
 * and finds a measure and a label to chart. A missing value is a dash, never 0.
 */

export type Row = Record<string, unknown>;

export interface PreviewColumn {
  key: string;
  label: string;
}

const HIDDEN = /(^id$|_id$|^key$)/;
const ACRONYM: Record<string, string> = { km: "km", kmh: "km/h", pct: "%", l: "L", imei: "IMEI", gps: "GPS" };
const MAX_COLUMNS = 9;

export const humanize = (key: string): string => {
  const words = key
    .replace(/_s$/, " duration")
    .replace(/_kmh$/, " km/h")
    .replace(/_km$/, " km")
    .replace(/_pct$/, " %")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => ACRONYM[w] ?? w);
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const isPlace = (v: unknown): v is { lat: number; lon: number } =>
  !!v && typeof v === "object" && "lat" in v && "lon" in v;

/** Readable columns of a result set: what the first rows carry, minus ids and nested records. */
export function deriveColumns(rows: Row[]): PreviewColumn[] {
  const keys: string[] = [];
  for (const row of rows.slice(0, 20)) {
    for (const key of Object.keys(row)) {
      if (HIDDEN.test(key) || keys.includes(key)) continue;
      const v = row[key];
      const plain = v === null || typeof v !== "object" || isPlace(v) || (v && "name" in (v as object));
      if (plain) keys.push(key);
    }
  }
  // Names and dates lead; the rest keep the backend's order.
  const lead = (k: string) => (/^(vehicle|driver|label|date|period|title|name)$/.test(k) ? 0 : 1);
  return keys
    .map((k, i) => ({ k, i }))
    .sort((a, b) => lead(a.k) - lead(b.k) || a.i - b.i)
    .slice(0, MAX_COLUMNS)
    .map(({ k }) => ({ key: k, label: humanize(k) }));
}

const ISO = /^\d{4}-\d{2}-\d{2}T/;

export function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return dash;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isPlace(value)) return `${value.lat.toFixed(4)}, ${value.lon.toFixed(4)}`;
  if (typeof value === "object") {
    const name = (value as { name?: string | null }).name;
    return name ?? dash;
  }
  if (typeof value === "number") {
    if (/_s$/.test(key)) return formatDuration(value);
    if (/_pct$/.test(key)) return formatNumber(value, 1, "%");
    if (/_kmh$/.test(key)) return formatNumber(value, 0, "km/h");
    if (/_km$/.test(key)) return formatNumber(value, 1, "km");
    return formatNumber(value, Number.isInteger(value) ? 0 : 1);
  }
  if (typeof value === "string" && ISO.test(value)) return formatDateTime(value);
  return String(value);
}

export interface Kpi {
  label: string;
  value: string;
}

/** The report's own totals as headline figures (the first four plain numbers). */
export function pickKpis(extra: Record<string, unknown> | undefined): Kpi[] {
  const totals = extra?.totals;
  if (!totals || typeof totals !== "object") return [];
  return Object.entries(totals as Record<string, unknown>)
    .filter(([, v]) => v === null || typeof v === "number")
    .slice(0, 4)
    .map(([k, v]) => ({ label: humanize(k), value: formatCell(k, v) }));
}

const PREFERRED_MEASURES = [
  "distance_km", "total", "litres", "utilization_pct", "driving_s", "alarm_count",
  "trips", "stops", "duration_s", "per_100_km",
];
const LABEL_KEYS = ["date", "period", "label", "vehicle", "driver", "title", "name"];

export interface ChartSpec {
  labelKey: string;
  measureKey: string;
  measureLabel: string;
  kind: "line" | "bar";
  points: { label: string; value: number }[];
}

/** A chart where the rows fit one (a label and a number); null where they don't. */
export function pickChart(rows: Row[]): ChartSpec | null {
  if (rows.length < 2) return null;
  const labelKey = LABEL_KEYS.find((k) => rows.some((r) => typeof r[k] === "string"));
  if (!labelKey) return null;
  const numeric = (k: string) => rows.some((r) => typeof r[k] === "number") && !HIDDEN.test(k);
  const measureKey =
    PREFERRED_MEASURES.find(numeric) ??
    Object.keys(rows[0]).find((k) => numeric(k) && !/_(at|count)$/.test(k) && !HIDDEN.test(k));
  if (!measureKey) return null;

  const isTime = labelKey === "date" || labelKey === "period";
  const merged = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[labelKey] ?? "");
    const value = row[measureKey];
    if (!label || typeof value !== "number") continue;
    merged.set(label, (merged.get(label) ?? 0) + value);
  }
  let points = Array.from(merged, ([label, value]) => ({ label, value }));
  if (points.length < 2) return null;
  if (isTime) points.sort((a, b) => a.label.localeCompare(b.label));
  else points = points.sort((a, b) => b.value - a.value).slice(0, 12);

  return { labelKey, measureKey, measureLabel: humanize(measureKey), kind: isTime ? "line" : "bar", points };
}
