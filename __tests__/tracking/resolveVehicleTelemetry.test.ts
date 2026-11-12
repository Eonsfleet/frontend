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

describe('current_location telemetry reaches the Details tab', () => {
  // The exact relationships.current_location payload GET /vehicles/{id} returns
  // (TelemetryFormatHelper::fromVehicleLocation), flattened by the tracking hook
  // the way normalizeTelemetry does — metadata hoisted to the top level.
  const currentLocation = {
    device_imei: '862288040123456',
    latitude: 6.5244,
    longitude: 3.3792,
    speed: 0,
    ignition: 'on',
    movement: 'off',
    altitude: 42,
    heading: 90,
    satellites: 7,
    address: 'Ikeja, Lagos',
    protocol_name: 'teltonika',
    fuel_level_liters: 48.5,
    fuel_level_percent: 62,
    odometer: 128400,
    timestamp_utc: '2026-08-30T12:00:00+00:00',
    // Hoisted out of metadata by normalizeTelemetry, units stripped.
    engine_rpm: 850,
    engine_rpm_obd: 860,
    engine_temperature: 88,
    battery_voltage: 4.15,
    external_voltage: 13.8,
    battery_current: 0.42,
    door_status: 'closed',
    driving_state: 'idling',
    oil_level: 78,
    load_weight: 1200,
    eco_score: 82,
    fuel_rate: 2.4,
    fuel_consumed: 12.5,
    fuel_used_gps: 11.9,
    fuel_level_obd: 61,
    fuel_source: 'can',
    total_mileage: 128400,
    trip_odometer: 42,
    odometer_source: 'can',
    active_gsm_operator: 62130,
    confidence: 0.98,
    gps_confidence: 0.95,
    idling: true,
    jamming: false,
    immobilizer: false,
    unplug: false,
    sleep_mode: false,
  }

  // No WS packet has arrived yet — the panel has only the REST snapshot, which
  // is exactly the state a just-selected vehicle is in.
  const resolved = resolveVehicleTelemetry({
    vehicle: {
      plate: 'ABC-123-XD',
      raw: currentLocation,
      speed: currentLocation.speed,
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
    } as any,
    telemetry: null,
    deviceStatus: 'online',
  })

  it.each([
    ['drivingState', 'idling'],
    ['doorStatus', 'closed'],
    ['loadWeight', 1200],
    ['rpm', 850],
    ['rpmObd', 860],
    ['oilLevel', 78],
    ['odometer', 128400],
    ['mileage', 128400],
    ['tripOdo', 42],
    ['odoSource', 'can'],
    ['fuelRate', 2.4],
    ['fuelConsumed', 12.5],
    ['fuelUsedGps', 11.9],
    ['fuelLevelObd', 61],
    ['fuelSource', 'can'],
    ['extV', 13.8],
    ['batteryCurrent', 0.42],
    ['ecoScore', 82],
    ['altitude', 42],
    ['gpsConfidence', 0.95],
    ['protocol', 'teltonika'],
    ['confidence', 0.98],
    ['satellites', 7],
    ['gsmOperator', 62130],
    ['engineTemp', 88],
  ])('surfaces %s from current_location alone', (field, expected) => {
    expect(resolved[field as keyof typeof resolved]).toBe(expected)
  })

  it('raises the idling alert chip from the snapshot', () => {
    expect(resolved.idling).toBe(true)
    expect(resolved.jamming).toBe(false)
  })
})

describe('a missing engine temperature', () => {
  it('stays absent instead of becoming 0 °C, and never raises the overheat warning', () => {
    const resolved = resolveVehicleTelemetry({ vehicle: null, telemetry: { gps_datetime: '2026-11-12T10:00:00Z' }, deviceStatus: null })
    expect(resolved.engineTemp).toBeNull()
    expect(resolved.tempWarn).toBe(false)
  })

  it('still warns when a real reading is high', () => {
    const resolved = resolveVehicleTelemetry({ vehicle: null, telemetry: { gps_datetime: '2026-11-12T10:00:00Z', metadata: { engine_temperature: 112 } }, deviceStatus: null })
    expect(resolved.engineTemp).toBe(112)
    expect(resolved.tempWarn).toBe(true)
  })
})

describe('an ignition the tracker does not report', () => {
  const resolve = (telemetry: Record<string, unknown>) => resolveVehicleTelemetry({ vehicle: null, telemetry: { gps_datetime: '2026-11-12T10:00:00Z', ...telemetry }, deviceStatus: null })

  it('is flagged unknown when the platform said so, in the packet or in the snapshot metadata', () => {
    expect(resolve({ ignition: 'off', ignition_known: false }).ignitionKnown).toBe(false)
    expect(resolve({ ignition: 'off', metadata: { ignition_known: false } }).ignitionKnown).toBe(false)
  })

  it('is known by default, and when it was reported on or off', () => {
    expect(resolve({ ignition: 'off' }).ignitionKnown).toBe(true)
    expect(resolve({ ignition: 'on', ignition_known: true }).ignitionKnown).toBe(true)
    expect(resolve({ ignition: 'off', ignition_known: true }).ignitionKnown).toBe(true)
  })
})

describe('which odometer is shown', () => {
  it('prefers the rebased mileage over the raw device counter, whichever object holds them', () => {
    // A packet carrying both: the counter's base is arbitrary, the mileage is the vehicle's real odometer.
    const fromPacket = resolveVehicleTelemetry({
      vehicle: null,
      telemetry: { gps_datetime: '2026-11-12T10:00:00Z', odometer: 4121010, mileage_km: 84215.2 },
      deviceStatus: null,
    })
    expect(fromPacket.odometer).toBe(84215.2)

    // The vehicle entry keeps the snapshot's counter in odometer and the live mileage in raw.
    const fromEntry = resolveVehicleTelemetry({
      vehicle: { plate: 'ABC', odometer: 4121010, raw: { mileage_km: 84215.2 } } as any,
      telemetry: null,
      deviceStatus: null,
    })
    expect(fromEntry.odometer).toBe(84215.2)
  })

  it('falls back to the counter when there is no mileage', () => {
    const resolved = resolveVehicleTelemetry({ vehicle: { plate: 'ABC', odometer: 51000 } as any, telemetry: { gps_datetime: '2026-11-12T10:00:00Z' }, deviceStatus: null })
    expect(resolved.odometer).toBe(51000)
  })
})

describe('readings in the snapshot reach the drawer fields', () => {
  // The snapshot's metadata is flattened into raw by normalizeTelemetry; several fields read only meta and the
  // live packet and never looked in raw, so they stayed empty although the backend sent them.
  const fromSnapshot = (raw: Record<string, unknown>) => resolveVehicleTelemetry({ vehicle: { plate: 'ABC', raw } as any, telemetry: null, deviceStatus: null })

  it('picks up HDOP, PDOP, GSM signal, battery level, engine load, throttle and coolant from the snapshot', () => {
    const r = fromSnapshot({ hdop: 0.9, pdop: 1.4, gsm_signal: 4, battery_level: 87, engine_load: 41, throttle: 18, coolant_temperature: 88 })
    expect([r.hdop, r.pdop, r.gsmSignal, r.batteryLevel, r.engineLoad, r.throttle, r.coolantTemp]).toEqual([0.9, 1.4, 4, 87, 41, 18, 88])
  })

  it('derives a driving state from the position when the device sends none, and keeps obd_status honest', () => {
    const moving = resolveVehicleTelemetry({ vehicle: { plate: 'ABC', status: 'in_transit', raw: {} } as any, telemetry: null, deviceStatus: null })
    expect(moving.drivingState).toBe('Moving')
    expect(moving.health.obd_status).toBe('---')

    const offline = resolveVehicleTelemetry({ vehicle: { plate: 'ABC', status: 'offline', raw: {} } as any, telemetry: null, deviceStatus: null })
    expect(offline.drivingState).toBeNull()

    const reported = fromSnapshot({ driving_state: 'Eco' })
    expect(reported.drivingState).toBe('Eco')
  })
})
