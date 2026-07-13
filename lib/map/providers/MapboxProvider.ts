import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  LatLng,
  MapMarkerHandle,
  MapProvider,
  MapProviderError,
  MapProviderMountOptions,
  MarkerIconSize,
  OverlayStyle,
} from "../types";
import { resolveMapboxStyleUrl } from "../mapboxStyles";
import { classifyMapboxError, type MapboxErrorEventLike } from "../health/mapboxHealth";

const MOUNT_TIMEOUT_MS = 8000;
const TILE_ERROR_WINDOW_MS = 10_000;
const TILE_ERROR_THRESHOLD = 5;

class MapboxMarkerHandle implements MapMarkerHandle {
  private el: HTMLDivElement;
  private popupEl: HTMLDivElement;
  private popup: mapboxgl.Popup;
  private anchor: [number, number] = [0, 0];

  constructor(
    public id: string,
    private marker: mapboxgl.Marker,
    element: HTMLDivElement,
  ) {
    this.el = element;
    this.popupEl = document.createElement("div");
    this.popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "custom-popup",
      offset: 0,
      anchor: "bottom",
    }).setDOMContent(this.popupEl);
    marker.setPopup(this.popup);
  }

  setPosition(lat: number, lng: number): void {
    this.marker.setLngLat([lng, lat]);
  }

  setRotation(deg: number): void {
    const base = this.el.querySelector<HTMLElement>(".marker-base");
    if (base) base.style.transform = `rotate(${deg}deg)`;
  }

  setHtml(html: string, size?: MarkerIconSize): void {
    this.el.innerHTML = html;
    if (size?.iconAnchor) {
      this.anchor = size.iconAnchor;
      this.marker.setOffset([-size.iconAnchor[0], -size.iconAnchor[1]]);
    }
  }

  setZIndexOffset(z: number): void {
    this.el.style.zIndex = String(1000 + z);
  }

  getElement(): HTMLElement | null {
    return this.el;
  }

  getPopupContainer(): HTMLElement {
    return this.popupEl;
  }

  openPopup(): void {
    if (!this.popup.isOpen()) this.marker.togglePopup();
  }

  closePopup(): void {
    if (this.popup.isOpen()) this.marker.togglePopup();
  }

  isPopupOpen(): boolean {
    return this.popup.isOpen();
  }

  destroy(): void {
    this.popup.remove();
    this.marker.remove();
  }
}

/** Approximates a meter-radius circle as an N-gon polygon (no turf dependency). */
function circlePolygon(center: LatLng, radiusMeters: number, steps = 64): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadius = 6378137;
  const latRad = (center.lat * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const dLat = dy / earthRadius;
    const dLng = dx / (earthRadius * Math.cos(latRad));
    coords.push([center.lng + (dLng * 180) / Math.PI, center.lat + (dLat * 180) / Math.PI]);
  }
  return coords;
}

/**
 * Native mapboxgl.Map + mapboxgl.Marker (DOM-based) implementation.
 *
 * DOM markers (not GL symbol layers / `cluster: true`) are used deliberately —
 * native GeoJSON clustering has no stable per-feature handle, which would
 * reintroduce the same "frozen marker" bug class this codebase already fixed
 * once on the Leaflet side. DOM markers preserve one imperative handle per
 * vehicle for the whole marker lifetime, which the rAF motion loop requires.
 */
export class MapboxProvider implements MapProvider {
  readonly kind = "mapbox" as const;

  private map: mapboxgl.Map | null = null;
  private markers = new Map<string, MapboxMarkerHandle>();
  private overlayPopups = new Map<string, mapboxgl.Popup>();
  private errorCbs = new Set<(e: MapProviderError) => void>();
  private tileErrorTimestamps: number[] = [];
  private mountTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  async mount(container: HTMLElement, opts: MapProviderMountOptions): Promise<void> {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      const err: MapProviderError = { code: "token-invalid", message: "NEXT_PUBLIC_MAPBOX_TOKEN is not set" };
      this.emitError(err);
      throw new Error(err.message);
    }
    mapboxgl.accessToken = token;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      try {
        const map = new mapboxgl.Map({
          container,
          style: resolveMapboxStyleUrl(opts.styleKey),
          center: [opts.center.lng, opts.center.lat],
          zoom: opts.zoom,
          attributionControl: true,
        });
        this.map = map;

        this.mountTimeoutHandle = setTimeout(() => {
          if (settled) return;
          settled = true;
          const err: MapProviderError = { code: "mount-timeout", message: "Mapbox style failed to load in time" };
          this.emitError(err);
          reject(new Error(err.message));
        }, MOUNT_TIMEOUT_MS);

        map.on("load", () => {
          if (settled) return;
          settled = true;
          if (this.mountTimeoutHandle) clearTimeout(this.mountTimeoutHandle);
          resolve();
        });

        map.on("error", (e: MapboxErrorEventLike) => {
          const code = classifyMapboxError(e);
          if (code === "tile-error") {
            const now = Date.now();
            this.tileErrorTimestamps.push(now);
            this.tileErrorTimestamps = this.tileErrorTimestamps.filter((t) => now - t < TILE_ERROR_WINDOW_MS);
            if (this.tileErrorTimestamps.length < TILE_ERROR_THRESHOLD) return;
          }
          this.emitError({ code, message: e?.error?.message ?? "Mapbox error", cause: e });
          if (!settled && code !== "tile-error") {
            settled = true;
            if (this.mountTimeoutHandle) clearTimeout(this.mountTimeoutHandle);
            reject(new Error(`Mapbox failed to initialize: ${code}`));
          }
        });

        map.on("webglcontextlost", () => {
          this.emitError({ code: "webgl-context-lost", message: "WebGL context lost" });
        });
      } catch (cause) {
        const err: MapProviderError = { code: "init-failed", message: "Mapbox GL failed to construct", cause };
        this.emitError(err);
        reject(cause);
      }
    });
  }

  unmount(): void {
    if (this.mountTimeoutHandle) clearTimeout(this.mountTimeoutHandle);
    this.markers.forEach((m) => m.destroy());
    this.markers.clear();
    this.overlayPopups.forEach((p) => p.remove());
    this.overlayPopups.clear();
    this.map?.remove();
    this.map = null;
  }

  setStyle(styleKey: string): void {
    this.map?.setStyle(resolveMapboxStyleUrl(styleKey));
  }

  getCenter(): LatLng {
    const c = this.map!.getCenter();
    return { lat: c.lat, lng: c.lng };
  }

  getZoom(): number {
    return this.map!.getZoom();
  }

  setView(center: LatLng, zoom: number): void {
    this.map?.jumpTo({ center: [center.lng, center.lat], zoom });
  }

  flyTo(center: LatLng, zoom: number, opts?: { durationMs?: number }): void {
    this.map?.flyTo({ center: [center.lng, center.lat], zoom, duration: opts?.durationMs ?? 1000 });
  }

  fitBounds(points: LatLng[], opts?: { paddingPx?: number; maxZoom?: number }): void {
    if (!this.map || points.length === 0) return;
    const bounds = points.reduce(
      (b, p) => b.extend([p.lng, p.lat]),
      new mapboxgl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]),
    );
    this.map.fitBounds(bounds, { padding: opts?.paddingPx ?? 100, maxZoom: opts?.maxZoom ?? 14 });
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  onInteractionStart(cb: () => void): () => void {
    if (!this.map) return () => {};
    this.map.on("dragstart", cb);
    this.map.on("zoomstart", cb);
    return () => {
      this.map?.off("dragstart", cb);
      this.map?.off("zoomstart", cb);
    };
  }

  onCameraSettle(cb: (center: LatLng, zoom: number) => void): () => void {
    if (!this.map) return () => {};
    const handler = () => {
      const c = this.map!.getCenter();
      cb({ lat: c.lat, lng: c.lng }, this.map!.getZoom());
    };
    this.map.on("moveend", handler);
    this.map.on("zoomend", handler);
    return () => {
      this.map?.off("moveend", handler);
      this.map?.off("zoomend", handler);
    };
  }

  addMarker(
    id: string,
    init: { lat: number; lng: number; html: string; zIndexOffset?: number; onClick?: () => void } & MarkerIconSize,
  ): MapMarkerHandle {
    const el = document.createElement("div");
    el.className = "custom-marker-wrapper";
    el.innerHTML = init.html;
    if (init.onClick) {
      el.tabIndex = 0;
      el.addEventListener("click", init.onClick);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") init.onClick!();
      });
    }
    if (init.zIndexOffset) el.style.zIndex = String(1000 + init.zIndexOffset);

    const offset: [number, number] = init.iconAnchor ? [-init.iconAnchor[0], -init.iconAnchor[1]] : [0, 0];
    const marker = new mapboxgl.Marker({ element: el, anchor: "top-left", offset })
      .setLngLat([init.lng, init.lat])
      .addTo(this.map!);

    const handle = new MapboxMarkerHandle(id, marker, el);
    this.markers.set(id, handle);
    return handle;
  }

  removeMarker(id: string): void {
    this.markers.get(id)?.destroy();
    this.markers.delete(id);
  }

  getMarker(id: string): MapMarkerHandle | undefined {
    return this.markers.get(id);
  }

  setPolyline(key: string, points: LatLng[], style: OverlayStyle): void {
    if (!this.map || points.length < 2) return;
    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
    };
    this.upsertSourceAndLayer(key, data, () => ({
      id: key,
      type: "line",
      source: key,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": style.color,
        "line-width": style.weight ?? 4,
        "line-opacity": style.opacity ?? 0.85,
        ...(style.dashed ? { "line-dasharray": [2, 2] } : {}),
      },
    }));
  }

  setCircle(key: string, center: LatLng, radiusMeters: number, style: OverlayStyle, tooltip?: string): void {
    if (!this.map) return;
    const data: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [circlePolygon(center, radiusMeters)] },
    };
    this.upsertSourceAndLayer(key, data, () => ({
      id: key,
      type: "fill",
      source: key,
      paint: {
        "fill-color": style.fillColor ?? style.color,
        "fill-opacity": style.fillOpacity ?? 0.2,
        "fill-outline-color": style.color,
      },
    }));
    this.setOverlayTooltip(key, center, tooltip);
  }

  setPolygon(key: string, points: LatLng[], style: OverlayStyle, tooltip?: string): void {
    if (!this.map || points.length === 0) return;
    const data: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [points.map((p) => [p.lng, p.lat])] },
    };
    this.upsertSourceAndLayer(key, data, () => ({
      id: key,
      type: "fill",
      source: key,
      paint: {
        "fill-color": style.fillColor ?? style.color,
        "fill-opacity": style.fillOpacity ?? 0.2,
        "fill-outline-color": style.color,
      },
    }));
    const centroid = points.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat / points.length, lng: acc.lng + p.lng / points.length }),
      { lat: 0, lng: 0 },
    );
    this.setOverlayTooltip(key, centroid, tooltip);
  }

  removeOverlay(key: string): void {
    if (!this.map) return;
    if (this.map.getLayer(key)) this.map.removeLayer(key);
    if (this.map.getSource(key)) this.map.removeSource(key);
    this.overlayPopups.get(key)?.remove();
    this.overlayPopups.delete(key);
  }

  onError(cb: (error: MapProviderError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  private upsertSourceAndLayer(
    key: string,
    data: GeoJSON.Feature,
    layerSpec: () => mapboxgl.AnyLayer,
  ): void {
    if (!this.map) return;
    const existingSource = this.map.getSource(key) as mapboxgl.GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(data);
      return;
    }
    this.map.addSource(key, { type: "geojson", data });
    this.map.addLayer(layerSpec());
  }

  private setOverlayTooltip(key: string, at: LatLng, tooltip?: string): void {
    const existing = this.overlayPopups.get(key);
    if (!tooltip) {
      existing?.remove();
      this.overlayPopups.delete(key);
      return;
    }
    if (existing) {
      existing.setLngLat([at.lng, at.lat]);
      return;
    }
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className:
        "geofence-label-popup bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
    })
      .setLngLat([at.lng, at.lat])
      .setText(tooltip)
      .addTo(this.map!);
    this.overlayPopups.set(key, popup);
  }

  private emitError(error: MapProviderError): void {
    this.errorCbs.forEach((cb) => cb(error));
  }
}
