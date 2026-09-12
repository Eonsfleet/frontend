"use client";

import { X } from "lucide-react";
import type { Cluster, Geofence } from "@/types";
import { FilterState, getActiveFilterBadges } from "./FilterPanelDrawer";

interface ActiveFilterChipsProps {
  filters: FilterState;
  clusters: Cluster[];
  geofences: Geofence[];
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
}

/** Always-visible "Lagos Cluster ✕ · Online ✕" row above the asset list — the
 * drawer's own summary shows the same badges once it's open, but filters
 * should be scannable/removable without opening it first. */
export function ActiveFilterChips({
  filters,
  clusters,
  geofences,
  onApplyFilters,
  onResetFilters,
}: ActiveFilterChipsProps) {
  const badges = getActiveFilterBadges(filters, clusters, geofences, onApplyFilters);

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-4 py-2 border-b border-slate-100">
      {badges.map((badge) => (
        <button
          key={badge.id}
          onClick={badge.clear}
          className="shrink-0 flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold pl-2.5 pr-1.5 py-1 hover:bg-blue-100 transition-colors"
        >
          {badge.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      {badges.length > 1 && (
        <button
          onClick={onResetFilters}
          className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors px-1.5"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
