import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePlaybackDerived } from '@/app/(portal)/tracking/playback/hooks/usePlaybackDerived'
import type { PlaybackMovement } from '@/types'

const movements: PlaybackMovement[] = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 95, heading: 0, timestamp: '2024-01-01T08:05:00Z' },
]

describe('usePlaybackDerived', () => {
  it('returns stats, speed segments and events derived from the movement series', () => {
    const { result } = renderHook(() => usePlaybackDerived(movements))
    expect(result.current.stats.maxSpeed).toBe(95)
    expect(result.current.speedSegments.length).toBeGreaterThan(0)
    expect(result.current.events.some((e) => e.type === 'overspeed')).toBe(true)
  })

  it('returns no geofence events when no geofence is passed', () => {
    const { result } = renderHook(() => usePlaybackDerived(movements))
    expect(result.current.events.some((e) => e.type.startsWith('geofence'))).toBe(false)
  })
})
