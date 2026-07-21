'use client'

import type { PlaybackEvent, PlaybackEventType, PlaybackStats } from '@/types'

export interface PlaybackSummaryPanelProps {
  stats: PlaybackStats
  stopsCount: number
  events: PlaybackEvent[]
  vehicleLabel: string
}

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-black text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins.toString().padStart(2, '0')}m`
}

export function PlaybackSummaryPanel({ stats, stopsCount, events, vehicleLabel }: PlaybackSummaryPanelProps) {
  const eventCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1
    return acc
  }, {})
  const topEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="shrink-0 space-y-6 p-4">
      <section>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Duration" value={formatDuration(stats.durationMinutes)} />
          <Stat label="Distance" value={`${stats.distanceKm.toFixed(1)} km`} />
          <Stat label="Avg Speed" value={`${Math.round(stats.avgSpeed)} km/h`} />
          <Stat label="Max Speed" value={`${Math.round(stats.maxSpeed)} km/h`} />
          <Stat label="Stops" value={stopsCount} />
          <Stat label="Events" value={events.length} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Top Events</h4>
        </div>
        {topEvents.length === 0 ? (
          <p className="text-[10px] font-bold text-slate-400">No events recorded for this window.</p>
        ) : (
          <div className="space-y-1.5">
            {topEvents.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs font-bold text-slate-700 py-1">
                <span>{EVENT_LABELS[type as PlaybackEventType]}</span>
                <span className="text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Top Vehicles</h4>
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 py-1">
          <span>{vehicleLabel}</span>
          <span className="text-slate-400">{stats.distanceKm.toFixed(1)} km · {formatDuration(stats.durationMinutes)}</span>
        </div>
      </section>

    </div>
  )
}
