'use client'

import { format } from 'date-fns'
import type { PlaybackEvent, PlaybackEventType, PlaybackMovement, PlaybackStop } from '@/types'
import { coordinateLabel, PlaybackEventFeed, type PlaybackFeedEntry } from './PlaybackEventFeed'

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

type TimelineFeedEntry = PlaybackFeedEntry & {
  timestamp: string
  index: number
}

function eventTone(type: PlaybackEventType): PlaybackFeedEntry['tone'] {
  if (type === 'harsh_braking') return 'red'
  if (type === 'harsh_acceleration' || type === 'overspeed') return 'orange'
  return 'blue'
}

export function buildTimelineEntries(movements: PlaybackMovement[], events: PlaybackEvent[], stops: PlaybackStop[] = []): TimelineFeedEntry[] {
  const entries: TimelineFeedEntry[] = []
  const first = movements[0]

  if (first) {
    entries.push({
      id: 'start',
      timestamp: first.timestamp,
      time: format(new Date(first.timestamp), 'hh:mm:ss a'),
      title: 'Playback Started',
      details: [`Position: ${coordinateLabel(first.lat, first.lng)}`],
      tone: 'green',
      index: 0,
    })
  }

  const movingIndex = movements.findIndex((movement, index) => index > 0 && movement.speed > 0)
  if (movingIndex > 0) {
    const movement = movements[movingIndex]
    entries.push({
      id: 'moving',
      timestamp: movement.timestamp,
      time: format(new Date(movement.timestamp), 'hh:mm:ss a'),
      title: 'Vehicle Moving',
      details: [`Speed: ${Math.round(movement.speed)} km/h`, `Position: ${coordinateLabel(movement.lat, movement.lng)}`],
      tone: 'blue',
      index: movingIndex,
    })
  }

  events.forEach((event, index) => {
    entries.push({
      id: `event-${index}`,
      timestamp: event.timestamp,
      time: format(new Date(event.timestamp), 'hh:mm:ss a'),
      title: EVENT_LABELS[event.type],
      details: [...(event.peakSpeed != null ? [`Speed: ${Math.round(event.peakSpeed)} km/h`] : []), `Position: ${coordinateLabel(event.lat, event.lng)}`],
      tone: eventTone(event.type),
      index: event.startIndex,
    })
  })

  stops.forEach((stop, index) => {
    entries.push({
      id: `stop-${index}`,
      timestamp: stop.startTimestamp,
      time: format(new Date(stop.startTimestamp), 'hh:mm:ss a'),
      title: 'Stop',
      details: [`Duration: ${Math.round(stop.durationMinutes)}m`, `Position: ${coordinateLabel(stop.lat, stop.lng)}`],
      tone: 'blue',
      badge: `${Math.round(stop.durationMinutes)}m`,
      index: stop.startIndex,
    })
  })

  if (movements.length > 1) {
    const last = movements[movements.length - 1]
    entries.push({
      id: 'end',
      timestamp: last.timestamp,
      time: format(new Date(last.timestamp), 'hh:mm:ss a'),
      title: 'Playback Ended',
      details: [`Position: ${coordinateLabel(last.lat, last.lng)}`],
      tone: 'red',
      index: movements.length - 1,
    })
  }

  return entries.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
}

export function TimelineTab({ movements, events, stops, onJumpToIndex }: { movements: PlaybackMovement[]; events: PlaybackEvent[]; stops: PlaybackStop[]; onJumpToIndex?: (index: number) => void }) {
  const entries = buildTimelineEntries(movements, events, stops).map((entry) => ({
    ...entry,
    onSelect: onJumpToIndex ? () => onJumpToIndex(entry.index) : undefined,
  }))

  return <PlaybackEventFeed entries={entries} emptyMessage="No timeline data for this window." />
}