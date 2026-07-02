"use client";

import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
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
import { Badge } from "@/components/ui/badge";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { VEHICLE_STATUS } from "@/lib/vehicleStatus";
import { getMarkerState, buildMarkerHtml } from "./utils";
import type { VehicleInterpolator } from "@/lib/vehicleInterpolation";
import { TrafficOverlay } from "./components/TrafficOverlay";
import type { TrackingMapStyle } from "./utils";
import type { TrailPoint } from "@/lib/vehicleTrail";

// Normalization & Helpers (Passed from parent or redefined if pure)
const normalizeReg = (reg: string) => (reg || "").toUpperCase();
const capitalize = (str: string) => {
  if (!str) return "N/A";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

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

  // Selection Follow
  useEffect(() => {
    if (selected && locs[selected.id] && !allVehicles.isReplayMode) {
      const l = locs[selected.id];
      if (l.lat && l.lng) {
        map.flyTo([l.lat, l.lng], 16);
      }
    }
  }, [selected?.id, map]); // Optimized dependencies

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
      markerRefs.current.forEach((marker, id) => {
        const interp = interpolator.getInterpolated(id, now);
        if (!interp) return;
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
                    bodySvg:
                      '<path d="M12 19V5M5 12l7-7 7 7"/>',
                    heading: currentPlayback.heading || 0,
                    state: {
                      statusKey: "parked",
                      pulse: true,
                      greyed: false,
                      scale: 1,
                      zIndexOffset: 0,
                    },
                  }),
                  iconSize: [40, 40],
                  iconAnchor: [20, 20],
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
        >
          {filteredVehicles
            .filter((v) => {
              const loc = locations[v.id];
              return (
                loc &&
                loc.lat != null &&
                loc.lng != null &&
                !isNaN(loc.lat) &&
                !isNaN(loc.lng)
              );
            })
            .map((v) => {
              const loc = locations[v.id];
              const idKey = String(v.id);
              const isSelected = selectedVehicle?.id === v.id;
              const hasAlarm = alarmState[idKey] === true;
              const markerState = getMarkerState(
                { status: loc.status, is_online: loc.is_online, speed: loc.speed },
                isSelected,
                hasAlarm,
              );
              const statusCfg = VEHICLE_STATUS[markerState.statusKey];

              // Bind the declarative position/heading to the raw target — this is
              // only what places a freshly-mounted marker or reconciles the prop;
              // the rAF loop below owns the actual frame-by-frame smooth motion via
              // direct Leaflet calls, correcting any prop-triggered snap within a
              // single frame (~16ms, imperceptible). Reading the interpolator's
              // time-varying position here (at render time) would be an impure
              // render, so that read only happens inside the rAF callback.
              const lat = loc.lat;
              const lng = loc.lng;
              const heading = loc.heading ?? 0;
              const size = Math.round(40 * markerState.scale);

              return (
                <Marker
                  key={v.id}
                  ref={(instance) => {
                    if (instance) markerRefs.current.set(idKey, instance);
                    else markerRefs.current.delete(idKey);
                  }}
                  position={[lat, lng]}
                  zIndexOffset={markerState.zIndexOffset}
                  icon={L.divIcon({
                    className: "custom-marker-wrapper",
                    html: buildMarkerHtml({
                      bodySvg: getMarkerSVG(v.attributes.body_type),
                      heading,
                      state: markerState,
                    }),
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                  })}
                  eventHandlers={{
                    click: () => {
                      const isAlreadySelected = selectedVehicle?.id === v.id;
                      setSelectedVehicle(isAlreadySelected ? null : v);
                    },
                    keydown: (e: any) => {
                      if (e.originalEvent?.key === "Enter" || e.originalEvent?.key === " ") {
                        const isAlreadySelected = selectedVehicle?.id === v.id;
                        setSelectedVehicle(isAlreadySelected ? null : v);
                      }
                    },
                  }}
                >
                  <Popup className="custom-popup" closeButton={false}>
                    <div className="p-3 min-w-50 bg-white rounded-2xl shadow-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <Badge
                          className={cn(
                            "text-[8px] px-2 h-4 font-black uppercase tracking-widest border-none text-white",
                          )}
                          style={{ backgroundColor: statusCfg.marker }}
                        >
                          {statusCfg.label}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              markerState.statusKey !== "offline"
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                : "bg-slate-300",
                            )}
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {normalizeReg(v.attributes.registration_number)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-4 p-2 bg-slate-50 rounded-xl">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getVehicleIcon(v.attributes.body_type, markerState.statusKey)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 leading-none">
                            {capitalize(v.attributes.make || "Vehicle")}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                            {capitalize(v.attributes.model || "Unknown")}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Velocity
                          </span>
                          <span className="text-sm font-black text-blue-600 italic">
                            {loc.speed} <span className="text-[9px]">KPH</span>
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Heading
                          </span>
                          <span className="text-sm font-black text-slate-900 italic">
                            {Math.round(heading)}°
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MarkerClusterGroup>
      </MapContainer>

      <style jsx global>{`
        .leaflet-marker-icon {
          transition: transform 0.2s linear;
        }

        .marker-container {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .marker-base {
          position: relative;
          z-index: 2;
          width: 32px;
          height: 32px;
          border: 2px solid white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .marker-container.is-greyed .marker-base {
          opacity: 0.55;
          filter: grayscale(0.4);
        }

        .marker-pulse {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transform: scale(0);
          opacity: 0;
          z-index: 1;
        }

        .marker-container.is-pulsing .marker-pulse {
          animation: marker-pulse 2s infinite;
        }

        @keyframes marker-pulse {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .marker-icon-wrapper {
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
