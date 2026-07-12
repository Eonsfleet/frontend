import type { MapProviderErrorCode } from "../types";

const STICKY_FALLBACK_KEY = "eonsfleet.map.stickyFallback";
const STICKY_FALLBACK_TTL_MS = 10 * 60_000;

export interface MapboxErrorEventLike {
  error?: (Error & { status?: number }) | undefined;
  status?: number;
}

export function classifyMapboxError(e: MapboxErrorEventLike): MapProviderErrorCode {
  const status = e.error?.status ?? e.status;
  if (status === 401 || status === 403) return "token-invalid";
  if (status === 429) return "rate-limited";
  if (status) return "network-error";
  return "tile-error";
}

/**
 * Sticky-fallback policy: once Mapbox has failed once in this session, stay on
 * Leaflet for the rest of the session (or until the TTL lapses) instead of
 * silently retrying Mapbox mid-session — a user shouldn't experience the
 * failover jank twice in one visit. The short TTL means a transient outage
 * doesn't downgrade the user for the rest of the day.
 */
export function recordMapboxFailover(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STICKY_FALLBACK_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode / disabled) — non-fatal, just
    // means every remount re-attempts Mapbox, which is an acceptable fallback.
  }
}

export function shouldStartInFallback(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const recordedAt = window.sessionStorage.getItem(STICKY_FALLBACK_KEY);
    if (!recordedAt) return false;
    return Date.now() - Number(recordedAt) < STICKY_FALLBACK_TTL_MS;
  } catch {
    return false;
  }
}

export function clearMapboxFailover(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STICKY_FALLBACK_KEY);
  } catch {
    // no-op
  }
}
