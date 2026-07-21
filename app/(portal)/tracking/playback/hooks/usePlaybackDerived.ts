'use client'

import { useMemo } from 'react'
import { detectPlaybackGaps } from '@/lib/playback/route'
import type { Geofence, PlaybackMovement } from '@/types'
import {
  computePlaybackStats,
  buildSpeedSegments,
  detectStops,
  detectEvents,
  filterMovementsByGeofence,
  DEFAULT_THRESHOLDS,
  type DrivingBehaviourThresholds,
} from '@/lib/playback/derive'

export function usePlaybackDerived(
  movements: PlaybackMovement[],
  thresholds: DrivingBehaviourThresholds = DEFAULT_THRESHOLDS,
  geofence: Geofence | null = null,
) {
  const stats = useMemo(() => computePlaybackStats(movements), [movements])
  const speedSegments = useMemo(() => buildSpeedSegments(movements), [movements])
  const stops = useMemo(() => detectStops(movements, thresholds), [movements, thresholds])
  const gaps = useMemo(() => detectPlaybackGaps(movements), [movements])
  const drivingEvents = useMemo(() => detectEvents(movements, thresholds), [movements, thresholds])
  const geofenceEvents = useMemo(
    () => (geofence ? filterMovementsByGeofence(movements, geofence) : []),
    [movements, geofence],
  )
  const events = useMemo(
    () => [...drivingEvents, ...geofenceEvents].sort((a, b) => a.startIndex - b.startIndex),
    [drivingEvents, geofenceEvents],
  )

  return { stats, speedSegments, stops, gaps, events }
}
