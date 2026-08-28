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

describe('resolveVehicleTelemetry fleet-channel payload', () => {
  // The fleet channel (org.{org}.tracking / .vehicle.location.updated) names the
  // position's time `timestamp`; only the per-vehicle channel calls it
  // timestamp_utc. Reading one key meant a fleet packet never won the freshness
  // comparison and "Last Update" sat on the older REST value.
  it('accepts `timestamp` as the live packet time and lets it beat an older REST receipt', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: {
        plate: 'ABC-123',
        lastPacketReceivedAt: '2026-08-28T09:00:00Z',
      },
      telemetry: { timestamp: '2026-08-28T10:00:00Z' },
      deviceStatus: null,
    })
    expect(resolved.lastUpdate).toBe('2026-08-28T10:00:00Z')
  })

  it('keeps the REST receipt time when the live packet is older', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: {
        plate: 'ABC-123',
        lastPacketReceivedAt: '2026-08-28T10:00:00Z',
      },
      telemetry: { timestamp: '2026-08-28T09:00:00Z' },
      deviceStatus: null,
    })
    expect(resolved.lastUpdate).toBe('2026-08-28T10:00:00Z')
  })

  // System 2 documents odometer_km as the device's own counter with an arbitrary
  // base, and mileage_km as that counter rebased onto the vehicle's real
  // odometer. mileage_km is therefore the one shown; odometer_km is deliberately
  // not surfaced as an absolute reading.
  it('resolves the odometer from mileage_km', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: null,
      telemetry: { mileage_km: 84213.4, odometer_km: 4121010 },
      deviceStatus: null,
    })
    expect(resolved.odometer).toBe(84213.4)
  })

  it('reads lat/lng from the fleet payload, which does not send latitude/longitude', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: null,
      telemetry: { lat: 6.5244, lng: 3.3792 },
      deviceStatus: null,
    })
    expect(resolved.lat).toBe(6.5244)
    expect(resolved.lng).toBe(3.3792)
  })

  it('surfaces gps_confidence separately from the protocol confidence', () => {
    const resolved = resolveVehicleTelemetry({
      vehicle: null,
      telemetry: { gps_confidence: 0.94, confidence: 12 },
      deviceStatus: null,
    })
    expect(resolved.gpsConfidence).toBe(0.94)
    expect(resolved.confidence).toBe(12)
  })
})
