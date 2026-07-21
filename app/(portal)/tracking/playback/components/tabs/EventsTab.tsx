'use client'

import { format } from 'date-fns'
import type { PlaybackEvent, PlaybackEventType } from '@/types'
import { coordinateLabel, PlaybackEventFeed, type PlaybackFeedEntry } from './PlaybackEventFeed'

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

function eventTone(type: PlaybackEventType): PlaybackFeedEntry['tone'] {
  if (type === 'harsh_braking') return 'red'
  if (type === 'harsh_acceleration' || type === 'overspeed') return 'orange'
  return 'blue'
}

export function EventsTab({ events, onJumpToIndex }: { events: PlaybackEvent[]; onJumpToIndex?: (index: number) => void }) {
  const entries = events.map((event, index) => ({
    id: `${event.type}-${index}`,
    time: format(new Date(event.timestamp), 'hh:mm:ss a'),
    title: EVENT_LABELS[event.type],
    details: [...(event.peakSpeed != null ? [`Speed: ${Math.round(event.peakSpeed)} km/h`] : []), `Position: ${coordinateLabel(event.lat, event.lng)}`],
    tone: eventTone(event.type),
    onSelect: onJumpToIndex ? () => onJumpToIndex(event.startIndex) : undefined,
  }))

  return <PlaybackEventFeed entries={entries} emptyMessage="No events recorded for this window." />
}