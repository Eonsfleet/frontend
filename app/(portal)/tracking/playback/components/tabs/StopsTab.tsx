'use client'

import { format } from 'date-fns'
import type { PlaybackStop } from '@/types'
import { coordinateLabel, PlaybackEventFeed } from './PlaybackEventFeed'

export function StopsTab({ stops, onJumpToIndex }: { stops: PlaybackStop[]; onJumpToIndex?: (index: number) => void }) {
  const entries = stops.map((stop, index) => ({
    id: `stop-${index}`,
    time: format(new Date(stop.startTimestamp), 'hh:mm:ss a'),
    title: 'Stop',
    details: [`Duration: ${Math.round(stop.durationMinutes)}m`, `Position: ${coordinateLabel(stop.lat, stop.lng)}`],
    tone: 'blue' as const,
    badge: `${Math.round(stop.durationMinutes)}m`,
    onSelect: onJumpToIndex ? () => onJumpToIndex(stop.startIndex) : undefined,
  }))

  return <PlaybackEventFeed entries={entries} emptyMessage="No stops detected for this window." />
}