"use client";

import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polyline,
  Polygon,
  Circle,
  Tooltip as LeafletTooltip,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { useTrackingUiStore } from "@/store/trackingUiStore";
import { Badge } from "@/components/ui/badge";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { VEHICLE_STATUS } from "@/lib/vehicleStatus";
import { getMarkerState, buildMarkerHtml } from "./utils";
import type { VehicleInterpolator } from "@/lib/vehicleInterpolation";
import { TrafficOverlay } from "./components/TrafficOverlay";
import { VehicleMarker } from "./components/VehicleMarker";
import type { TrackingMapStyle } from "./utils";
import type { TrailPoint } from "@/lib/vehicleTrail";

interface TrackingMapProps {
  filteredVehicles: any[];
  locations: Record<string, any>;
  selectedVehicle: any;
  setSelectedVehicle: (v: any) => void;
  vehicles: any[];
  TILE_URL: string;
  mapStyle?: TrackingMapStyle;
  showTraffic?: boolean;
  trail?: TrailPoint[];
  getMarkerSVG: (bodyType: string) => string;
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

const MapController = ({ selected, locs, allVehicles }: any) => {
  const map = useMap();
  const hasFitted = React.useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).leafletMap = map;
    }
  }, [map]);

  // Initial Fit Bounds & Manual Reset
  const fitFleet = React.useCallback(() => {
    const points = Object.values(locs)
      .map((l: any) => [l.lat, l.lng] as [number, number])
      .filter((p) => p[0] !== 0 && p[1] !== 0 && !isNaN(p[0]) && !isNaN(p[1]));

    if (points.length > 0) {
      map.fitBounds(points, { padding: [100, 100], maxZoom: 14 });
      hasFitted.current = true;
    }
  }, [locs, map]);

  useEffect(() => {
    if (!hasFitted.current && allVehicles.length > 0) {
      fitFleet();
    }
  }, [allVehicles.length, fitFleet]);

  useEffect(() => {
    if (allVehicles.zoomResetKey > 0) {
      fitFleet();
    }
  }, [allVehicles.zoomResetKey, fitFleet]);

  const { isMapFollowEnabled, setMapFollowEnabled } = useTrackingUiStore();

  // Listen to manual map drags/pans to disable auto-follow
  useEffect(() => {
    const disableFollow = () => {
      setMapFollowEnabled(false);
    };
    map.on("dragstart", disableFollow);
    map.on("zoomstart", disableFollow);
    return () => {
      map.off("dragstart", disableFollow);
      map.off("zoomstart", disableFollow);
    };
  }, [map, setMapFollowEnabled]);

  // Set map follow to true on selected ID change
  useEffect(() => {
    if (selected) {
      setMapFollowEnabled(true);
    }
  }, [selected?.attributes?.uuid, setMapFollowEnabled]);

  // Selection Follow
  useEffect(() => {
    const selectedUuid = selected?.attributes?.uuid;
    if (selected && selectedUuid && locs[selectedUuid] && isMapFollowEnabled && !allVehicles.isReplayMode) {
      const l = locs[selectedUuid];
      if (l.lat && l.lng) {
        map.flyTo([l.lat, l.lng], 18);
      }
    }
  }, [
    selected?.attributes?.uuid,
    locs[selected?.attributes?.uuid || ""]?.lat,
    locs[selected?.attributes?.uuid || ""]?.lng,
    isMapFollowEnabled,
    map,
    allVehicles.isReplayMode
  ]);

  // Replay Follow
  useEffect(() => {
    if (
      allVehicles.isReplayMode &&
      allVehicles.playbackData?.[allVehicles.playbackIndex]
    ) {
      const p = allVehicles.playbackData[allVehicles.playbackIndex];
      if (p.lat && p.lng) {
        map.flyTo([p.lat, p.lng], 16);
      }
    }
  }, [allVehicles.playbackIndex, allVehicles.isReplayMode, map]);

  return null;
};

export default function TrackingMap({
  filteredVehicles,
  locations,
  selectedVehicle,
  setSelectedVehicle,
  vehicles,
  TILE_URL,
  mapStyle = "standard",
  showTraffic = false,
  trail = [],
  getMarkerSVG,
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
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  // Last position/heading actually written to each marker, so the rAF loop can
  // skip redundant Leaflet writes when the interpolated value hasn't changed
  // (e.g. a stationary vehicle the interpolator keeps returning the same point
  // for). Re-writing an unchanged position 60×/s reflows the marker — and any
  // popup bound to it — every frame, which is what caused the popup flicker.
  const appliedRef = useRef<Map<string, { lat: number; lng: number; heading: number }>>(new Map());
  // Current selection, read inside the rAF loop without restarting it. The marker
  // whose popup is open must NOT be nudged every frame or the popup jitters; the
  // map already follows it via MapController's flyTo, so freezing its imperative
  // position for the popup's lifetime keeps the popup rock-steady.
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedVehicle ? selectedVehicle.attributes.uuid : null;

  const createClusterCustomIcon = (cluster: any) => {
    return L.divIcon({
      html: `<div><span>${cluster.getChildCount()}</span></div>`,
      className: cn("custom-marker-cluster", `cluster-${statusFilter}`),
      iconSize: L.point(40, 40, true),
    });
  };

  // Shared rAF loop driving smooth marker movement/rotation between GPS packets —
  // one loop for the whole fleet, not one per vehicle, so this stays cheap at scale.
  // Position updates are applied imperatively to the underlying Leaflet marker
  // instances, bypassing React re-render entirely for motion.
  useEffect(() => {
    if (!interpolator) return;
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      const openPopupId = selectedIdRef.current;
      markerRefs.current.forEach((marker, id) => {
        // The marker with an open popup stays put — see selectedIdRef note above.
        if (id === openPopupId && marker.getPopup()?.isOpen()) return;

        const interp = interpolator.getInterpolated(id, now);
        if (!interp) return;

        // Skip no-op writes: only touch Leaflet when the value actually moved.
        const last = appliedRef.current.get(id);
        const moved =
          !last ||
          last.lat !== interp.lat ||
          last.lng !== interp.lng ||
          last.heading !== (interp.heading || 0);
        if (!moved) return;

        appliedRef.current.set(id, { lat: interp.lat, lng: interp.lng, heading: interp.heading || 0 });
        marker.setLatLng([interp.lat, interp.lng]);
        const el = marker.getElement();
        const base = el?.querySelector<HTMLElement>(".marker-base");
        if (base) base.style.transform = `rotate(${interp.heading || 0}deg)`;
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [interpolator]);

  const currentPlayback = playbackData[playbackIndex];
  return (
    <div
      role="region"
      aria-label="Vehicle tracking map"
      className="h-full w-full"
    >
      <MapContainer
        center={[6.5244, 3.3792]}
        zoom={12}
        className="h-full w-full z-10"
        zoomControl={false}
      >
        <TileLayer url={TILE_URL} attribution="&copy; Mapbox" />

        <MapController
          selected={selectedVehicle}
          locs={locations}
          allVehicles={{
            length: vehicles.length,
            isReplayMode,
            playbackData,
            playbackIndex,
            zoomResetKey,
          }}
        />

        {showTraffic && !isReplayMode && (
          <TrafficOverlay filteredVehicles={filteredVehicles} locations={locations} />
        )}

        {!isReplayMode && selectedVehicle && trail.length > 1 && (
          <Polyline
            positions={trail.map((p) => [p.lat, p.lng])}
            color="#2563eb"
            weight={4}
            opacity={0.85}
          />
        )}

        {isReplayMode && playbackData.length > 0 && (
          <>
            <Polyline
              positions={playbackData.map((p) => [p.lat, p.lng])}
              color="#3b82f6"
              weight={4}
              opacity={0.6}
              dashArray="10, 10"
            />
            {currentPlayback && (
              <Marker
                position={[currentPlayback.lat, currentPlayback.lng]}
                icon={L.divIcon({
                  className: "custom-marker-wrapper",
                  html: buildMarkerHtml({
                    heading: currentPlayback.heading || 0,
                    state: {
                      statusKey: "moving",
                      pulse: true,
                      greyed: false,
                      scale: 1,
                      zIndexOffset: 0,
                    },
                  }),
                  iconSize: [36, 36],
                  iconAnchor: [18, 18],
                })}
              />
            )}
          </>
        )}

        {showGeofences &&
          geofences.map((g: any) => {
            if (!g.attributes?.coordinates) return null;
            const { type, coordinates, radius, name } = g.attributes;

            if (type === "circle") {
              // coordinates can be {lat, lng} or {latitude, longitude}
              const lat = coordinates.lat ?? coordinates.latitude;
              const lng = coordinates.lng ?? coordinates.longitude;

              // Skip if coordinates are invalid
              if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`Geofence ${g.id} has invalid circle coordinates:`, coordinates);
                return null;
              }

              return (
                <Circle
                  key={g.id}
                  center={[lat, lng]}
                  radius={radius || 500}
                  pathOptions={{
                    color: "#10b981",
                    fillColor: "#10b981",
                    fillOpacity: 0.2,
                  }}
                >
                  <LeafletTooltip
                    sticky
                    className="bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
                  >
                    {name}
                  </LeafletTooltip>
                </Circle>
              );
            }

            if (type === "polygon") {
              // coordinates is an array of {lat, lng} objects or [lng, lat] arrays
              if (!Array.isArray(coordinates) || coordinates.length === 0) {
                console.warn(`Geofence ${g.id} has invalid polygon coordinates:`, coordinates);
                return null;
              }

              const positions = coordinates.map((coord: any) => {
                if (Array.isArray(coord)) {
                  // GeoJSON standard is [lng, lat]
                  return [coord[1], coord[0]];
                }
                // Flat {lat, lng} object
                return [coord.lat, coord.lng];
              });

              return (
                <Polygon
                  key={g.id}
                  positions={positions}
                  pathOptions={{
                    color: "#3b82f6",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.2,
                  }}
                >
                  <LeafletTooltip
                    sticky
                    className="bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
                  >
                    {name}
                  </LeafletTooltip>
                </Polygon>
              );
            }

            return null;
          })}

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          // Once zoomed in to tracking range, stop clustering and add each marker
          // to the map as a plain layer. leaflet.markercluster proxies clustered
          // markers, so an imperative setLatLng() on a proxied marker doesn't move
          // its on-screen icon — that's why live motion looked frozen. As direct
          // map layers the rAF loop's setLatLng animates them smoothly again.
          disableClusteringAtZoom={16}
          spiderfyOnMaxZoom={false}
          removeOutsideVisibleBounds
        >
          {filteredVehicles
            .filter((v) => {
              const loc = locations[v.attributes.uuid];
              return (
                loc &&
                loc.lat != null &&
                loc.lng != null &&
                !isNaN(loc.lat) &&
                !isNaN(loc.lng)
              );
            })
            .map((v) => {
              const loc = locations[v.attributes.uuid];
              const idKey = v.attributes.uuid;
              const isSelected = selectedVehicle?.attributes?.uuid === v.attributes.uuid;
              const hasAlarm = alarmState[idKey] === true;
              const markerState = getMarkerState(
                { status: loc.status, is_online: loc.is_online, speed: loc.speed },
                isSelected,
                hasAlarm,
              );

              // Position/heading are the target the rAF loop below animates toward
              // via direct Leaflet calls — reading the interpolator here (render
              // time) would be an impure render, so it only happens in the rAF tick.
              return (
                <VehicleMarker
                  key={v.attributes.uuid}
                  vehicle={v}
                  lat={loc.lat}
                  lng={loc.lng}
                  heading={loc.heading ?? 0}
                  speed={loc.speed}
                  markerState={markerState}
                  isSelected={isSelected}
                  onSelect={() =>
                    setSelectedVehicle(selectedVehicle?.attributes?.uuid === v.attributes.uuid ? null : v)
                  }
                  registerRef={(instance) => {
                    if (instance) markerRefs.current.set(idKey, instance);
                    else markerRefs.current.delete(idKey);
                  }}
                  getVehicleIcon={getVehicleIcon}
                />
              );
            })}
        </MarkerClusterGroup>
      </MapContainer>

      <style jsx global>{`
        .leaflet-marker-icon {
          transition: transform 0.15s linear;
        }

        /* Custom pin+label card marker */
        .custom-tracking-marker {
          display: flex;
          align-items: center;
          overflow: visible;
        }

        /* Fallback circle marker */
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

        .custom-popup .leaflet-popup-content-wrapper {
          padding: 0;
          overflow: hidden;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .custom-popup .leaflet-popup-tip-container {
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
