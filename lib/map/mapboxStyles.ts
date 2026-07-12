/**
 * Style-key -> per-engine source mapping, parallel to the old `MAP_LAYERS`
 * raster-URL map in `app/(portal)/tracking/utils.tsx`.
 *
 * "standard" is a real, token-gated Mapbox vector style so the failover logic
 * has a genuine Mapbox-specific failure surface to react to (invalid/rate
 * limited token, etc). "satellite"/"hybrid" stay on the existing ArcGIS/Google
 * raster sources on both engines — unaffected by the Mapbox token, which keeps
 * the blast radius of a Mapbox outage limited to the standard style only.
 */

export type MapStyleKey = "standard" | "satellite" | "hybrid";

const MAPBOX_VECTOR_STYLES: Record<MapStyleKey, string> = {
  standard: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  hybrid: "mapbox://styles/mapbox/satellite-streets-v12",
};

const RASTER_TILE_URLS: Record<MapStyleKey, string> = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

export function resolveMapboxStyleUrl(styleKey: string): string {
  return MAPBOX_VECTOR_STYLES[styleKey as MapStyleKey] ?? MAPBOX_VECTOR_STYLES.standard;
}

export function resolveLeafletTileUrl(styleKey: string): string {
  return RASTER_TILE_URLS[styleKey as MapStyleKey] ?? RASTER_TILE_URLS.standard;
}
