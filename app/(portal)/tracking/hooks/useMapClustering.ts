"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClusterEngine, type ClusterOrLeaf, type ClusterPoint } from "@/lib/map/clustering";
import type { MapProvider } from "@/lib/map/types";

const WORLD_BOUNDS = { west: -180, south: -85, east: 180, north: 85 };

/**
 * Recomputes clustering on camera movement, on fleet-size change, and on a
 * coarse interval — deliberately NOT on every incoming WS position tick.
 * Vehicle motion between GPS fixes is animated imperatively by the rAF loop
 * in TrackingMap, bypassing React entirely; rebuilding the supercluster index
 * on every tick for a large fleet would defeat that optimization for no
 * visible benefit (cluster membership only needs to be "close enough," not
 * frame-accurate).
 */
export function useMapClustering(
  provider: MapProvider | null,
  isReady: boolean,
  vehicles: ClusterPoint[],
  refreshMs = 2000,
): ClusterOrLeaf[] {
  const [engine] = useState(() => new ClusterEngine());
  const [clusters, setClusters] = useState<ClusterOrLeaf[]>([]);
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  const recompute = useCallback(() => {
    if (!provider) return;
    const zoom = provider.getZoom();
    engine.load(vehiclesRef.current);
    setClusters(engine.getClusters(WORLD_BOUNDS, zoom));
  }, [provider, engine]);

  useEffect(() => {
    if (!isReady) return;
    recompute();
  }, [isReady, recompute, vehicles.length]);

  useEffect(() => {
    if (!provider || !isReady) return;
    const unsubscribe = provider.onCameraSettle(() => recompute());
    const interval = setInterval(recompute, refreshMs);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [provider, isReady, recompute, refreshMs]);

  return clusters;
}
