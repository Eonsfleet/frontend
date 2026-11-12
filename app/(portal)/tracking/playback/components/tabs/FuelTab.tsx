'use client'

import { format } from 'date-fns'
import type { PlaybackMovement } from '@/types'
import { coordinateLabel, PlaybackEventFeed } from './PlaybackEventFeed'

/** The level a point carries, in the unit the tracker reported: litres when it sends litres, else a percentage. */
function levelOf(m: PlaybackMovement): { value: number; unit: 'L' | '%' } | null {
  if (m.fuel_level_liters != null) return { value: m.fuel_level_liters, unit: 'L' }
  if (m.fuel_level_percent != null) return { value: m.fuel_level_percent, unit: '%' }
  return null
}

export function FuelTab({ movements }: { movements: PlaybackMovement[] }) {
  // One entry where the level changes (by a whole litre or percent), plus the first and last reading.
  const levelled = movements.map((movement) => ({ movement, level: levelOf(movement) })).filter((p) => p.level !== null)
  const entries = levelled
    .filter(({ level }, index, all) => (
      index === 0 || index === all.length - 1 || Math.round(level!.value) !== Math.round(all[index - 1].level!.value)
    ))
    .map(({ movement, level }) => ({
      id: `fuel-${movement.id}`,
      time: format(new Date(movement.timestamp), 'hh:mm:ss a'),
      title: 'Fuel level',
      details: [`Remaining: ${Math.round(level!.value)}${level!.unit === 'L' ? ' L' : '%'}`, `Position: ${coordinateLabel(movement.lat, movement.lng)}`],
      tone: 'green' as const,
    }))

  return <PlaybackEventFeed entries={entries} emptyMessage="Fuel data isn't available for this device yet." />
}
