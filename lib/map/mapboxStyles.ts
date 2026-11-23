/**
 * Style-key -> per-engine source mapping, parallel to the legacy `MAP_LAYERS`
 * raster-URL map in `app/(portal)/tracking/utils.tsx`.
 *
 * "standard" is a real, token-gated Mapbox vector style so the failover logic
 * has a genuine Mapbox-specific failure surface to react to (invalid/rate
 * limited token, etc). Leaflet can use OpenStreetMap by default or Google
 * raster tiles when a caller explicitly opts in for a specific map surface.
 */

import type { RasterTileSource } from "./types";

export type MapStyleKey = "standard" | "satellite" | "hybrid";

const MAPBOX_VECTOR_STYLES: Record<MapStyleKey, string> = {
  standard: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  hybrid: "mapbox://styles/mapbox/satellite-streets-v12",
};

const OSM_RASTER_TILE_URLS: Record<MapStyleKey, string> = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  hybrid: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

const GOOGLE_RASTER_TILE_URLS: Record<MapStyleKey, string> = {
  standard: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  satellite: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

export function resolveMapboxStyleUrl(styleKey: string): string {
  return MAPBOX_VECTOR_STYLES[styleKey as MapStyleKey] ?? MAPBOX_VECTOR_STYLES.standard;
}

export function resolveLeafletTileUrl(styleKey: string, source: RasterTileSource = "osm"): string {
  const urls = source === "google" ? GOOGLE_RASTER_TILE_URLS : OSM_RASTER_TILE_URLS;
  return urls[styleKey as MapStyleKey] ?? urls.standard;
}

export function resolveLeafletAttribution(source: RasterTileSource = "osm"): string {
  return source === "google" ? "Map data &copy; Google" : "&copy; OpenStreetMap contributors";
}
