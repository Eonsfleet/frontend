"use client";

import { useEffect, useRef } from "react";
import { useMapInstance } from "../MapInstanceContext";

interface TrafficOverlayProps {
  filteredVehicles: any[];
  locations: Record<string, any>;
}

/**
 * "Traffic (Fleet Speed)" overlay — this app has no third-party traffic-tile provider
 * wired in (no Google/TomTom/HERE key configured anywhere), so this does not show real
 * road traffic. Instead it renders each vehicle's speed relative to the fleet's current
 * rolling median as a small colored circle: green (moving faster than the fleet median),
 * amber (moderately below median), red (well below median or stopped). This is an
 * honest, clearly-labeled approximation, not third-party live traffic data.
 */
export function TrafficOverlay({ filteredVehicles, locations }: TrafficOverlayProps) {
  const { provider, isReady } = useMapInstance();
  const prevKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!provider || !isReady) return;

    const speeds = filteredVehicles
      .map((v) => locations[v.id]?.speed ?? 0)
      .filter((s) => s > 0)
      .sort((a, b) => a - b);
    const median = speeds.length ? speeds[Math.floor(speeds.length / 2)] : 0;

    const activeKeys = new Set<string>();

    filteredVehicles.forEach((v) => {
      const loc = locations[v.id];
      if (!loc || loc.lat == null || loc.lng == null || Number.isNaN(loc.lat) || Number.isNaN(loc.lng)) {
        return;
      }
      const speed = loc.speed ?? 0;
      const ratio = median > 0 ? speed / median : speed > 0 ? 1 : 0;

      let color = "#e11d48"; // red — well below median / stopped
      if (ratio > 0.8) color = "#059669"; // green — at/above median
      else if (ratio > 0.4) color = "#d97706"; // amber — moderately below

      const key = `traffic-${v.id}`;
      provider.setCircle(
        key,
        { lat: loc.lat, lng: loc.lng },
        30,
        { color, fillColor: color, fillOpacity: 0.6, weight: 1 },
        `${Math.round(speed)} km/h`,
      );
      activeKeys.add(key);
    });

    prevKeysRef.current.forEach((key) => {
      if (!activeKeys.has(key)) provider.removeOverlay(key);
    });
    prevKeysRef.current = activeKeys;
  }, [provider, isReady, filteredVehicles, locations]);

  useEffect(() => {
    return () => {
      prevKeysRef.current.forEach((key) => provider?.removeOverlay(key));
    };
  }, [provider]);

  return null;
}
