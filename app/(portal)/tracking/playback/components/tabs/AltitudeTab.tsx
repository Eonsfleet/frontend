'use client'

import { format } from 'date-fns'
import type { PlaybackMovement } from '@/types'
import { coordinateLabel, PlaybackEventFeed } from './PlaybackEventFeed'

export function AltitudeTab({ movements }: { movements: PlaybackMovement[] }) {
  const readings = movements.filter((movement, index, all) => (
    movement.altitude != null
    && (index === 0 || index === all.length - 1 || Math.round(movement.altitude) !== Math.round(all[index - 1].altitude ?? movement.altitude))
  ))
  const entries = readings.map((movement) => ({
    id: `altitude-${movement.id}`,
    time: format(new Date(movement.timestamp), 'hh:mm:ss a'),
    title: 'Altitude',
    details: [`Elevation: ${Math.round(movement.altitude!)} m`, `Position: ${coordinateLabel(movement.lat, movement.lng)}`],
    tone: 'blue' as const,
  }))

  return <PlaybackEventFeed entries={entries} emptyMessage="Altitude data isn't available for this device yet." />
}