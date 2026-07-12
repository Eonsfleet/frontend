"use client";

import { MapPinOff } from "lucide-react";

interface MapCompatibilityBannerProps {
  isFallback: boolean;
}

/**
 * Surfaces an active Mapbox->Leaflet failover. Visually consistent with
 * ConnectionBanner.tsx's non-blocking, top-centered pattern — the map stays
 * fully interactive underneath.
 */
export function MapCompatibilityBanner({ isFallback }: MapCompatibilityBannerProps) {
  if (!isFallback) return null;

  return (
    <div
      className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-600/95 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-2xl backdrop-blur-xl transition-all">
        <MapPinOff className="h-4 w-4" />
        Map running in compatibility mode
      </div>
    </div>
  );
}
