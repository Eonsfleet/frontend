"use client";

import React, { useMemo, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_STATUS } from "@/lib/vehicleStatus";
import { buildMarkerHtml, type MarkerState } from "../utils";
import { StreetViewModal } from "./StreetViewModal";

const normalizeReg = (reg: string) => (reg || "").toUpperCase();
const capitalize = (str: string) => {
  if (!str) return "N/A";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

interface VehicleMarkerProps {
  vehicle: any;
  lat: number;
  lng: number;
  heading: number;
  speed: number | null | undefined;
  markerState: MarkerState;
  isSelected: boolean;
  onSelect: () => void;
  registerRef: (marker: L.Marker | null) => void;
  getVehicleIcon: (bodyType: string, status: string) => React.ReactNode;
}

/**
 * A single vehicle marker + its popup. Extracted and memoized so the Leaflet
 * divIcon is only rebuilt when its *visual* inputs actually change (status,
 * selection, speed label, heading, plate) — NOT on every `locations` update.
 *
 * Rebuilding the icon on every WS packet was tearing down and recreating the
 * marker's DOM element via Leaflet `setIcon()`, which destroyed/reflowed any
 * open Popup — the flicker (and occasional "popup never shows"). Position is now
 * the only thing that changes frequently, and Leaflet's `setLatLng` (driven by
 * the parent's rAF loop) moves the marker without rebuilding its DOM, leaving an
 * open popup untouched.
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
  const reg = normalizeReg(vehicle.attributes.registration_number);
  const statusCfg = VEHICLE_STATUS[markerState.statusKey];
  const speedOrStatus =
    markerState.statusKey === "moving" && speed != null
      ? `${Math.round(speed)} km/h`
      : statusCfg.label;

  // Bucket the heading so tiny GPS jitter (e.g. 180° → 181°) doesn't force an
  // icon rebuild; the rAF loop rotates the marker smoothly frame-by-frame anyway.
  const headingBucket = Math.round(heading / 5) * 5;

  // While this marker is selected its popup is open. A changing `position` prop
  // makes react-leaflet call setLatLng() on every incoming WS packet, which nudges
  // the open popup and reads as flicker. Freeze the declarative position at the
  // moment of selection (the map already follows the vehicle via flyTo, and the
  // rAF loop likewise skips this marker) so the popup stays perfectly still; the
  // position resumes tracking the live feed the instant it's deselected.
  const frozenPos = useRef<[number, number]>([lat, lng]);
  if (!isSelected) frozenPos.current = [lat, lng];
  const position: [number, number] = isSelected ? frozenPos.current : [lat, lng];

  const [streetViewOpen, setStreetViewOpen] = useState(false);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "custom-marker-wrapper",
        html: buildMarkerHtml({
          registrationNumber: reg,
          speedOrStatus,
          isSelected,
          heading,
          state: markerState,
        }),
        iconSize: [220, 45],
        iconAnchor: [14, 34],
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
    ],
  );

  return (
    <Marker
      ref={(instance) => registerRef(instance)}
      position={position}
      zIndexOffset={markerState.zIndexOffset}
      icon={icon}
      eventHandlers={{
        click: onSelect,
        keydown: (e: any) => {
          if (e.originalEvent?.key === "Enter" || e.originalEvent?.key === " ") {
            onSelect();
          }
        },
      }}
    >
      <Popup className="custom-popup" closeButton={false} autoPan={false}>
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStreetViewOpen(true);
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100"
          >
            <Camera className="size-3" />
            Street View
          </button>
        </div>
      </Popup>
      <StreetViewModal
        lat={position[0]}
        lng={position[1]}
        open={streetViewOpen}
        onOpenChange={setStreetViewOpen}
      />
    </Marker>
  );
}

export const VehicleMarker = React.memo(VehicleMarkerImpl);
