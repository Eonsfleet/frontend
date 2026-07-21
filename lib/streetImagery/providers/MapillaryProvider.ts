import { Viewer, type ViewerBearingEvent, type ViewerImageEvent } from "mapillary-js";
import "mapillary-js/dist/mapillary.css";
import type {
  StreetImageryError,
  StreetImageryErrorCode,
  StreetImageryMetadata,
  StreetImageryPoint,
  StreetImageryProvider,
} from "../types";
import { distanceMeters } from "../geo";

const GRAPH_API_URL = "https://graph.mapillary.com/images";
const METERS_PER_DEGREE_LAT = 111_320;

/** Mapillary's Graph API filters images by bounding box, not point+radius. */
function bboxFromPointRadius(point: StreetImageryPoint, radiusMeters: number): string {
  const latDelta = radiusMeters / METERS_PER_DEGREE_LAT;
  const lngDelta = radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos((point.lat * Math.PI) / 180));
  const west = point.lng - lngDelta;
  const south = point.lat - latDelta;
  const east = point.lng + lngDelta;
  const north = point.lat + latDelta;
  return `${west},${south},${east},${north}`;
}

interface MapillaryImageLike {
  id: string;
  lngLat: { lat: number; lng: number };
  capturedAt?: number;
  compassAngle?: number;
}

/**
 * Primary street imagery provider — the Mapillary Graph API (client tokens
 * are designed for direct browser use, unlike a server secret, so no backend
 * proxy is required) for nearest-image lookup, and `mapillary-js` for the
 * viewer itself. Both are static imports here — code-splitting/lazy-loading
 * happens one level up, in StreetImageryProviderFactory's dynamic import of
 * this module, mirroring lib/map/MapProviderFactory's pattern for Mapbox.
 */
export class MapillaryProvider implements StreetImageryProvider {
  readonly kind = "mapillary" as const;

  private viewer: Viewer | null = null;
  private current: StreetImageryMetadata | null = null;
  private bearingCbs = new Set<(bearing: number) => void>();
  private positionCbs = new Set<(metadata: StreetImageryMetadata) => void>();
  private errorCbs = new Set<(error: StreetImageryError) => void>();

  isConfigured(): boolean {
    return !!process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
  }

  async findNearestImage(point: StreetImageryPoint, radiusMeters: number): Promise<StreetImageryMetadata | null> {
    const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
    if (!token) this.fail("provider-not-configured", "NEXT_PUBLIC_MAPILLARY_TOKEN is not set");

    const params = new URLSearchParams({
      access_token: token!,
      fields: "id,captured_at,compass_angle,geometry",
      bbox: bboxFromPointRadius(point, radiusMeters),
      limit: "10",
    });
    const url = `${GRAPH_API_URL}?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (cause) {
      console.error("[MapillaryProvider] fetch failed (network/CORS)", cause);
      return this.fail("network-error", "Failed to reach the Mapillary imagery service", cause);
    }

    if (response.status === 401 || response.status === 403) {
      console.error("[MapillaryProvider] auth rejected", response.status, await response.text().catch(() => ""));
      return this.fail("auth-failed", "Mapillary rejected the configured access token");
    }
    if (response.status === 429) {
      return this.fail("rate-limited", "Mapillary rate limit reached");
    }
    if (!response.ok) {
      console.error("[MapillaryProvider] non-OK response", response.status, await response.text().catch(() => ""));
      return this.fail("network-error", `Mapillary responded with ${response.status}`);
    }

    let body: { data?: Array<{ id: string; captured_at?: number; compass_angle?: number; geometry?: { coordinates?: [number, number] } }> };
    try {
      body = await response.json();
    } catch (cause) {
      console.error("[MapillaryProvider] failed to parse response body as JSON", cause);
      return this.fail("network-error", "Mapillary returned an unexpected response", cause);
    }
    const items = body?.data ?? [];

    let nearest: { id: string; capturedAt?: number; bearing?: number; position: StreetImageryPoint; distance: number } | null = null;
    for (const item of items) {
      const coords = item.geometry?.coordinates;
      if (!coords) continue;
      const position: StreetImageryPoint = { lat: coords[1], lng: coords[0] };
      const distance = distanceMeters(point, position);
      if (!nearest || distance < nearest.distance) {
        nearest = { id: item.id, capturedAt: item.captured_at, bearing: item.compass_angle, position, distance };
      }
    }

    if (!nearest) return null;

    return {
      imageId: nearest.id,
      provider: "mapillary",
      position: nearest.position,
      capturedAt: nearest.capturedAt ? new Date(nearest.capturedAt).toISOString() : null,
      bearing: nearest.bearing ?? null,
      distanceMeters: nearest.distance,
    };
  }

  async mount(container: HTMLElement, image: StreetImageryMetadata): Promise<void> {
    const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
    if (!token) this.fail("provider-not-configured", "NEXT_PUBLIC_MAPILLARY_TOKEN is not set");

    // Defensive: never stack a second viewer on top of an existing one.
    this.unmount();

    try {
      const viewer = new Viewer({ accessToken: token!, container, imageId: image.imageId });
      this.viewer = viewer;
      this.current = image;

      viewer.on("bearing", (e: ViewerBearingEvent) => {
        this.bearingCbs.forEach((cb) => cb(e.bearing));
      });

      viewer.on("image", (e: ViewerImageEvent) => {
        const metadata = this.toMetadata(e.image as unknown as MapillaryImageLike, image.position);
        this.current = metadata;
        this.positionCbs.forEach((cb) => cb(metadata));
      });
    } catch (cause) {
      console.error("[MapillaryProvider] viewer init failed", cause);
      this.fail("init-failed", "MapillaryJS viewer failed to initialize", cause);
    }
  }

  unmount(): void {
    this.viewer?.remove();
    this.viewer = null;
    this.current = null;
  }

  rotate(deltaDegrees: number): void {
    const viewer = this.viewer;
    if (!viewer) return;
    // Basic image coordinates are normalized [0,1] across the full spherical
    // panorama, so a horizontal-only rotation is just a wrapped shift of x.
    void viewer.getCenter().then(([x, y]) => {
      const nextX = (((x + deltaDegrees / 360) % 1) + 1) % 1;
      viewer.setCenter([nextX, y]);
    });
  }

  onBearingChange(cb: (bearing: number) => void): () => void {
    this.bearingCbs.add(cb);
    return () => this.bearingCbs.delete(cb);
  }

  onPositionChange(cb: (metadata: StreetImageryMetadata) => void): () => void {
    this.positionCbs.add(cb);
    return () => this.positionCbs.delete(cb);
  }

  onError(cb: (error: StreetImageryError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  private toMetadata(image: MapillaryImageLike, requestedPoint: StreetImageryPoint): StreetImageryMetadata {
    return {
      imageId: image.id,
      provider: "mapillary",
      position: image.lngLat,
      capturedAt: image.capturedAt ? new Date(image.capturedAt).toISOString() : null,
      bearing: image.compassAngle ?? null,
      distanceMeters: distanceMeters(requestedPoint, image.lngLat),
    };
  }

  private fail(code: StreetImageryErrorCode, message: string, cause?: unknown): never {
    const error: StreetImageryError = { code, message, cause };
    this.errorCbs.forEach((cb) => cb(error));
    throw error;
  }
}
