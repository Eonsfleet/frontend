"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, LocateFixed, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useStreetImageryStore } from "@/store/streetImageryStore";
import { createStreetImageryProvider, resolveAvailableProviderKind } from "@/lib/streetImagery/StreetImageryProviderFactory";
import { createRequestFence, resolveNearestImage } from "@/lib/streetImagery/cache";
import { COINCIDENT_DISTANCE_METERS, SEARCH_RADII_METERS, SIGNIFICANT_MOVEMENT_METERS } from "@/lib/streetImagery/config";
import { distanceMeters } from "@/lib/streetImagery/geo";
import type {
  StreetImageryError,
  StreetImageryMetadata,
  StreetImageryProvider,
  StreetImageryProviderKind,
} from "@/lib/streetImagery/types";
import { useMapInstance } from "../MapInstanceContext";

interface StreetImageryPanelProps {
  /** Live vehicle locations — used only to detect drift from a live vehicle's frozen snapshot while the panel is open. */
  locations?: Record<string, { lat?: number; lng?: number }>;
}

type PanelStatus = "loading" | "ready" | "no-coverage" | "not-configured" | "error";

const ROTATE_STEP_DEGREES = 30;
const IMAGERY_MARKER_KEY = "street-imagery-position";
const FOV_MARKER_KEY = "street-imagery-fov";
const CONNECTOR_KEY = "street-imagery-connector";

function errorMessage(error: StreetImageryError | null): string {
  if (!error) return "Street-level imagery is temporarily unavailable.";
  switch (error.code) {
    case "auth-failed":
      return "The imagery provider rejected the configured credentials.";
    case "rate-limited":
      return "The imagery provider's rate limit was reached. Try again shortly.";
    case "provider-not-configured":
      return "The imagery provider is not configured.";
    case "invalid-coordinates":
      return "This location doesn't have valid coordinates.";
    case "init-failed":
      return "The imagery viewer failed to initialize.";
    default:
      return "Street-level imagery is temporarily unavailable.";
  }
}

function PanelOverlay({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 px-6 text-center text-xs font-medium text-slate-300">
      {icon}
      {children}
    </div>
  );
}

/**
 * Provider-agnostic street imagery panel — the single consumer of
 * lib/streetImagery/*, opened via useStreetImageryStore().open(...) from any
 * entry point (vehicle popup, playback point, ...). Syncs an imagery marker,
 * field-of-view cone, and connector line onto the active map via
 * useMapInstance() when one is available in the surrounding tree.
 */
export function StreetImageryPanel({ locations }: StreetImageryPanelProps) {
  const { isOpen, requestedPoint, context, close } = useStreetImageryStore();
  const { provider: mapProvider, isReady: isMapReady } = useMapInstance();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [status, setStatus] = useState<PanelStatus>("loading");
  const [error, setError] = useState<StreetImageryError | null>(null);
  const [metadata, setMetadata] = useState<StreetImageryMetadata | null>(null);
  const [providerKind, setProviderKind] = useState<StreetImageryProviderKind | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<StreetImageryProvider | null>(null);
  const fenceRef = useRef(createRequestFence());
  // Frozen snapshot of the requested point — never re-synced to live GPS ticks,
  // so the viewer can't jump around while the vehicle keeps moving underneath it.
  const snapshotRef = useRef(requestedPoint);

  // Look up imagery whenever a new open() call lands.
  useEffect(() => {
    if (!isOpen || !requestedPoint) return;
    snapshotRef.current = requestedPoint;
    const requestId = fenceRef.current.begin();
    setStatus("loading");
    setError(null);
    setMetadata(null);
    setProviderKind(null);
    setHasMoved(false);

    const kind = resolveAvailableProviderKind();
    if (!kind) {
      setStatus("not-configured");
      return;
    }

    let cancelled = false;
    void (async () => {
      const instance = await createStreetImageryProvider(kind);
      if (cancelled || !fenceRef.current.isCurrent(requestId)) return;
      providerRef.current = instance;
      instance.onError((e) => {
        if (!fenceRef.current.isCurrent(requestId)) return;
        console.error("[StreetImageryPanel] provider error", e);
        setError(e);
        setStatus("error");
      });

      try {
        let found: StreetImageryMetadata | null = null;
        for (const radius of SEARCH_RADII_METERS) {
          found = await resolveNearestImage(instance, requestedPoint, radius);
          if (found) break;
        }
        if (cancelled || !fenceRef.current.isCurrent(requestId)) return;
        if (!found) {
          setStatus("no-coverage");
          return;
        }
        setMetadata(found);
        setProviderKind(kind);
        setStatus("ready");
      } catch (e) {
        if (cancelled || !fenceRef.current.isCurrent(requestId)) return;
        console.error("[StreetImageryPanel] imagery lookup failed", e);
        setError(e as StreetImageryError);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, requestedPoint]);

  // Mount the viewer once metadata resolves; re-subscribe on image navigation.
  useEffect(() => {
    if (status !== "ready" || !metadata || !containerRef.current || !providerRef.current) return;
    const instance = providerRef.current;
    const container = containerRef.current;
    let active = true;

    instance.mount(container, metadata).catch((e) => {
      if (!active) return;
      console.error("[StreetImageryPanel] viewer mount failed", e);
      setError(e as StreetImageryError);
      setStatus("error");
    });

    const unsubBearing = instance.onBearingChange((bearing) => {
      setMetadata((prev) => (prev ? { ...prev, bearing } : prev));
    });
    const unsubPosition = instance.onPositionChange((next) => {
      setMetadata(next);
    });

    return () => {
      active = false;
      unsubBearing();
      unsubPosition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, metadata?.imageId]);

  // Tear down the active viewer whenever the panel closes, and on unmount.
  useEffect(() => {
    if (isOpen) return;
    providerRef.current?.unmount();
    providerRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    return () => {
      providerRef.current?.unmount();
      providerRef.current = null;
    };
  }, []);

  // Map sync: imagery marker, FOV cone, connector line — all removed together
  // when the panel closes or a map provider isn't available in this tree.
  useEffect(() => {
    if (!mapProvider || !isMapReady) return;

    if (!isOpen || !metadata) {
      mapProvider.removeMarker(IMAGERY_MARKER_KEY);
      mapProvider.removeMarker(FOV_MARKER_KEY);
      mapProvider.removeOverlay(CONNECTOR_KEY);
      return;
    }

    const positionHtml =
      '<div style="width:22px;height:22px;border-radius:9999px;background:#7c3aed;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>';
    const existingMarker = mapProvider.getMarker(IMAGERY_MARKER_KEY);
    if (!existingMarker) {
      mapProvider.addMarker(IMAGERY_MARKER_KEY, {
        lat: metadata.position.lat,
        lng: metadata.position.lng,
        html: positionHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
    } else {
      existingMarker.setPosition(metadata.position.lat, metadata.position.lng);
    }

    if (metadata.bearing != null) {
      const fovHtml = `<div class="marker-base" style="transform: rotate(${metadata.bearing}deg); width:0; height:0; border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:18px solid rgba(124,58,237,0.55);"></div>`;
      const existingFov = mapProvider.getMarker(FOV_MARKER_KEY);
      if (!existingFov) {
        mapProvider.addMarker(FOV_MARKER_KEY, {
          lat: metadata.position.lat,
          lng: metadata.position.lng,
          html: fovHtml,
          iconSize: [16, 18],
          iconAnchor: [8, 18],
        });
      } else {
        existingFov.setPosition(metadata.position.lat, metadata.position.lng);
        existingFov.setRotation(metadata.bearing);
      }
    } else {
      mapProvider.removeMarker(FOV_MARKER_KEY);
    }

    const requested = snapshotRef.current;
    if (requested && metadata.distanceMeters > COINCIDENT_DISTANCE_METERS) {
      mapProvider.setPolyline(CONNECTOR_KEY, [requested, metadata.position], {
        color: "#7c3aed",
        weight: 2,
        opacity: 0.7,
        dashed: true,
      });
    } else {
      mapProvider.removeOverlay(CONNECTOR_KEY);
    }
  }, [mapProvider, isMapReady, isOpen, metadata]);

  useEffect(() => {
    return () => {
      mapProvider?.removeMarker(IMAGERY_MARKER_KEY);
      mapProvider?.removeMarker(FOV_MARKER_KEY);
      mapProvider?.removeOverlay(CONNECTOR_KEY);
    };
  }, [mapProvider]);

  // Live-movement affordance: never auto-jump, just surface an explicit action.
  useEffect(() => {
    if (!isOpen || !context?.vehicleId || !locations) {
      setHasMoved(false);
      return;
    }
    const live = locations[context.vehicleId];
    const snapshot = snapshotRef.current;
    if (!snapshot || live?.lat == null || live?.lng == null) return;
    setHasMoved(distanceMeters(snapshot, { lat: live.lat, lng: live.lng }) > SIGNIFICANT_MOVEMENT_METERS);
  }, [isOpen, context?.vehicleId, locations]);

  const handleViewLatestLocation = () => {
    if (!context?.vehicleId || !locations) return;
    const live = locations[context.vehicleId];
    if (live?.lat == null || live?.lng == null) return;
    useStreetImageryStore.getState().open({ lat: live.lat, lng: live.lng }, context);
  };

  const handleRefresh = () => {
    if (!requestedPoint || !context) return;
    useStreetImageryStore.getState().open(requestedPoint, context);
  };

  const handleRecenter = () => {
    if (!mapProvider || !metadata) return;
    mapProvider.flyTo(metadata.position, Math.max(mapProvider.getZoom(), 16));
  };

  const handleRotate = (deltaDegrees: number) => {
    providerRef.current?.rotate(deltaDegrees);
  };

  const distance = metadata?.distanceMeters ?? 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col",
          isMobile ? "h-[85vh]" : "w-full sm:max-w-xl lg:max-w-2xl",
          isFullscreen && "inset-0 h-full w-full max-w-none",
        )}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-600" />
            Street View{context?.label ? ` — ${context.label}` : ""}
          </SheetTitle>
          {context?.subtitle && <SheetDescription>{context.subtitle}</SheetDescription>}
        </SheetHeader>

        {hasMoved && (
          <div className="mx-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span>Vehicle has moved from the viewed location.</span>
            <Button size="sm" variant="outline" onClick={handleViewLatestLocation}>
              View latest location
            </Button>
          </div>
        )}

        <div className="relative mx-4 min-h-60 flex-1 overflow-hidden rounded-xl bg-slate-950">
          <div ref={containerRef} className="h-full w-full" />
          {status === "loading" && <PanelOverlay>Checking for street-level imagery…</PanelOverlay>}
          {status === "not-configured" && (
            <PanelOverlay>Street-level imagery is not configured for this environment.</PanelOverlay>
          )}
          {status === "no-coverage" && <PanelOverlay>No street-level imagery was found near this location.</PanelOverlay>}
          {status === "error" && (
            <PanelOverlay icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}>{errorMessage(error)}</PanelOverlay>
          )}
          {status === "ready" && (
            <>
              <button
                type="button"
                onClick={() => handleRotate(-ROTATE_STEP_DEGREES)}
                aria-label="Rotate view left"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => handleRotate(ROTATE_STEP_DEGREES)}
                aria-label="Rotate view right"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <SheetFooter className="gap-3">
          {metadata && status === "ready" && (
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Provider</div>
                <div className="capitalize">{providerKind}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Captured</div>
                <div>{metadata.capturedAt ? format(new Date(metadata.capturedAt), "PP p") : "Unknown"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {context?.sourceTimestampLabel ?? "Vehicle location time"}
                </div>
                <div>{context?.sourceTimestamp ? format(new Date(context.sourceTimestamp), "PP p") : "Unknown"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Distance</div>
                <div>{distance < COINCIDENT_DISTANCE_METERS ? "At location" : `~${Math.round(distance)}m away`}</div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            Street imagery may not reflect current road or environmental conditions.
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleRefresh} aria-label="Refresh imagery">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleRecenter} disabled={!metadata} aria-label="Recenter map">
              <LocateFixed className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen((v) => !v)}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
