"use client";

import { Progress } from "@/components/ui/progress";

interface FleetLoadProgressBannerProps {
  loaded: number;
  total: number;
}

/**
 * Non-blocking overlay shown while the fleet's initial GET /vehicles?view=map
 * page-walk is in progress — the map/sidebar already render each page as it
 * arrives, this just gives the user visible proof more is still loading.
 */
export function FleetLoadProgressBanner({ loaded, total }: FleetLoadProgressBannerProps) {
  if (total <= 0 || loaded >= total) return null;
  const percent = Math.min(100, Math.round((loaded / total) * 100));

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-72"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto rounded-2xl px-4 py-3 shadow-2xl border border-blue-100 bg-white/95 backdrop-blur-xl">
        <p className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-2">
          Loaded {loaded} out of {total} assets
        </p>
        <Progress value={percent} indicatorClassName="bg-blue-600" className="bg-blue-100" />
      </div>
    </div>
  );
}
