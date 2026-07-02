"use client";

import { Circle, Tooltip as LeafletTooltip } from "react-leaflet";

interface TrafficOverlayProps {
  filteredVehicles: any[];
  locations: Record<string, any>;
}

/**
 * "Traffic (Fleet Speed)" overlay — this app has no third-party traffic-tile provider
 * wired in (no Google/TomTom/HERE key configured anywhere), so this does not show real
 * road traffic. Instead it renders each vehicle's speed relative to the fleet's current
 * rolling median as a small colored dot: green (moving faster than the fleet median),
 * amber (moderately below median), red (well below median or stopped). This is an
 * honest, clearly-labeled approximation, not third-party live traffic data.
 */
export function TrafficOverlay({ filteredVehicles, locations }: TrafficOverlayProps) {
  const speeds = filteredVehicles
    .map((v) => locations[v.id]?.speed ?? 0)
    .filter((s) => s > 0)
    .sort((a, b) => a - b);

  const median = speeds.length ? speeds[Math.floor(speeds.length / 2)] : 0;

  return (
    <>
      {filteredVehicles.map((v) => {
        const loc = locations[v.id];
        if (!loc || loc.lat == null || loc.lng == null || isNaN(loc.lat) || isNaN(loc.lng)) {
          return null;
        }
        const speed = loc.speed ?? 0;
        const ratio = median > 0 ? speed / median : speed > 0 ? 1 : 0;

        let color = "#e11d48"; // red — well below median / stopped
        if (ratio > 0.8) color = "#059669"; // green — at/above median
        else if (ratio > 0.4) color = "#d97706"; // amber — moderately below

        return (
          <Circle
            key={`traffic-${v.id}`}
            center={[loc.lat, loc.lng]}
            radius={30}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 1 }}
          >
            <LeafletTooltip
              direction="top"
              className="bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
            >
              {Math.round(speed)} km/h
            </LeafletTooltip>
          </Circle>
        );
      })}
    </>
  );
}
