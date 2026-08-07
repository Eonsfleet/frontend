"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_STATUS } from "@/lib/vehicleStatus";
import { buildMarkerHtml, type MarkerState } from "../utils";
import { useMapInstance } from "../MapInstanceContext";
import type { MapMarkerHandle } from "@/lib/map/types";

const normalizeReg = (reg: string) => (reg || "").toUpperCase();
const capitalize = (str: string) => {
  if (!str) return "N/A";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const VEHICLE_ICON_SIZE: [number, number] = [220, 45];
const VEHICLE_ICON_ANCHOR: [number, number] = [14, 34];

interface VehicleMarkerProps {
  vehicle: any;
  lat: number;
  lng: number;
  heading: number;
  speed: number | null | undefined;
  markerState: MarkerState;
  isSelected: boolean;
  onSelect: () => void;
  registerRef: (handle: MapMarkerHandle | null) => void;
  getVehicleIcon: (bodyType: string, status: string) => React.ReactNode;
}

/**
 * A single vehicle marker + its popup, rendered through the active
 * MapProvider (Mapbox or Leaflet) via `provider.addMarker`. The marker HTML
 * is only rebuilt when its *visual* inputs change (status, selection, speed
 * label, heading bucket, plate) — NOT on every `locations` update — so an
 * open popup is never torn down by a position-only change on either engine.
 * Position is written on every render via `handle.setPosition`, and again,
 * more frequently, by TrackingMap's shared rAF loop through the same handle
 * (registered via `registerRef`) — see that loop for why both exist.
 */
function VehicleMarkerImpl({
  vehicle,
  lat,
  lng,
  heading,
  speed,
  markerState,
  isSelected,
  onSelect,
  registerRef,
  getVehicleIcon,
}: VehicleMarkerProps) {
  const { provider, isReady } = useMapInstance();
  const handleRef = useRef<MapMarkerHandle | null>(null);
  const idKey: string = vehicle.attributes.uuid;

  const reg = normalizeReg(vehicle.attributes.registration_number);
  const statusCfg = VEHICLE_STATUS[markerState.statusKey];
  const speedOrStatus =
    markerState.statusKey === "moving" && speed != null
      ? `${Math.round(speed)} km/h`
      : statusCfg.label;

  // Bucket the heading so tiny GPS jitter (e.g. 180° -> 181°) doesn't force an
  // icon rebuild; the rAF loop rotates the marker smoothly frame-by-frame anyway.
  const headingBucket = Math.round(heading / 5) * 5;

  // While this marker is selected its popup is open. A changing `position`
  // would otherwise nudge the open popup and read as flicker — freeze the
  // position at the moment of selection (the map already follows the vehicle
  // via flyTo, and the rAF loop likewise skips this marker) so the popup
  // stays perfectly still; position resumes tracking the live feed the
  // instant it's deselected.
  const frozenPos = useRef<[number, number]>([lat, lng]);
  if (!isSelected) frozenPos.current = [lat, lng];
  const position: [number, number] = isSelected ? frozenPos.current : [lat, lng];

  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);

  const html = useMemo(
    () =>
      buildMarkerHtml({
        registrationNumber: reg,
        speedOrStatus,
        isSelected,
        heading,
        state: markerState,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      reg,
      speedOrStatus,
      isSelected,
      headingBucket,
      markerState.statusKey,
      markerState.pulse,
      markerState.greyed,
      markerState.scale,
      markerState.highlighted,
    ],
  );

  // Mount/unmount the marker handle once per vehicle lifetime.
  useEffect(() => {
    if (!provider || !isReady) return;
    const handle = provider.addMarker(idKey, {
      lat: position[0],
      lng: position[1],
      html,
      iconSize: VEHICLE_ICON_SIZE,
      iconAnchor: VEHICLE_ICON_ANCHOR,
      zIndexOffset: markerState.zIndexOffset,
      onClick: onSelect,
    });
    handleRef.current = handle;
    setPopupContainer(handle.getPopupContainer());
    registerRef(handle);
    return () => {
      provider.removeMarker(idKey);
      handleRef.current = null;
      registerRef(null);
      setPopupContainer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, isReady, idKey]);

  // Visual-state-only rebuild — see the component doc comment above.
  useEffect(() => {
    handleRef.current?.setHtml(html, { iconSize: VEHICLE_ICON_SIZE, iconAnchor: VEHICLE_ICON_ANCHOR });
  }, [html]);

  useEffect(() => {
    handleRef.current?.setZIndexOffset(markerState.zIndexOffset);
  }, [markerState.zIndexOffset]);

  useEffect(() => {
    handleRef.current?.setPosition(position[0], position[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);

  return (
    popupContainer &&
    createPortal(
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
                  {reg}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4 p-2 bg-slate-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {getVehicleIcon(vehicle.attributes.body_type, markerState.statusKey)}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-none">
                  {capitalize(vehicle.attributes.make || "Vehicle")}
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                  {capitalize(vehicle.attributes.model || "Unknown")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Velocity
                </span>
                <span className="text-sm font-black text-blue-600 italic">
                  {speed ?? 0} <span className="text-[9px]">KPH</span>
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
      </div>,
      popupContainer,
    )
  );
}

export const VehicleMarker = React.memo(VehicleMarkerImpl);
