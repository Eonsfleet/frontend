import { describe, expect, it } from 'vitest'
import { VehicleInterpolator } from '@/lib/vehicleInterpolation'

describe('VehicleInterpolator', () => {
  it('uses one clock source to advance from the prior GPS fix', () => {
    const interpolator = new VehicleInterpolator()
    interpolator.snap('vehicle-1', { lat: 6.5, lng: 3.3, heading: 90, timestamp: 1_000 })
    interpolator.ingest('vehicle-1', { lat: 6.6, lng: 3.4, heading: 90, timestamp: 2_000 })

    const position = interpolator.getInterpolated('vehicle-1', 2_500)

    expect(position?.lat).toBeCloseTo(6.55)
    expect(position?.lng).toBeCloseTo(3.35)
    expect(position?.heading).toBe(90)
  })

  it('caps catch-up animation so sparse packets do not create long visible lag', () => {
    const interpolator = new VehicleInterpolator()
    interpolator.snap('vehicle-1', { lat: 6.5, lng: 3.3, heading: 90, timestamp: 0 })
    interpolator.ingest('vehicle-1', { lat: 6.7, lng: 3.5, heading: 90, timestamp: 10_000 })

    expect(interpolator.getInterpolated('vehicle-1', 12_000)).toMatchObject({
      lat: 6.7,
      lng: 3.5,
      heading: 90,
    })
  })
})