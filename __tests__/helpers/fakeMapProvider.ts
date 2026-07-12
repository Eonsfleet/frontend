import { vi } from "vitest";
import type { MapMarkerHandle, MapProvider, MapProviderKind } from "@/lib/map/types";

function createFakeMarkerHandle(id: string): MapMarkerHandle {
  return {
    id,
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setHtml: vi.fn(),
    setZIndexOffset: vi.fn(),
    getElement: vi.fn(() => null),
    getPopupContainer: vi.fn(() => document.createElement("div")),
    openPopup: vi.fn(),
    closePopup: vi.fn(),
    isPopupOpen: vi.fn(() => false),
    destroy: vi.fn(),
  };
}

let current: MapProvider | null = null;

/**
 * Test double for MapProvider — used to mock `createMapProvider` from
 * lib/map/MapProviderFactory so component tests don't need real Leaflet/Mapbox
 * instances, and can assert on imperative calls (setPolyline, addMarker, etc.)
 * instead of querying react-leaflet-specific DOM.
 */
export function createFakeMapProvider(kind: MapProviderKind = "mapbox"): MapProvider {
  const markers = new Map<string, MapMarkerHandle>();

  const provider: MapProvider = {
    kind,
    mount: vi.fn(async () => {}),
    unmount: vi.fn(),
    setStyle: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 6.5244, lng: 3.3792 })),
    getZoom: vi.fn(() => 12),
    setView: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    onInteractionStart: vi.fn(() => () => {}),
    onCameraSettle: vi.fn(() => () => {}),
    addMarker: vi.fn((id: string) => {
      const handle = createFakeMarkerHandle(id);
      markers.set(id, handle);
      return handle;
    }),
    removeMarker: vi.fn((id: string) => {
      markers.delete(id);
    }),
    getMarker: vi.fn((id: string) => markers.get(id)),
    setPolyline: vi.fn(),
    setCircle: vi.fn(),
    setPolygon: vi.fn(),
    removeOverlay: vi.fn(),
    onError: vi.fn(() => () => {}),
  };

  current = provider;
  return provider;
}

/** The most recently created fake provider — grab this after render() + waiting for readiness. */
export function getFakeMapProvider(): MapProvider {
  if (!current) throw new Error("No fake map provider has been created yet");
  return current;
}
