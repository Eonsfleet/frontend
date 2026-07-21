import { describe, expect, it } from 'vitest'
import { detectPlaybackGaps, simplifyRoutePoints } from '@/lib/playback/route'
import type { PlaybackMovement } from '@/types'

function movement(timestamp: string, lat: number, lng: number): PlaybackMovement {
  return {
    id: `${lat}-${lng}`,
    vehicle_id: 'vehicle-1',
    timestamp,
    lat,
    lng,
    speed: 35,
    heading: 90,
  } as PlaybackMovement
}

describe('playback route helpers', () => {
  it('reduces collinear display points while preserving route endpoints', () => {
    const points = [
      { lat: 6.5000, lng: 3.3000 },
      { lat: 6.5001, lng: 3.3001 },
      { lat: 6.5002, lng: 3.3002 },
      { lat: 6.5003, lng: 3.3003 },
    ]

    const simplified = simplifyRoutePoints(points, 2)

    expect(simplified).toEqual([points[0], points[3]])
  })

  it('detects telemetry gaps greater than five minutes', () => {
    const gaps = detectPlaybackGaps([
      movement('2025-01-01T08:00:00.000Z', 6.50, 3.30),
      movement('2025-01-01T08:04:00.000Z', 6.51, 3.31),
      movement('2025-01-01T08:11:30.000Z', 6.52, 3.32),
    ])

    expect(gaps).toEqual([
      expect.objectContaining({ startIndex: 1, endIndex: 2, durationMs: 450_000 }),
    ])
  })
})