"use client";

import { useEffect, useRef } from "react";
import type { LatLng, MapProvider } from "@/lib/map/types";

export interface UseMapCameraFollowParams {
  provider: MapProvider | null;
  isReady: boolean;
  /** All fleet points — drives the initial fit-to-bounds and manual resets. */
  fleetPoints: LatLng[];
  /** Bump (increment) to force a re-fit, e.g. a "recenter" button. */
  zoomResetKey?: number;
  /** Called on user-initiated drag/zoom — used to disable follow-mode. */
  onManualInteraction?: () => void;
  /** The point the camera should fly to while following (selected vehicle or replay position). */
  followTarget: LatLng | null;
  followZoom?: number;
  /** Follow only applies while this is true (ignored when forceFollow is set). */
  isFollowEnabled?: boolean;
  /** Replay mode follows unconditionally, regardless of isFollowEnabled. */
  forceFollow?: boolean;
}

/**
 * Provider-agnostic replacement for the old `MapController` (a `useMap()`
 * component tied to react-leaflet): initial fit-to-fleet, manual re-fit,
 * drag/zoom-disables-follow, and fly-to-target-while-following. Shared by
 * TrackingMap and PlaybackMap so the two don't drift into two copies of the
 * same camera policy.
 */
export function useMapCameraFollow({
  provider,
  isReady,
  fleetPoints,
  zoomResetKey = 0,
  onManualInteraction,
  followTarget,
  followZoom = 18,
  isFollowEnabled = true,
  forceFollow = false,
}: UseMapCameraFollowParams): void {
  const hasFittedRef = useRef(false);

  const fitFleet = () => {
    if (!provider) return;
    const points = fleetPoints.filter(
      (p) => p.lat !== 0 && p.lng !== 0 && !Number.isNaN(p.lat) && !Number.isNaN(p.lng),
    );
    if (points.length > 0) {
      provider.fitBounds(points, { paddingPx: 100, maxZoom: 14 });
      hasFittedRef.current = true;
    }
  };

  useEffect(() => {
    if (!isReady || hasFittedRef.current || fleetPoints.length === 0) return;
    fitFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, fleetPoints.length]);

  useEffect(() => {
    if (!isReady || zoomResetKey <= 0) return;
    fitFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, zoomResetKey]);

  useEffect(() => {
    if (!provider || !isReady || !onManualInteraction) return;
    return provider.onInteractionStart(onManualInteraction);
  }, [provider, isReady, onManualInteraction]);

  useEffect(() => {
    if (!provider || !isReady || !followTarget) return;
    if (!forceFollow && !isFollowEnabled) return;
    provider.flyTo(followTarget, followZoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, isReady, followTarget?.lat, followTarget?.lng, isFollowEnabled, forceFollow, followZoom]);
}
