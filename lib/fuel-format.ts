import type { LevelBasis } from "@/lib/api/fuelPage";

/** How a figure was obtained. "estimated" is a model or a rate, never a reading. */
export type Quality = LevelBasis | "estimated";

const DASH = "—";

/**
 * A litre figure with its basis written into the text: a calculated or
 * estimated figure carries "≈", a measured one does not, and an unknown one is
 * a dash, never "0 L".
 */
export function formatLitres(
  litres: number | null | undefined,
  quality: Quality | null = "measured",
  digits = 1,
): string {
  if (litres == null || !Number.isFinite(litres)) return DASH;
  const text = `${litres.toLocaleString("en-NG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} L`;
  return quality === "calculated" || quality === "estimated"
    ? `≈ ${text}`
    : text;
}

export function formatNaira(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return DASH;
  return `₦${Math.round(value).toLocaleString("en-NG")}`;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 0,
  unit = "",
): string {
  if (value == null || !Number.isFinite(value)) return DASH;
  const text = value.toLocaleString("en-NG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return unit ? `${text} ${unit}` : text;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return DASH;
  return `${value.toFixed(digits)}%`;
}

/** "3 min ago", "2 h ago", "5 d ago"; a missing age is a dash, not "just now". */
export function formatAge(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return DASH;
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  return `${Math.floor(minutes / 1440)} d ago`;
}

/** Time to empty: minutes under an hour, else hours. Null means it is not emptying or unknown. */
export function formatHoursToEmpty(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return DASH;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  return `${hours.toLocaleString("en-NG", { maximumFractionDigits: 1 })} h`;
}

export function formatChange(percent: number | null | undefined): string {
  if (percent == null || !Number.isFinite(percent)) return DASH;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

export type Sentiment = "good" | "bad" | "flat";

/**
 * Whether a change is good news. For spend, litres and idling a rise is bad
 * (higherIsBad); under one percent is flat so noise does not colour the page.
 */
export function changeSentiment(
  percent: number | null | undefined,
  higherIsBad = true,
): Sentiment | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  if (Math.abs(percent) < 1) return "flat";
  return percent > 0 === higherIsBad ? "bad" : "good";
}

/** Whole minutes between an ISO time and `now`, never negative; null when the time is missing or unreadable. */
export function ageMinutes(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? Math.max(0, Math.floor((now - at) / 60000)) : null;
}
