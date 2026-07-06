'use client'

import type { PlaybackStats } from '@/types'

export function VehiclesTab({ vehicleLabel, stats }: { vehicleLabel: string; stats: PlaybackStats }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1 text-xs font-bold text-slate-900">
      <span>{vehicleLabel}</span>
      <span className="text-slate-400">
        {stats.distanceKm.toFixed(1)} km · {Math.round(stats.avgSpeed)} km/h avg
      </span>
    </div>
  )
}
