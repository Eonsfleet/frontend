'use client'

import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import type { PlaybackEvent, PlaybackEventType } from '@/types'

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

export function EventsTab({ events }: { events: PlaybackEvent[] }) {
  if (events.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No events recorded for this window.</p>
  }
  return (
    <div className="divide-y divide-slate-100">
      {events.map((event, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-1">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">{EVENT_LABELS[event.type]}</p>
            {event.peakSpeed != null && <p className="text-[10px] font-medium text-slate-400">Peak {Math.round(event.peakSpeed)} km/h</p>}
          </div>
          <span className="text-[10px] font-bold text-slate-400">{format(new Date(event.timestamp), 'hh:mm:ss a')}</span>
        </div>
      ))}
    </div>
  )
}
