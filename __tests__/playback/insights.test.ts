import { describe, expect, it } from 'vitest'
import { computeFuelSummary, computeTimeBreakdown, summariseBehaviour } from '@/lib/playback/insights'
import type { PlaybackMovement } from '@/types'

const t = (min: number) => new Date(Date.UTC(2026, 0, 1, 0, min)).toISOString()
const pt = (min: number, speed: number, extra: Partial<PlaybackMovement> = {}): PlaybackMovement => ({
  id: min, vehicle_id: 'v', lat: 6.5, lng: 3.3, speed, heading: 0, timestamp: t(min), ...extra,
})

describe('computeTimeBreakdown', () => {
  it('splits moving, idle (ignition on) and stopped, and flags long silences as no data', () => {
    const r = computeTimeBreakdown([
      pt(0, 40), pt(2, 0, { ignition: true }), pt(5, 0, { ignition: false }), pt(8, 0, { ignition: false }), pt(30, 10),
    ])
    expect(r.movingMs).toBe(2 * 60_000)
    expect(r.idleMs).toBe(3 * 60_000)
    expect(r.stoppedMs).toBe(3 * 60_000)
    expect(r.noDataMs).toBe(22 * 60_000)
  })
})

describe('computeFuelSummary', () => {
  it('separates consumption, refuels and stationary drains', () => {
    const r = computeFuelSummary([
      pt(0, 30, { fuel_level_liters: 50 }), pt(1, 30, { fuel_level_liters: 48 }),
      pt(2, 0, { fuel_level_liters: 70 }), pt(3, 0, { fuel_level_liters: 55 }),
    ])!
    expect(r.unit).toBe('L')
    expect(r.refuelCount).toBe(1)
    expect(r.refuelled).toBe(22)
    expect(r.consumed).toBe(2)
    expect(r.suspectedDrains).toHaveLength(1)
  })
  it('returns null without fuel data', () => expect(computeFuelSummary([pt(0, 1), pt(1, 1)])).toBeNull())
})

describe('summariseBehaviour', () => {
  it('normalises incidents per 100 km', () => {
    const r = summariseBehaviour(
      [{ type: 'harsh_braking', startIndex: 0, endIndex: 1, timestamp: t(0), lat: 0, lng: 0 }],
      [pt(0, 10), pt(1, 10)], 50,
    )
    expect(r.incidentsPer100Km).toBe(2)
  })
})
