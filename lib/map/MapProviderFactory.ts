import type { MapProvider, MapProviderKind } from "./types";

/**
 * Lazy factory: `mapbox-gl` is only imported when the Mapbox path is actually
 * used, so it never bloats the bundle for sessions that run on Leaflet only
 * (sticky-fallback sessions, or environments without a Mapbox token).
 */
export async function createMapProvider(kind: MapProviderKind): Promise<MapProvider> {
  if (kind === "mapbox") {
    const { MapboxProvider } = await import("./providers/MapboxProvider");
    return new MapboxProvider();
  }
  const { LeafletProvider } = await import("./providers/LeafletProvider");
  return new LeafletProvider();
}
