/**
 * Provider-agnostic map contract. Both `MapboxProvider` and `LeafletProvider`
 * implement this so feature code (TrackingMap, PlaybackMap, controls) never
 * imports `mapbox-gl` or `leaflet` directly.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type MapProviderKind = "mapbox" | "leaflet";

export type MapProviderErrorCode =
  | "init-failed"
  | "token-invalid"
  | "rate-limited"
  | "tile-error"
  | "network-error"
  | "webgl-context-lost"
  | "mount-timeout"
  | "unknown";

export interface MapProviderError {
  code: MapProviderErrorCode;
  message: string;
  cause?: unknown;
}

export interface OverlayStyle {
  color: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dashed?: boolean;
}

export interface MarkerIconSize {
  /** [width, height] in px. Omit to let the element size itself via CSS. */
  iconSize?: [number, number];
  /** [x, y] px offset from the icon's top-left to the anchor (lat/lng) point. */
  iconAnchor?: [number, number];
}

export interface MapMarkerHandle {
  id: string;
  setPosition(lat: number, lng: number): void;
  /** Rotates only the inner `.marker-base` node — never the whole marker root. */
  setRotation(deg: number): void;
  /** Rebuild marker HTML. Call only on visual-state change, never per animation frame. */
  setHtml(html: string, size?: MarkerIconSize): void;
  setZIndexOffset(z: number): void;
  getElement(): HTMLElement | null;
  /** Stable DOM node to portal React popup content into (both engines guarantee one). */
  getPopupContainer(): HTMLElement;
  openPopup(): void;
  closePopup(): void;
  isPopupOpen(): boolean;
  destroy(): void;
}

export interface MapProviderMountOptions {
  center: LatLng;
  zoom: number;
  /** Style key resolved by the caller (e.g. TrackingMapStyle); provider maps it internally. */
  styleKey: string;
}

export interface MapProvider {
  readonly kind: MapProviderKind;

  mount(container: HTMLElement, opts: MapProviderMountOptions): Promise<void>;
  unmount(): void;

  setStyle(styleKey: string): void;

  getCenter(): LatLng;
  getZoom(): number;
  setView(center: LatLng, zoom: number): void;
  flyTo(center: LatLng, zoom: number, opts?: { durationMs?: number }): void;
  fitBounds(points: LatLng[], opts?: { paddingPx?: number; maxZoom?: number }): void;
  zoomIn(): void;
  zoomOut(): void;

  /** Fires on user-initiated drag/zoom start — used to disable auto-follow. */
  onInteractionStart(cb: () => void): () => void;
  /** Fires when the camera comes to rest — used to cache last-known viewport. */
  onCameraSettle(cb: (center: LatLng, zoom: number) => void): () => void;

  addMarker(
    id: string,
    init: {
      lat: number;
      lng: number;
      html: string;
      zIndexOffset?: number;
      onClick?: () => void;
    } & MarkerIconSize,
  ): MapMarkerHandle;
  removeMarker(id: string): void;
  getMarker(id: string): MapMarkerHandle | undefined;

  setPolyline(key: string, points: LatLng[], style: OverlayStyle): void;
  setCircle(key: string, center: LatLng, radiusMeters: number, style: OverlayStyle, tooltip?: string): void;
  setPolygon(key: string, points: LatLng[], style: OverlayStyle, tooltip?: string): void;
  removeOverlay(key: string): void;

  onError(cb: (error: MapProviderError) => void): () => void;
}
