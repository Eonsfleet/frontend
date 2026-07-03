import { describe, it, expect } from 'vitest'
import { resolveVehicleTelemetry } from '@/lib/resolveVehicleTelemetry'

describe('resolveVehicleTelemetry lastUpdate priority', () => {
  it('prefers telemetry.timestamp_utc (server ingestion time) over telemetry.gps_datetime (device clock)', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: null,
      telemetry: {
        gps_datetime: '2025-09-01T00:00:00Z',
        timestamp_utc: '2026-07-03T12:00:00Z',
      },
      deviceStatus: null,
    })
    expect(resolved.lastUpdate).toBe('2026-07-03T12:00:00Z')
  })

  it('falls back to gps_datetime when timestamp_utc is absent from the live packet', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: null,
      telemetry: { gps_datetime: '2025-09-01T00:00:00Z' },
      deviceStatus: null,
    })
    expect(resolved.lastUpdate).toBe('2025-09-01T00:00:00Z')
  })

  it('falls back to the vehicle snapshot lastUpdate when there is no live telemetry at all', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: { plate: 'ABC-123', lastUpdate: '2026-07-01T00:00:00Z' } as any,
      telemetry: null,
      deviceStatus: null,
    })
    expect(resolved.lastUpdate).toBe('2026-07-01T00:00:00Z')
  })
})
