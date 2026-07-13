"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createMapProvider } from "@/lib/map/MapProviderFactory";
import { recordMapboxFailover, shouldStartInFallback } from "@/lib/map/health/mapboxHealth";
import type { LatLng, MapProvider, MapProviderKind } from "@/lib/map/types";

export interface UseMapProviderOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  initialCenter: LatLng;
  initialZoom: number;
  styleKey: string;
}

export interface UseMapProviderResult {
  provider: MapProvider | null;
  providerKind: MapProviderKind | null;
  isReady: boolean;
  /** True once the session has fallen back to Leaflet (sticky for the session). */
  isFallback: boolean;
}

/**
 * Owns the mount/failover lifecycle for a single map root: tries Mapbox first
 * (unless the session already fell back), swaps to Leaflet automatically on
 * init failure or a runtime error, and preserves the last-known camera across
 * the swap so the replacement provider doesn't snap back to a default view.
 *
 * Camera position is the only provider-owned state that doesn't already live
 * in React/Zustand — selection, filters, and trails survive a swap for free
 * since only the map root itself unmounts.
 */
export function useMapProvider({
  containerRef,
  initialCenter,
  initialZoom,
  styleKey,
}: UseMapProviderOptions): UseMapProviderResult {
  const [provider, setProvider] = useState<MapProvider | null>(null);
  const [providerKind, setProviderKind] = useState<MapProviderKind | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const lastCameraRef = useRef<{ center: LatLng; zoom: number }>({ center: initialCenter, zoom: initialZoom });
  const styleKeyRef = useRef(styleKey);
  const mountedProviderRef = useRef<MapProvider | null>(null);
  const failingOverRef = useRef(false);

  useEffect(() => {
    styleKeyRef.current = styleKey;
  }, [styleKey]);

  const mountProvider = useCallback(
    async (kind: MapProviderKind, center: LatLng, zoom: number): Promise<void> => {
      const container = containerRef.current;
      if (!container) return;

      const instance = await createMapProvider(kind);
      try {
        await instance.mount(container, { center, zoom, styleKey: styleKeyRef.current });
      } catch {
        if (kind === "mapbox") {
          recordMapboxFailover();
          await mountProvider("leaflet", center, zoom);
        }
        return;
      }

      mountedProviderRef.current = instance;
      setProvider(instance);
      setProviderKind(kind);
      setIsFallback(kind === "leaflet");
      setIsReady(true);
      failingOverRef.current = false;

      instance.onCameraSettle((c, z) => {
        lastCameraRef.current = { center: c, zoom: z };
      });

      instance.onError(() => {
        if (failingOverRef.current || kind !== "mapbox") return;
        failingOverRef.current = true;
        recordMapboxFailover();
        const { center, zoom } = lastCameraRef.current;
        instance.unmount();
        void mountProvider("leaflet", center, zoom);
      });
    },
    [containerRef],
  );

  useEffect(() => {
    let cancelled = false;
    const preferredKind: MapProviderKind = shouldStartInFallback() ? "leaflet" : "mapbox";

    void (async () => {
      if (cancelled) return;
      await mountProvider(preferredKind, initialCenter, initialZoom);
    })();

    return () => {
      cancelled = true;
      mountedProviderRef.current?.unmount();
      mountedProviderRef.current = null;
      setProvider(null);
      setIsReady(false);
    };
    // Intentionally mount once per component lifetime: subsequent center/zoom
    // changes are driven imperatively through the provider (flyTo/setView),
    // not by re-running this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (provider && isReady) provider.setStyle(styleKey);
  }, [provider, isReady, styleKey]);

  return { provider, providerKind, isReady, isFallback };
}
