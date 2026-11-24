"use client";

import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Geofence } from "@/types";
import { FREE_TILE_URL, FREE_TILE_ATTRIBUTION } from "@/lib/map/freeTiles";

// Fix Leaflet default icon paths for Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface Props {
  geofence: Geofence;
  vehicles?: (import("@/types").Vehicle | any)[];
  height?: string;
}

export default function GeofenceBoundaryPreview({
  geofence,
  vehicles,
  height = "300px",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Compute bounds from raw data before any Leaflet calls
    const { type, coordinates, radius } = geofence.attributes;
    const allPoints: L.LatLngTuple[] = [];

    if (type === "circle" && coordinates) {
      const c = coordinates as any;
      const lat = c.lat ?? c.latitude;
      const lng = c.lng ?? c.longitude;
      if (lat != null && lng != null) {
        const r = (radius ?? 500) / 111320; // approx degrees
        allPoints.push([lat + r, lng + r]);
        allPoints.push([lat - r, lng - r]);
      }
    } else if (type === "polygon" && coordinates) {
      const c = coordinates as any;
      if (Array.isArray(c)) {
        c.forEach((pt: any) => {
          if (Array.isArray(pt)) allPoints.push([pt[1], pt[0]]);
          else if (pt.lat != null) allPoints.push([pt.lat, pt.lng]);
        });
      } else if (c?.type === "Polygon" && Array.isArray(c.coordinates)) {
        c.coordinates[0].forEach(([lng, lat]: [number, number]) =>
          allPoints.push([lat, lng]),
        );
      }
    }

    const initMap = () => {
      if (mapRef.current) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      const map = L.map(container, {
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });

      L.tileLayer(FREE_TILE_URL, {
        attribution: FREE_TILE_ATTRIBUTION,
      }).addTo(map);

      mapRef.current = map;

      // Set view first so projection is ready
      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
      } else {
        map.setView([6.5244, 3.3792], 10);
      }

      // Now safe to add layers
      if (type === "circle" && coordinates) {
        const c = coordinates as any;
        const lat = c.lat ?? c.latitude;
        const lng = c.lng ?? c.longitude;
        if (lat != null && lng != null) {
          L.circle([lat, lng], {
            radius: radius ?? 500,
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            weight: 2,
          }).addTo(map);
        }
      } else if (type === "polygon" && coordinates) {
        const c = coordinates as any;
        let latlngs: L.LatLngExpression[] = [];

        if (c?.type === "Polygon" && Array.isArray(c.coordinates)) {
          latlngs = c.coordinates[0].map(([lng, lat]: [number, number]) => [
            lat,
            lng,
          ]);
        } else if (Array.isArray(c)) {
          latlngs = c.map((pt: any) =>
            Array.isArray(pt) ? [pt[1], pt[0]] : [pt.lat, pt.lng],
          );
        }

        if (latlngs.length > 0) {
          L.polygon(latlngs as L.LatLngExpression[], {
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            weight: 2,
          }).addTo(map);
        }
      }

      // Vehicle markers
      vehicles?.forEach((v) => {
        const loc =
          v.relationships?.current_location || v.attributes?.current_location;
        if (loc?.latitude && loc?.longitude) {
          L.marker([loc.latitude, loc.longitude], {
            icon: L.divIcon({
              className: "custom-div-icon",
              html: `<div class="p-1 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          })
            .bindPopup(
              `<div class="p-2"><p class="text-xs font-black uppercase">${v.attributes.registration_number}</p><p class="text-[9px] text-slate-500 uppercase">${v.attributes.make} ${v.attributes.model}</p></div>`,
            )
            .addTo(map);
        }
      });

      observer.disconnect();
    };

    const observer = new ResizeObserver(() => {
      if (!mapRef.current) {
        initMap();
      } else {
        mapRef.current.invalidateSize();
      }
    });
    observer.observe(container);

    initMap();

    return () => {
      observer.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [geofence, vehicles]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-md border border-slate-200 overflow-hidden relative z-0"
    />
  );
}
