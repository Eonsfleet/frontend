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
    return !!process.env.NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY;
  }

  async findNearestImage(point: StreetImageryPoint): Promise<StreetImageryMetadata | null> {
    if (!this.isConfigured()) this.fail("provider-not-configured", "NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY is not set");
    return {
      imageId: `${point.lat},${point.lng}`,
      provider: "google",
      position: point,
      capturedAt: null,
      bearing: null,
      distanceMeters: 0,
    };
  }

  async mount(container: HTMLElement, image: StreetImageryMetadata): Promise<void> {
    const key = process.env.NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY;
    if (!key) this.fail("provider-not-configured", "NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY is not set");

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
    const key = process.env.NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY;
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
