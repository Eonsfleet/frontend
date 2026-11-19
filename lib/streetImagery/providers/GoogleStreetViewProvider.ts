import { getGoogleMapsKey } from "../../map/google";
import { MAX_SEARCH_RADIUS_METERS } from "../config";
import type { StreetImageryError, StreetImageryErrorCode, StreetImageryMetadata, StreetImageryPoint, StreetImageryProvider } from "../types";

/**
 * Fallback provider — wraps today's existing Google Maps Embed API iframe
 * behind the shared interface. Known limitation (documented, not a bug):
 * the Embed API can't report panorama availability ahead of time or expose
 * viewing-direction/navigation events the way the paid JS API
 * (`google.maps.StreetViewService`/`StreetViewPanorama`) can — so
 * `findNearestImage` always returns a synthetic hit at the requested point
 * (capturedAt/bearing unknown), and `onBearingChange`/`onPositionChange`
 * never fire. Upgrading to the JS API for real availability checks and
 * connected-view navigation is a follow-up, not part of this phase.
 */
export class GoogleStreetViewProvider implements StreetImageryProvider {
  readonly kind = "google" as const;

  private iframe: HTMLIFrameElement | null = null;
  private position: StreetImageryPoint | null = null;
  private heading = 0;
  private errorCbs = new Set<(error: StreetImageryError) => void>();

  isConfigured(): boolean {
    return !!getGoogleMapsKey();
  }

  async findNearestImage(point: StreetImageryPoint): Promise<StreetImageryMetadata | null> {
    const key = getGoogleMapsKey();
    if (!key) this.fail("provider-not-configured", "NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set");
    // The metadata endpoint is free and reports real coverage, so we can show "no imagery" honestly.
    try {
      const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${point.lat},${point.lng}&radius=${MAX_SEARCH_RADIUS_METERS}&source=outdoor&key=${key}`;
      const res = await fetch(url);
      const json = (await res.json()) as { status: string; location?: { lat: number; lng: number }; date?: string };
      if (json.status === "ZERO_RESULTS") return null;
      if (json.status === "OK" && json.location) {
        return {
          imageId: `${json.location.lat},${json.location.lng}`,
          provider: "google",
          position: json.location,
          capturedAt: json.date ?? null,
          bearing: null,
          distanceMeters: 0,
        };
      }
      if (json.status === "REQUEST_DENIED") this.fail("provider-not-configured", "Google key rejected (enable Street View Static API)");
    } catch (e) {
      if ((e as { code?: string })?.code) throw e;
    }
    return { imageId: `${point.lat},${point.lng}`, provider: "google", position: point, capturedAt: null, bearing: null, distanceMeters: 0 };
  }

  async mount(container: HTMLElement, image: StreetImageryMetadata): Promise<void> {
    const key = getGoogleMapsKey();
    if (!key) this.fail("provider-not-configured", "NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set");

    this.position = image.position;
    this.heading = image.bearing ?? 0;

    const iframe = document.createElement("iframe");
    iframe.title = "Street View";
    iframe.className = "h-full w-full border-0";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    iframe.src = this.buildSrc(key);
    container.appendChild(iframe);
    this.iframe = iframe;
  }

  unmount(): void {
    this.iframe?.remove();
    this.iframe = null;
    this.position = null;
  }

  /**
   * The Embed API exposes no JS handle to the live panorama, so "rotating"
   * means rebuilding the iframe src with an updated `heading` param — a full
   * reload of the embed rather than a smooth in-place pan (unlike Mapillary).
   */
  rotate(deltaDegrees: number): void {
    const key = getGoogleMapsKey();
    if (!this.iframe || !this.position || !key) return;
    this.heading = ((this.heading + deltaDegrees) % 360 + 360) % 360;
    this.iframe.src = this.buildSrc(key);
  }

  private buildSrc(key: string): string {
    const { lat, lng } = this.position!;
    return `https://www.google.com/maps/embed/v1/streetview?key=${key}&location=${lat},${lng}&heading=${this.heading}`;
  }

  onBearingChange(): () => void {
    return () => {};
  }

  onPositionChange(): () => void {
    return () => {};
  }

  onError(cb: (error: StreetImageryError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  private fail(code: StreetImageryErrorCode, message: string, cause?: unknown): never {
    const error: StreetImageryError = { code, message, cause };
    this.errorCbs.forEach((cb) => cb(error));
    throw error;
  }
}
