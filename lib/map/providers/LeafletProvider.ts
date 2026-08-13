import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  LatLng,
  MapMarkerHandle,
  MapProvider,
  MapProviderError,
  MapProviderMountOptions,
  MarkerIconSize,
  OverlayStyle,
} from "../types";
import { resolveLeafletTileUrl } from "../mapboxStyles";

class LeafletMarkerHandle implements MapMarkerHandle {
  private popupEl: HTMLDivElement;

  constructor(
    public id: string,
    private marker: L.Marker,
  ) {
    this.popupEl = document.createElement("div");
    marker.bindPopup(this.popupEl, {
      autoPan: false,
      closeButton: false,
      className: "custom-popup",
    });
  }

  setPosition(lat: number, lng: number): void {
    this.marker.setLatLng([lat, lng]);
  }

  setRotation(deg: number): void {
    const el = this.marker.getElement();
    const base = el?.querySelector<HTMLElement>(".marker-base");
    if (base) base.style.transform = `rotate(${deg}deg)`;
  }

  setHtml(html: string, size?: MarkerIconSize): void {
    this.marker.setIcon(
      L.divIcon({
        className: "custom-marker-wrapper",
        html,
        iconSize: size?.iconSize,
        iconAnchor: size?.iconAnchor,
      }),
    );
  }

  setZIndexOffset(z: number): void {
    this.marker.setZIndexOffset(z);
  }

  getElement(): HTMLElement | null {
    return this.marker.getElement() ?? null;
  }

  getPopupContainer(): HTMLElement {
    return this.popupEl;
  }

  openPopup(): void {
    this.marker.openPopup();
  }

  closePopup(): void {
    this.marker.closePopup();
  }

  isPopupOpen(): boolean {
    return this.marker.isPopupOpen();
  }

  destroy(): void {
    this.marker.remove();
  }
}

function toLatLngExpr(points: LatLng[]): [number, number][] {
  return points.map((p) => [p.lat, p.lng]);
}

/**
 * Imperative, vanilla-Leaflet implementation of MapProvider — deliberately
 * avoids react-leaflet/JSX so both providers share one mounting model
 * (`mount(container)` owns its own map instance), keeping TrackingMap a thin
 * shell that's agnostic to which engine is active.
 */
export class LeafletProvider implements MapProvider {
  readonly kind = "leaflet" as const;

  private map: L.Map | null = null;
  private markers = new Map<string, LeafletMarkerHandle>();
  private overlays = new Map<string, L.Layer>();
  private errorCbs = new Set<(e: MapProviderError) => void>();
  private tileLayer: L.TileLayer | null = null;
  private styleKey = "standard";

  async mount(container: HTMLElement, opts: MapProviderMountOptions): Promise<void> {
    this.styleKey = opts.styleKey;
    const map = L.map(container, {
      center: [opts.center.lat, opts.center.lng],
      zoom: opts.zoom,
      zoomControl: false,
    });
    this.map = map;
    this.tileLayer = L.tileLayer(resolveLeafletTileUrl(opts.styleKey), {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    this.tileLayer.on("tileerror", (e) => {
      this.emitError({ code: "tile-error", message: "Leaflet tile failed to load", cause: e });
    });
  }

  unmount(): void {
    this.markers.forEach((m) => m.destroy());
    this.markers.clear();
    this.overlays.forEach((layer) => layer.remove());
    this.overlays.clear();
    this.map?.remove();
    this.map = null;
  }

  setStyle(styleKey: string): void {
    if (!this.map || !this.tileLayer) return;
    this.styleKey = styleKey;
    this.tileLayer.setUrl(resolveLeafletTileUrl(styleKey));
  }

  getCenter(): LatLng {
    const c = this.map!.getCenter();
    return { lat: c.lat, lng: c.lng };
  }

  getZoom(): number {
    return this.map!.getZoom();
  }

  setView(center: LatLng, zoom: number): void {
    this.map?.setView([center.lat, center.lng], zoom);
  }

  flyTo(center: LatLng, zoom: number): void {
    this.map?.flyTo([center.lat, center.lng], zoom);
  }

  fitBounds(points: LatLng[], opts?: { paddingPx?: number; maxZoom?: number }): void {
    const validPoints = points.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
    );
    if (!this.map || validPoints.length === 0) return;
    const padding = opts?.paddingPx ?? 100;
    this.map.fitBounds(toLatLngExpr(validPoints), {
      padding: [padding, padding],
      maxZoom: opts?.maxZoom ?? 14,
    });
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
    const marker = L.marker([init.lat, init.lng], {
      icon: L.divIcon({
        className: "custom-marker-wrapper",
        html: init.html,
        iconSize: init.iconSize,
        iconAnchor: init.iconAnchor,
      }),
      zIndexOffset: init.zIndexOffset ?? 0,
    }).addTo(this.map!);

    if (init.onClick) {
      marker.on("click", init.onClick);
      marker.on("keydown", (e: L.LeafletKeyboardEvent) => {
        if (e.originalEvent?.key === "Enter" || e.originalEvent?.key === " ") init.onClick!();
      });
    }

    const handle = new LeafletMarkerHandle(id, marker);
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
    this.removeOverlay(key);
    if (!this.map || points.length < 2) return;
    const layer = L.polyline(toLatLngExpr(points), {
      color: style.color,
      weight: style.weight ?? 4,
      opacity: style.opacity ?? 0.85,
      dashArray: style.dashed ? "10, 10" : undefined,
    }).addTo(this.map);
    this.overlays.set(key, layer);
  }

  setCircle(key: string, center: LatLng, radiusMeters: number, style: OverlayStyle, tooltip?: string): void {
    this.removeOverlay(key);
    if (!this.map) return;
    const layer = L.circle([center.lat, center.lng], {
      radius: radiusMeters,
      color: style.color,
      fillColor: style.fillColor ?? style.color,
      fillOpacity: style.fillOpacity ?? 0.2,
    }).addTo(this.map);
    if (tooltip) {
      layer.bindTooltip(tooltip, {
        sticky: true,
        className:
          "bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
      });
    }
    this.overlays.set(key, layer);
  }

  setPolygon(key: string, points: LatLng[], style: OverlayStyle, tooltip?: string): void {
    this.removeOverlay(key);
    if (!this.map || points.length === 0) return;
    const layer = L.polygon(toLatLngExpr(points), {
      color: style.color,
      fillColor: style.fillColor ?? style.color,
      fillOpacity: style.fillOpacity ?? 0.2,
    }).addTo(this.map);
    if (tooltip) {
      layer.bindTooltip(tooltip, {
        sticky: true,
        className:
          "bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
      });
    }
    this.overlays.set(key, layer);
  }

  removeOverlay(key: string): void {
    const layer = this.overlays.get(key);
    if (layer) {
      layer.remove();
      this.overlays.delete(key);
    }
  }

  onError(cb: (error: MapProviderError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  private emitError(error: MapProviderError): void {
    this.errorCbs.forEach((cb) => cb(error));
  }
}
