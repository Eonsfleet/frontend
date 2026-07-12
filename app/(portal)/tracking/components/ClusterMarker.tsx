"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMapInstance } from "../MapInstanceContext";
import type { MapMarkerHandle } from "@/lib/map/types";

interface ClusterMarkerProps {
  id: string;
  lat: number;
  lng: number;
  count: number;
  statusFilter: string;
  onExpand: () => void;
}

function clusterHtml(count: number, statusFilter: string): string {
  return `<div class="${cn("custom-marker-cluster", `cluster-${statusFilter}`)}"><div><span>${count}</span></div></div>`;
}

/**
 * A cluster bubble, rendered through the same MapMarkerHandle API as an
 * individual VehicleMarker — clusters are never a proxied/opaque layer
 * feature on either engine, only ever a real marker instance produced by the
 * shared supercluster engine (see lib/map/clustering.ts for why).
 */
export function ClusterMarker({ id, lat, lng, count, statusFilter, onExpand }: ClusterMarkerProps) {
  const { provider, isReady } = useMapInstance();
  const handleRef = useRef<MapMarkerHandle | null>(null);

  useEffect(() => {
    if (!provider || !isReady) return;
    const handle = provider.addMarker(id, {
      lat,
      lng,
      html: clusterHtml(count, statusFilter),
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      onClick: onExpand,
    });
    handleRef.current = handle;
    return () => {
      provider.removeMarker(id);
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, isReady, id]);

  useEffect(() => {
    handleRef.current?.setPosition(lat, lng);
  }, [lat, lng]);

  useEffect(() => {
    handleRef.current?.setHtml(clusterHtml(count, statusFilter), { iconSize: [40, 40], iconAnchor: [20, 20] });
  }, [count, statusFilter]);

  return null;
}
