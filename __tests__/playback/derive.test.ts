import { describe, it, expect } from 'vitest'
import {
  computePlaybackStats,
  buildSpeedSegments,
  detectStops,
  detectEvents,
  filterMovementsByGeofence,
  DEFAULT_THRESHOLDS,
} from '@/lib/playback/derive'
import type { PlaybackMovement } from '@/types'

function movement(overrides: Partial<PlaybackMovement>): PlaybackMovement {
  return { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 0, heading: 0, timestamp: '2024-01-01T08:00:00Z', ...overrides }
}

describe('computePlaybackStats', () => {
  it('returns zeroed stats for an empty series', () => {
    expect(computePlaybackStats([])).toEqual({ durationMinutes: 0, distanceKm: 0, avgSpeed: 0, maxSpeed: 0 })
  })

  it('computes duration, distance, avg speed and max speed over a short series', () => {
    const movements = [
      movement({ lat: 6.5, lng: 3.4, speed: 40, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ lat: 6.51, lng: 3.41, speed: 60, timestamp: '2024-01-01T08:06:00Z' }),
    ]
    const stats = computePlaybackStats(movements)
    expect(stats.durationMinutes).toBe(6)
    expect(stats.maxSpeed).toBe(60)
    expect(stats.distanceKm).toBeGreaterThan(0)
    expect(stats.avgSpeed).toBeCloseTo((stats.distanceKm / stats.durationMinutes) * 60, 5)
  })
})

describe('buildSpeedSegments', () => {
  it('buckets consecutive points of the same speed range into one segment', () => {
    const movements = [
      movement({ lat: 6.5, lng: 3.4, speed: 10 }),
      movement({ lat: 6.501, lng: 3.401, speed: 15 }),
      movement({ lat: 6.502, lng: 3.402, speed: 90 }),
    ]
    const segments = buildSpeedSegments(movements)
    expect(segments).toHaveLength(2)
    expect(segments[0].bucket).toBe('0-20')
    expect(segments[1].bucket).toBe('80+')
  })
})

describe('detectStops', () => {
  it('flags a run of near-zero speed lasting at least the minimum duration', () => {
    const movements = [
      movement({ speed: 40, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 0, timestamp: '2024-01-01T08:01:00Z' }),
      movement({ speed: 0, timestamp: '2024-01-01T08:07:00Z' }),
      movement({ speed: 45, timestamp: '2024-01-01T08:08:00Z' }),
    ]
    const stops = detectStops(movements, { minStopDurationMinutes: 5 })
    expect(stops).toHaveLength(1)
    expect(stops[0].durationMinutes).toBe(6)
  })

  it('ignores stops shorter than the configured minimum', () => {
    const movements = [
      movement({ speed: 40, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 0, timestamp: '2024-01-01T08:01:00Z' }),
      movement({ speed: 45, timestamp: '2024-01-01T08:02:00Z' }),
    ]
    expect(detectStops(movements, { minStopDurationMinutes: 5 })).toHaveLength(0)
  })
})

describe('detectEvents', () => {
  it('flags a contiguous run above the max speed threshold as one overspeed event with its peak speed', () => {
    const movements = [
      movement({ speed: 50, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 90, timestamp: '2024-01-01T08:00:10Z' }),
      movement({ speed: 95, timestamp: '2024-01-01T08:00:20Z' }),
      movement({ speed: 50, timestamp: '2024-01-01T08:00:30Z' }),
    ]
    const events = detectEvents(movements, { maxSpeedThreshold: 80 })
    const overspeed = events.filter((e) => e.type === 'overspeed')
    expect(overspeed).toHaveLength(1)
    expect(overspeed[0].peakSpeed).toBe(95)
  })

  it('flags a sharp deceleration as harsh braking', () => {
    const movements = [
      movement({ speed: 80, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 20, timestamp: '2024-01-01T08:00:05Z' }),
    ]
    const events = detectEvents(movements, DEFAULT_THRESHOLDS)
    expect(events.some((e) => e.type === 'harsh_braking')).toBe(true)
  })
})

describe('filterMovementsByGeofence', () => {
  it('emits a geofence_enter event when a point moves inside a circle geofence', () => {
    const geofence = {
      id: '1',
      attributes: {
        name: 'Depot',
        description: null,
        type: 'circle' as const,
        trigger_type: 'both' as const,
        coordinates: { lat: 6.5, lng: 3.4 },
        radius: 500,
        speed: 0,
        is_active: true,
        status: true,
        schedule: null,
      },
      relationships: {},
    }
    const movements = [
      movement({ lat: 6.6, lng: 3.5 }),
      movement({ lat: 6.5001, lng: 3.4001 }),
    ]
    const events = filterMovementsByGeofence(movements, geofence)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('geofence_enter')
  })
})
