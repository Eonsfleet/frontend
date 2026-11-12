import { describe, it, expect } from 'vitest'
import { MOVING_MIN_KMH, isMovingSpeed } from '@/lib/movement'
import { resolveStatusKey } from '@/lib/vehicleStatus'
import { normalizeTelemetry } from '@/lib/utils'

describe('what counts as moving', () => {
  it('is the platform default of 5 km/h, not any speed above 0', () => {
    expect(MOVING_MIN_KMH).toBe(5)
    expect(isMovingSpeed(0)).toBe(false)
    expect(isMovingSpeed(2.9)).toBe(false)
    expect(isMovingSpeed(4.9)).toBe(false)
    expect(isMovingSpeed(5)).toBe(true)
    expect(isMovingSpeed(60)).toBe(true)
    expect(isMovingSpeed(null)).toBe(false)
    expect(isMovingSpeed(undefined)).toBe(false)
  })

  it('does not show a drifting parked vehicle as Moving', () => {
    expect(resolveStatusKey({ status: 'parked', is_online: true, speed: 3 })).toBe('parked')
    expect(resolveStatusKey({ status: 'idle', is_online: true, speed: 3 })).toBe('idle')
    expect(resolveStatusKey({ status: 'parked', is_online: true, speed: 5 })).toBe('moving')
  })

  it('still trusts the server when it says in transit', () => {
    expect(resolveStatusKey({ status: 'in_transit', is_online: true, speed: 0 })).toBe('moving')
  })

  it('derives parked, not in transit, from a drifting packet with the ignition off', () => {
    const n = normalizeTelemetry({ speed: 2, ignition: 'off', is_online: true } as any)
    expect(n?.status).toBe('parked')
    const m = normalizeTelemetry({ speed: 20, ignition: 'on', is_online: true } as any)
    expect(m?.status).toBe('in_transit')
  })
})
