import { describe, it, expect } from 'vitest'
import { appendTrailPoint, TRAIL_MAX_POINTS, TRAIL_MAX_AGE_MS, type TrailPoint } from '@/lib/vehicleTrail'

const pt = (lat: number, lng: number, timestamp: number): TrailPoint => ({ lat, lng, timestamp })

describe('appendTrailPoint', () => {
  it('appends a point to an empty trail', () => {
    const result = appendTrailPoint([], pt(6.5, 3.4, 1000))
    expect(result).toEqual([pt(6.5, 3.4, 1000)])
  })

  it('appends to an existing trail without mutating the input array', () => {
    const trail = [pt(6.5, 3.4, 1000)]
    const result = appendTrailPoint(trail, pt(6.51, 3.41, 2000))
    expect(trail).toHaveLength(1)
    expect(result).toEqual([pt(6.5, 3.4, 1000), pt(6.51, 3.41, 2000)])
  })

  it('drops points older than TRAIL_MAX_AGE_MS relative to the new point', () => {
    const oldPoint = pt(6.5, 3.4, 1000)
    const recentPoint = pt(6.51, 3.41, 1000 + TRAIL_MAX_AGE_MS - 1000)
    const newPoint = pt(6.52, 3.42, 1000 + TRAIL_MAX_AGE_MS + 1)
    const result = appendTrailPoint([oldPoint, recentPoint], newPoint)
    expect(result).toEqual([recentPoint, newPoint])
  })

  it('caps the trail at TRAIL_MAX_POINTS, dropping the oldest first', () => {
    let trail: TrailPoint[] = []
    for (let i = 0; i < TRAIL_MAX_POINTS + 10; i++) {
      trail = appendTrailPoint(trail, pt(i, i, i))
    }
    expect(trail).toHaveLength(TRAIL_MAX_POINTS)
    expect(trail[0].timestamp).toBe(10)
    expect(trail[trail.length - 1].timestamp).toBe(TRAIL_MAX_POINTS + 9)
  })
})
