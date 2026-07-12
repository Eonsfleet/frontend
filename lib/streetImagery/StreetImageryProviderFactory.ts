import type { StreetImageryProvider, StreetImageryProviderKind } from "./types";

/**
 * Priority order: Mapillary first, Google Street View as fallback, then
 * no-coverage. Lazy-imports each provider module so an org without a Google
 * key never pulls in that module, and a session that never opens Street
 * View never pulls in either.
 */
export function resolveAvailableProviderKind(): StreetImageryProviderKind | null {
  if (process.env.NEXT_PUBLIC_MAPILLARY_TOKEN) return "mapillary";
  if (process.env.NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY) return "google";
  return null;
}

export async function createStreetImageryProvider(kind: StreetImageryProviderKind): Promise<StreetImageryProvider> {
  if (kind === "mapillary") {
    const { MapillaryProvider } = await import("./providers/MapillaryProvider");
    return new MapillaryProvider();
  }
  const { GoogleStreetViewProvider } = await import("./providers/GoogleStreetViewProvider");
  return new GoogleStreetViewProvider();
}
