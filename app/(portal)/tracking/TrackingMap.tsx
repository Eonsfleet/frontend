"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useTrackingUiStore } from "@/store/trackingUiStore";
import { VEHICLE_STATUS } from "@/lib/vehicleStatus";
import { getMarkerState, buildMarkerHtml } from "./utils";
import type { VehicleInterpolator } from "@/lib/vehicleInterpolation";
import type { TrailPoint } from "@/lib/vehicleTrail";
import type { LatLng, MapMarkerHandle } from "@/lib/map/types";
import { useMapInstance } from "./MapInstanceContext";
import { useMapCameraFollow } from "./hooks/useMapCameraFollow";
import { useMapClustering } from "./hooks/useMapClustering";
import { VehicleMarker } from "./components/VehicleMarker";
import { ClusterMarker } from "./components/ClusterMarker";
import { TrafficOverlay } from "./components/TrafficOverlay";
import { MapErrorBoundary } from "./components/MapErrorBoundary";
import { MapCompatibilityBanner } from "./components/MapCompatibilityBanner";

interface TrackingMapProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  filteredVehicles: any[];
  /** Vehicle uuids matching the sidebar search text, or null when search is empty. Highlights pins without hiding the rest. */
  searchMatchIds?: Set<string> | null;
  locations: Record<string, any>;
  selectedVehicle: any;
  setSelectedVehicle: (v: any) => void;
  showTraffic?: boolean;
  trail?: TrailPoint[];
  getVehicleIcon: (bodyType: string, status: string) => React.ReactNode;
  playbackData?: any[];
  playbackIndex?: number;
  isReplayMode?: boolean;
  statusFilter?: string;
  zoomResetKey?: number;
  showGeofences?: boolean;
  geofences?: any[];
  interpolator?: VehicleInterpolator;
  alarmState?: Record<string, boolean>;
}

const PLAYBACK_GHOST_ICON = { iconSize: [36, 36] as [number, number], iconAnchor: [18, 18] as [number, number] };

export default function TrackingMap({
  containerRef,
  filteredVehicles,
  searchMatchIds = null,
  locations,
  selectedVehicle,
  setSelectedVehicle,
  showTraffic = false,
  trail = [],
  getVehicleIcon,
  playbackData = [],
  playbackIndex = 0,
  isReplayMode = false,
  statusFilter = "all",
  zoomResetKey = 0,
  showGeofences = false,
  geofences = [],
  interpolator,
  alarmState = {},
}: TrackingMapProps) {
  const { provider, isReady, isFallback } = useMapInstance();

  const markerRefs = useRef<Map<string, MapMarkerHandle>>(new Map());
  // Last position/heading actually written to each marker, so the rAF loop can
  // skip redundant provider writes when the interpolated value hasn't changed
  // (e.g. a stationary vehicle the interpolator keeps returning the same point
  // for). Re-writing an unchanged position 60x/s reflows the marker — and any
  // open popup — every frame, which is what caused the popup flicker this
  // guarded against originally.
  const appliedRef = useRef<Map<string, { lat: number; lng: number; heading: number }>>(new Map());
  // Current selection, read inside the rAF loop without restarting it. The marker
  // whose popup is open must NOT be nudged every frame or the popup jitters; the
  // map already follows it via useMapCameraFollow's flyTo, so freezing its
  // imperative position for the popup's lifetime keeps the popup rock-steady.
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedVehicle ? selectedVehicle.attributes.uuid : null;

  const { isMapFollowEnabled, setMapFollowEnabled } = useTrackingUiStore();

  useEffect(() => {
    if (selectedVehicle) setMapFollowEnabled(true);
  }, [selectedVehicle?.attributes?.uuid, setMapFollowEnabled]);

  const currentPlayback = playbackData[playbackIndex];
  const selectedLoc = selectedVehicle ? locations[selectedVehicle.attributes.uuid] : null;

  const followTarget: LatLng | null = isReplayMode
    ? currentPlayback
      ? { lat: currentPlayback.lat, lng: currentPlayback.lng }
      : null
    : selectedLoc?.lat != null && selectedLoc?.lng != null
      ? { lat: selectedLoc.lat, lng: selectedLoc.lng }
      : null;

  const fleetPoints = useMemo(
    () =>
      Object.values(locations)
        .map((l: any) => ({ lat: l.lat, lng: l.lng }))
        .filter((p) => p.lat !== 0 && p.lng !== 0 && !Number.isNaN(p.lat) && !Number.isNaN(p.lng)),
    [locations],
  );

  useMapCameraFollow({
    provider,
    isReady,
    fleetPoints,
    zoomResetKey,
    onManualInteraction: () => setMapFollowEnabled(false),
    followTarget,
    followZoom: isReplayMode ? 16 : 18,
    isFollowEnabled: isMapFollowEnabled,
    forceFollow: isReplayMode,
  });

  // Shared rAF loop driving smooth marker movement/rotation between GPS packets —
  // one loop for the whole fleet, not one per vehicle, so this stays cheap at scale.
  // Position/rotation updates are applied imperatively via each marker's
  // MapMarkerHandle, bypassing React re-render entirely for motion.
  useEffect(() => {
    if (!interpolator || !isReady) return;
    let frameId: number;

    const tick = () => {
      const now = Date.now();
      const openPopupId = selectedIdRef.current;
      markerRefs.current.forEach((handle, id) => {
        if (id === openPopupId && handle.isPopupOpen()) return;

        const interp = interpolator.getInterpolated(id, now);
        if (!interp) return;

        const last = appliedRef.current.get(id);
        const moved =
          !last ||
          last.lat !== interp.lat ||
          last.lng !== interp.lng ||
          last.heading !== (interp.heading || 0);
        if (!moved) return;

        appliedRef.current.set(id, { lat: interp.lat, lng: interp.lng, heading: interp.heading || 0 });
        handle.setPosition(interp.lat, interp.lng);
        handle.setRotation(interp.heading || 0);
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [interpolator, isReady]);

  // Live breadcrumb trail for the selected vehicle.
  useEffect(() => {
    if (!provider || !isReady) return;
    if (!isReplayMode && selectedVehicle && trail.length > 1) {
      provider.setPolyline(
        "trail",
        trail.map((p) => ({ lat: p.lat, lng: p.lng })),
        { color: "#2563eb", weight: 4, opacity: 0.85 },
      );
    } else {
      provider.removeOverlay("trail");
    }
  }, [provider, isReady, isReplayMode, selectedVehicle, trail]);

  // Playback route (dashed) — the ghost marker below tracks the current index.
  useEffect(() => {
    if (!provider || !isReady) return;
    if (isReplayMode && playbackData.length > 0) {
      provider.setPolyline(
        "playback-route",
        playbackData.map((p) => ({ lat: p.lat, lng: p.lng })),
        { color: "#3b82f6", weight: 4, opacity: 0.6, dashed: true },
      );
    } else {
      provider.removeOverlay("playback-route");
    }
  }, [provider, isReady, isReplayMode, playbackData]);

  const ghostHandleRef = useRef<MapMarkerHandle | null>(null);
  useEffect(() => {
    if (!provider || !isReady) return;
    if (isReplayMode && currentPlayback) {
      const html = buildMarkerHtml({
        heading: currentPlayback.heading || 0,
        state: { statusKey: "moving", pulse: true, greyed: false, scale: 1, zIndexOffset: 0, highlighted: false },
      });
      if (!ghostHandleRef.current) {
        ghostHandleRef.current = provider.addMarker("playback-ghost", {
          lat: currentPlayback.lat,
          lng: currentPlayback.lng,
          html,
          ...PLAYBACK_GHOST_ICON,
        });
      } else {
        ghostHandleRef.current.setPosition(currentPlayback.lat, currentPlayback.lng);
        ghostHandleRef.current.setHtml(html, PLAYBACK_GHOST_ICON);
      }
    } else if (ghostHandleRef.current) {
      provider.removeMarker("playback-ghost");
      ghostHandleRef.current = null;
    }
  }, [provider, isReady, isReplayMode, currentPlayback]);

  // Geofences (circle/polygon) — handles GeoJSON Polygon geometry, flat
  // [lng,lat] arrays, or flat {lat,lng} objects, same as the pre-refactor code.
  const prevGeofenceKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!provider || !isReady) return;
    const activeKeys = new Set<string>();

    if (showGeofences) {
      geofences.forEach((g: any) => {
        if (!g.attributes?.coordinates) return;
        const { type, coordinates, radius, name } = g.attributes;
        const key = `geofence-${g.id}`;

        if (type === "circle") {
          const lat = coordinates.lat ?? coordinates.latitude;
          const lng = coordinates.lng ?? coordinates.longitude;
          if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
            console.warn(`Geofence ${g.id} has invalid circle coordinates:`, coordinates);
            return;
          }
          provider.setCircle(key, { lat, lng }, radius || 500, { color: "#10b981", fillOpacity: 0.2 }, name);
          activeKeys.add(key);
          return;
        }

        if (type === "polygon") {
          let positions: LatLng[] = [];
          if (coordinates?.type === "Polygon" && Array.isArray(coordinates.coordinates)) {
            positions = coordinates.coordinates[0].map(([lng, lat]: [number, number]) => ({ lat, lng }));
          } else if (Array.isArray(coordinates)) {
            positions = coordinates.map((coord: any) =>
              Array.isArray(coord) ? { lat: coord[1], lng: coord[0] } : { lat: coord.lat, lng: coord.lng },
            );
          }
          if (positions.length === 0) {
            console.warn(`Geofence ${g.id} has invalid polygon coordinates:`, coordinates);
            return;
          }
          provider.setPolygon(key, positions, { color: "#3b82f6", fillOpacity: 0.2 }, name);
          activeKeys.add(key);
        }
      });
    }

    prevGeofenceKeysRef.current.forEach((key) => {
      if (!activeKeys.has(key)) provider.removeOverlay(key);
    });
    prevGeofenceKeysRef.current = activeKeys;
  }, [provider, isReady, showGeofences, geofences]);

  // Clustering: recomputed on camera settle / fleet-size change (see
  // useMapClustering) — every leaf below is always a real, individually
  // addressable marker on both engines, never a proxied cluster feature.
  const clusterInput = useMemo(
    () =>
      filteredVehicles
        .filter((v) => {
          const loc = locations[v.attributes.uuid];
          return loc && loc.lat != null && loc.lng != null && !Number.isNaN(loc.lat) && !Number.isNaN(loc.lng);
        })
        .map((v) => ({
          id: v.attributes.uuid as string,
          lat: locations[v.attributes.uuid].lat,
          lng: locations[v.attributes.uuid].lng,
        })),
    [filteredVehicles, locations],
  );
  const clusters = useMapClustering(provider, isReady, clusterInput);

  const vehiclesById = useMemo(() => {
    const map = new Map<string, any>();
    filteredVehicles.forEach((v) => map.set(v.attributes.uuid, v));
    return map;
  }, [filteredVehicles]);

  return (
    <div role="region" aria-label="Vehicle tracking map" className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full z-10" />

      <MapErrorBoundary>
        {isReady && (
          <>
            {showTraffic && !isReplayMode && (
              <TrafficOverlay filteredVehicles={filteredVehicles} locations={locations} />
            )}

              {clusters.map((c) => {
                if (c.kind === "cluster") {
                  return (
                    <ClusterMarker
                      key={c.id}
                      id={c.id}
                      lat={c.lat}
                      lng={c.lng}
                      count={c.count}
                      statusFilter={statusFilter}
                      onExpand={() => provider?.flyTo({ lat: c.lat, lng: c.lng }, c.expansionZoom)}
                    />
                  );
                }

                const v = vehiclesById.get(c.id);
                const loc = locations[c.id];
                if (!v || !loc) return null;
                const isSelected = selectedVehicle?.attributes?.uuid === c.id;
                const hasAlarm = alarmState[c.id] === true;
                const isHighlighted = searchMatchIds?.has(c.id) ?? false;
                const markerState = getMarkerState(
                  { status: loc.status, is_online: loc.is_online, speed: loc.speed },
                  isSelected,
                  hasAlarm,
                  isHighlighted,
                );

                return (
                  <VehicleMarker
                    key={c.id}
                    vehicle={v}
                    lat={loc.lat}
                    lng={loc.lng}
                    heading={loc.heading ?? 0}
                    speed={loc.speed}
                    markerState={markerState}
                    isSelected={isSelected}
                    onSelect={() => setSelectedVehicle(isSelected ? null : v)}
                    registerRef={(handle) => {
                      if (handle) markerRefs.current.set(c.id, handle);
                      else markerRefs.current.delete(c.id);
                    }}
                    getVehicleIcon={getVehicleIcon}
                  />
                );
              })}
          </>
        )}
      </MapErrorBoundary>

      <MapCompatibilityBanner isFallback={isFallback} />

      <style jsx global>{`
        .leaflet-marker-icon,
        .custom-marker-wrapper {
          transition: transform 0.15s linear;
        }

        /* Custom pin+label card marker */
        .custom-tracking-marker {
          display: flex;
          align-items: center;
          overflow: visible;
        }

        /* Fallback circle marker (playback ghost / legacy calls) */
        .marker-container {
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .marker-base {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .custom-popup .leaflet-popup-content-wrapper,
        .custom-popup .mapboxgl-popup-content {
          padding: 0;
          overflow: hidden;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .custom-popup .leaflet-popup-tip-container,
        .custom-popup .mapboxgl-popup-tip {
          display: none;
        }

        .geofence-label-popup .mapboxgl-popup-tip {
          display: none;
        }

        .custom-marker-cluster {
          background: none;
          border: none;
        }

        .custom-marker-cluster div {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          color: white;
          border: 3px solid white;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .cluster-all div {
          background: #0f172a;
        }
        .cluster-moving div {
          background: ${VEHICLE_STATUS.moving.marker};
        }
        .cluster-idle div {
          background: ${VEHICLE_STATUS.idle.marker};
        }
        .cluster-parked div {
          background: ${VEHICLE_STATUS.parked.marker};
        }
        .cluster-stopped div {
          background: #64748b;
        }
        .cluster-offline div {
          background: ${VEHICLE_STATUS.offline.marker};
        }
        .cluster-online div {
          background: #2563eb;
        }
        .cluster-alarm div {
          background: ${VEHICLE_STATUS.alarm.marker};
        }

        .custom-marker-cluster:hover div {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
