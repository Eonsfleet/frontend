/**
 * Provider-agnostic street-level imagery contract. Mirrors the shape of
 * lib/map/types.ts's MapProvider — feature code (StreetImageryPanel) never
 * imports `mapillary-js` or the Google embed directly.
 */

export type StreetImageryProviderKind = "mapillary" | "google";

export interface StreetImageryPoint {
  lat: number;
  lng: number;
}

export interface StreetImageryMetadata {
  imageId: string;
  provider: StreetImageryProviderKind;
  position: StreetImageryPoint;
  /** ISO timestamp the image was captured, or null if the provider doesn't expose one. */
  capturedAt: string | null;
  /** Compass heading in degrees, or null if unknown. */
  bearing: number | null;
  /** Distance in meters from the point that was searched. */
  distanceMeters: number;
}

export type StreetImageryErrorCode =
  | "no-coverage"
  | "provider-not-configured"
  | "invalid-coordinates"
  | "auth-failed"
  | "rate-limited"
  | "network-error"
  | "init-failed"
  | "unknown";

export interface StreetImageryError {
  code: StreetImageryErrorCode;
  message: string;
  cause?: unknown;
}

export interface StreetImageryProvider {
  readonly kind: StreetImageryProviderKind;

  isConfigured(): boolean;

  /** Walks the caller-provided radius; returns null if nothing is found within it. */
  findNearestImage(point: StreetImageryPoint, radiusMeters: number): Promise<StreetImageryMetadata | null>;

  mount(container: HTMLElement, image: StreetImageryMetadata): Promise<void>;
  unmount(): void;

  /** Rotates the current view horizontally. Positive = clockwise/right, negative = counter-clockwise/left. */
  rotate(deltaDegrees: number): void;

  /** Fires when the viewer's viewing direction changes (including on connected-image navigation). */
  onBearingChange(cb: (bearing: number) => void): () => void;
  /** Fires when the user navigates to a connected image within the viewer. */
  onPositionChange(cb: (metadata: StreetImageryMetadata) => void): () => void;
  onError(cb: (error: StreetImageryError) => void): () => void;
}
