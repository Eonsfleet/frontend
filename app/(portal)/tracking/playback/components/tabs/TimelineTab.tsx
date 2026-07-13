'use client'

import { format } from 'date-fns'
import { Flag, AlertTriangle, MapPin } from 'lucide-react'
import type { PlaybackEvent, PlaybackEventType, PlaybackMovement } from '@/types'

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

interface TimelineEntry {
  key: string
  icon: typeof Flag
  label: string
  timestamp: string
  lat: number
  lng: number
  index: number
}

export function buildTimelineEntries(movements: PlaybackMovement[], events: PlaybackEvent[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  if (movements[0]) {
    entries.push({ key: 'start', icon: Flag, label: 'Playback Started', timestamp: movements[0].timestamp, lat: movements[0].lat, lng: movements[0].lng, index: 0 })
  }
  events.forEach((e, i) => {
    entries.push({ key: `event-${i}`, icon: AlertTriangle, label: EVENT_LABELS[e.type], timestamp: e.timestamp, lat: e.lat, lng: e.lng, index: e.startIndex })
  })
  if (movements.length > 1) {
    const last = movements[movements.length - 1]
    entries.push({ key: 'end', icon: Flag, label: 'Playback Ended', timestamp: last.timestamp, lat: last.lat, lng: last.lng, index: movements.length - 1 })
  }
  return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function TimelineTab({ movements, events, onJumpToIndex }: { movements: PlaybackMovement[]; events: PlaybackEvent[]; onJumpToIndex?: (index: number) => void }) {
  const entries = buildTimelineEntries(movements, events)
  if (entries.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No timeline data for this window.</p>
  }
  return (
    <div className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => onJumpToIndex?.(entry.index)}
          className="flex w-full items-center gap-3 py-2.5 px-1 text-left hover:bg-slate-50"
        >
          <entry.icon className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">{entry.label}</p>
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{format(new Date(entry.timestamp), 'hh:mm:ss a')}</span>
        </button>
      ))}
    </div>
  )
}