'use client'

import { format } from 'date-fns'
import type { PlaybackMovement } from '@/types'
import { coordinateLabel, PlaybackEventFeed } from './PlaybackEventFeed'

export function FuelTab({ movements }: { movements: PlaybackMovement[] }) {
  const readings = movements.filter((movement, index, all) => (
    movement.fuel_level_percent != null
    && (index === 0 || index === all.length - 1 || Math.round(movement.fuel_level_percent) !== Math.round(all[index - 1].fuel_level_percent ?? movement.fuel_level_percent))
  ))
  const entries = readings.map((movement) => ({
    id: `fuel-${movement.id}`,
    time: format(new Date(movement.timestamp), 'hh:mm:ss a'),
    title: 'Fuel level',
    details: [`Remaining: ${Math.round(movement.fuel_level_percent!)}%`, `Position: ${coordinateLabel(movement.lat, movement.lng)}`],
    tone: 'green' as const,
  }))

  return <PlaybackEventFeed entries={entries} emptyMessage="Fuel data isn't available for this device yet." />
}