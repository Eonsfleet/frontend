import { getGoogleMapsKey } from "../map/google";
import type { StreetImageryProvider, StreetImageryProviderKind } from "./types";

/**
 * Priority order: Google Street View when a Google key is set, Mapillary (free)
 * otherwise, then no-coverage. Lazy-imports each provider module so an org without a Google
 * key never pulls in that module, and a session that never opens Street
 * View never pulls in either.
 */
export function getAvailableProviderKinds(): StreetImageryProviderKind[] {
  const kinds: StreetImageryProviderKind[] = [];
  if (getGoogleMapsKey()) kinds.push("google");
  if (process.env.NEXT_PUBLIC_MAPILLARY_TOKEN) kinds.push("mapillary");
  return kinds;
}

/** The user's choice when it is configured, otherwise Google first, then Mapillary. */
export function resolveAvailableProviderKind(preferred?: StreetImageryProviderKind | null): StreetImageryProviderKind | null {
  const available = getAvailableProviderKinds();
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? null;
}

export async function createStreetImageryProvider(kind: StreetImageryProviderKind): Promise<StreetImageryProvider> {
  if (kind === "mapillary") {
    const { MapillaryProvider } = await import("./providers/MapillaryProvider");
    return new MapillaryProvider();
  }
  const { GoogleStreetViewProvider } = await import("./providers/GoogleStreetViewProvider");
  return new GoogleStreetViewProvider();
}
