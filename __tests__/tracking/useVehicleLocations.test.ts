import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVehicleLocations } from '@/app/(portal)/tracking/hooks/useVehicleLocations'

vi.mock('@/store/packetStreamStore', () => ({
  usePacketStreamStore: {
    getState: () => ({ push: vi.fn() }),
  },
}))

vi.mock('@/lib/api/vehicles', () => ({
  getVehicleById: vi.fn().mockResolvedValue({ data: null }),
}))

function makeSubscribePrivate() {
  const handlers = new Map<string, (data: any) => void>()
  const subscribePrivate = vi.fn((channel: string, event: string, cb: (data: any) => void) => {
    handlers.set(`${channel}::${event}`, cb)
    return () => handlers.delete(`${channel}::${event}`)
  })
  return { subscribePrivate, handlers }
}

const Wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  )

const baseProps = {
  vehicles: [],
  token: 'test-token',
  organization: { id: 'org-1', attributes: { identifier: 'org-1' } },
}

describe('useVehicleLocations trail buffer', () => {
  it('appends live positions to trails only for the selected vehicle', () => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result, rerender } = renderHook(
      (props: { selectedVehicleId: string | null }) =>
        useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: props.selectedVehicleId }),
      { initialProps: { selectedVehicleId: '42' }, wrapper: Wrapper },
    )

    const locationHandler = handlers.get('org.org-1.tracking::.vehicle.location.updated')!

    act(() => {
      locationHandler({ vehicle_id: '42', lat: 6.5, lng: 3.4, speed: 10, status: 'in_transit' })
    })
    act(() => {
      locationHandler({ vehicle_id: '99', lat: 1.1, lng: 2.2, speed: 10, status: 'in_transit' })
    })

    expect(result.current.trails['42']).toHaveLength(1)
    expect(result.current.trails['42'][0]).toMatchObject({ lat: 6.5, lng: 3.4 })
    expect(result.current.trails['99']).toBeUndefined()

    act(() => {
      locationHandler({ vehicle_id: '42', lat: 6.51, lng: 3.41, speed: 12, status: 'in_transit' })
    })
    expect(result.current.trails['42']).toHaveLength(2)

    // Changing selection clears the trail buffer
    rerender({ selectedVehicleId: '99' })
    expect(result.current.trails['42']).toBeUndefined()
  })
})

describe('useVehicleLocations fleet-channel id keying', () => {
  it('keys the fleet-wide WS packet by vehicle_id directly — view=map has no separate uuid', () => {
    const vehicles = [
      { id: '7', attributes: { registration_number: 'ABC-123' } },
    ] as any

    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, vehicles, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )

    const locationHandler = handlers.get('org.org-1.tracking::.vehicle.location.updated')!
    act(() => {
      locationHandler({ vehicle_id: '7', lat: 6.5, lng: 3.4, speed: 10, status: 'in_transit' })
    })

    expect(result.current.locations['7']).toMatchObject({ lat: 6.5, lng: 3.4, speed: 10 })
  })

  it('keys .vehicle.status.changed and .fuel_alert by vehicle_id too', () => {
    const vehicles = [
      { id: '7', attributes: { registration_number: 'ABC-123' } },
    ] as any

    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, vehicles, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )

    const statusHandler = handlers.get(`vehicle.status.org-1::.vehicle.status.changed`)!
    act(() => {
      statusHandler({ vehicle_id: '7', new_status: 'idle' })
    })
    expect(result.current.locations['7'].status).toBe('idle')

    const fuelHandler = handlers.get('fuel.alerts.org-1::.fuel_alert')!
    act(() => {
      fuelHandler({ vehicle_id: '7', type: 'fuel_theft' })
    })
    expect(result.current.alarmState['7']).toBe(true)
  })

  it('only a drain or a leak raises the alarm, not a low tank, a refill or a sensor fault', () => {
    const vehicles = [{ id: '7', attributes: { registration_number: 'ABC-123' } }] as any
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, vehicles, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    const fuelHandler = handlers.get('fuel.alerts.org-1::.fuel_alert')!

    for (const type of ['low_fuel', 'refill', 'sensor_malfunction']) {
      act(() => fuelHandler({ vehicle_id: '7', type }))
      expect(result.current.alarmState['7']).toBeFalsy()
    }
    act(() => fuelHandler({ vehicle_id: '7', type: 'fuel_leakage' }))
    expect(result.current.alarmState['7']).toBe(true)
  })

  it('the old .fuel.event is no longer listened to: nothing broadcasts it', () => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    renderHook(() => useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: null }), { wrapper: Wrapper })
    expect(handlers.has('fuel.alerts.org-1::.fuel.event')).toBe(false)
  })
})

describe('useVehicleLocations fleet seed', () => {
  const mapEntry = (attributes: Record<string, unknown>) => ({
    id: '7',
    attributes: { registration_number: 'ABC-123', location: { latitude: 6.5, longitude: 3.4 }, speed: 0, last_packet_received_at: new Date().toISOString(), ...attributes },
  }) as any

  it('takes connectivity from is_online, not from the device lifecycle status', () => {
    const { subscribePrivate } = makeSubscribePrivate()
    const offlineVehicles = [mapEntry({ device_status: 'active', is_online: false })]
    const offline = renderHook(
      () => useVehicleLocations({ ...baseProps, vehicles: offlineVehicles, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    expect(offline.result.current.locations['7'].is_online).toBe(false)
    expect(offline.result.current.locations['7'].status).toBe('offline')

    const onlineVehicles = [mapEntry({ device_status: 'inactive', is_online: true })]
    const online = renderHook(
      () => useVehicleLocations({ ...baseProps, vehicles: onlineVehicles, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    expect(online.result.current.locations['7'].is_online).toBe(true)
    expect(online.result.current.locations['7'].status).toBe('parked')
  })

  it('falls back to the lifecycle status only when the feed has no is_online', () => {
    const { subscribePrivate } = makeSubscribePrivate()
    const vehicles = [mapEntry({ device_status: 'active' })]
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, vehicles, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    expect(result.current.locations['7'].is_online).toBe(true)
  })

  it('keeps how the litres were obtained', () => {
    const { subscribePrivate } = makeSubscribePrivate()
    const vehicles = [mapEntry({ is_online: true, fuel: { level_liters: 24, level_percent: 40, liters_basis: 'calculated' } })]
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, vehicles, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    expect(result.current.locations['7']).toMatchObject({ fuel: 40, fuel_liters: 24, fuel_basis: 'calculated' })
  })
})

describe('useVehicleLocations lastUpdate/lastPacket timestamp', () => {
  it('uses the packet timestamp field (device time, ISO-8601 with offset) for both lastUpdate and lastPacket', () => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    const locationHandler = handlers.get('org.org-1.tracking::.vehicle.location.updated')!

    act(() => {
      locationHandler({
        vehicle_id: '42',
        lat: 6.5,
        lng: 3.4,
        speed: 10,
        status: 'in_transit',
        timestamp: '2026-07-03T12:00:00+00:00',
      })
    })

    expect(result.current.locations['42'].lastUpdate).toBe('2026-07-03T12:00:00+00:00')
    expect(result.current.locations['42'].lastPacket).toBe('2026-07-03T12:00:00+00:00')
  })

  it('defaults is_online to true when the packet omits it — a packet is by definition a live position', () => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    const locationHandler = handlers.get('org.org-1.tracking::.vehicle.location.updated')!

    act(() => {
      locationHandler({
        vehicle_id: '42',
        lat: 6.5,
        lng: 3.4,
        speed: 10,
        status: 'in_transit',
        timestamp: '2026-07-03T12:00:00+00:00',
      })
    })

    expect(result.current.locations['42'].is_online).toBe(true)
  })
})

// Hoisted so their identity is stable across renders: the fleet-seed effect keys
// off the `vehicles` array, and rebuilding it inline on every render would loop.
const SEEDED_FLEET = [
  {
    id: '42',
    attributes: {
      registration_number: 'ABC-123-XD',
      device_status: 'active',
      last_packet_received_at: '2026-07-03T13:05:00+01:00',
      speed: 0,
      location: { latitude: 6.5, longitude: 3.4 },
    },
  },
] as any

const SEEDED_FLEET_MOVING = [
  {
    id: '42',
    attributes: {
      device_status: 'active',
      last_packet_received_at: '2026-07-03T13:05:00+01:00',
      speed: 12,
      location: { latitude: 6.6, longitude: 3.5 },
    },
  },
] as any

describe('useVehicleLocations selection-triggered snapshot seed', () => {
  it('seeds satellites/battery/GSM fields from GET /vehicles/{id}?view=telemetry the instant a vehicle is selected, ahead of any WS packet', async () => {
    const { getVehicleById } = await import('@/lib/api/vehicles')
    vi.mocked(getVehicleById).mockResolvedValueOnce({
      message: 'ok',
      data: {
        id: '42',
        attributes: {
          satellites: 6,
          timestamp_utc: '2026-07-03T12:00:00Z',
          metadata: { battery_voltage: '4.15v', active_gsm_operator: 62179 },
        },
        relationships: {
          current_location: { latitude: 6.5, longitude: 3.4, speed: 0 },
        },
      },
    } as any)

    const { subscribePrivate } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: '42' }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.locations['42']?.satellites).toBe(6))
    expect(result.current.locations['42'].battery_voltage).toBe(4.15)
    expect(result.current.locations['42'].active_gsm_operator).toBe(62179)
  })

  it('lands the extended current_location telemetry even when the fleet seed already recorded a newer receipt time', async () => {
    const { getVehicleById } = await import('@/lib/api/vehicles')
    vi.mocked(getVehicleById).mockResolvedValueOnce({
      message: 'ok',
      data: {
        id: '42',
        attributes: { registration_number: 'ABC-123-XD', last_packet_received_at: '2026-07-03T13:05:00+01:00' },
        relationships: {
          current_location: {
            latitude: 6.5,
            longitude: 3.4,
            speed: 0,
            altitude: 42,
            satellites: 7,
            protocol_name: 'teltonika',
            // The GPS fix's own clock -- always behind the receipt time above,
            // which is what the fleet seed writes to lastUpdate.
            timestamp_utc: '2026-07-03T12:00:00+00:00',
            metadata: {
              engine_rpm: 850,
              battery_voltage: '4.15v',
              door_status: 'closed',
              active_gsm_operator: 62130,
              total_mileage: 128400,
            },
          },
        },
      },
    } as any)

    const { subscribePrivate } = makeSubscribePrivate()
    const { result } = renderHook(
      () =>
        useVehicleLocations({
          ...baseProps,
          vehicles: SEEDED_FLEET,
          subscribePrivate,
          selectedVehicleId: '42',
        }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.locations['42']?.engine_rpm).toBe(850))
    const entry = result.current.locations['42']
    expect(entry.satellites).toBe(7)
    expect(entry.battery_voltage).toBe(4.15)
    expect(entry.door_status).toBe('closed')
    expect(entry.active_gsm_operator).toBe(62130)
    expect(entry.total_mileage).toBe(128400)
    expect(entry.altitude).toBe(42)
    expect(entry.protocol_name).toBe('teltonika')
    // raw is the telemetry resolver's last-resort lookup -- it must be the rich
    // payload, not the two-field position the map feed seeds.
    expect(entry.raw.engine_rpm).toBe(850)
  })

  it('keeps the fleet seed\'s newer receipt time as lastUpdate rather than winding it back to the GPS clock', async () => {
    const { getVehicleById } = await import('@/lib/api/vehicles')
    vi.mocked(getVehicleById).mockResolvedValueOnce({
      message: 'ok',
      data: {
        id: '42',
        attributes: {},
        relationships: {
          current_location: {
            latitude: 6.5,
            longitude: 3.4,
            timestamp_utc: '2026-07-03T12:00:00+00:00',
            metadata: { engine_rpm: 850 },
          },
        },
      },
    } as any)

    const { subscribePrivate } = makeSubscribePrivate()
    const { result } = renderHook(
      () =>
        useVehicleLocations({
          ...baseProps,
          vehicles: SEEDED_FLEET_MOVING,
          subscribePrivate,
          selectedVehicleId: '42',
        }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.locations['42']?.engine_rpm).toBe(850))
    const entry = result.current.locations['42']
    expect(entry.lastUpdate).toBe('2026-07-03T13:05:00+01:00')
    // The fresher seed still owns every field it actually carries.
    expect(entry.speed).toBe(12)
    expect(entry.lat).toBe(6.6)
    expect(entry.lng).toBe(3.5)
  })

  it('never lets the one-off snapshot overwrite a newer WS packet that already arrived', async () => {
    const { getVehicleById } = await import('@/lib/api/vehicles')
    vi.mocked(getVehicleById).mockResolvedValueOnce({
      message: 'ok',
      data: {
        id: '42',
        attributes: { satellites: 2, timestamp_utc: '2026-07-03T11:00:00Z' },
        relationships: {
          current_location: { latitude: 6.5, longitude: 3.4, speed: 0 },
        },
      },
    } as any)

    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: '42' }),
      { wrapper: Wrapper },
    )

    const locationHandler = handlers.get('org.org-1.tracking::.vehicle.location.updated')!
    act(() => {
      locationHandler({
        vehicle_id: '42',
        lat: 6.51,
        lng: 3.41,
        speed: 40,
        satellites: 9,
        status: 'in_transit',
        timestamp: '2026-07-03T12:00:00+00:00',
      })
    })

    // Let the snapshot's (already in-flight) promise resolve and its effect run.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(result.current.locations['42'].satellites).toBe(9)
    expect(result.current.locations['42'].speed).toBe(40)
  })
})

describe('useVehicleLocations status fidelity', () => {
  const send = (packet: Record<string, unknown>) => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(
      () => useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: null }),
      { wrapper: Wrapper },
    )
    const locationHandler = handlers.get('org.org-1.tracking::.vehicle.location.updated')!
    act(() => {
      locationHandler({ vehicle_id: '42', lat: 6.5, lng: 3.4, timestamp: '2026-08-28T12:00:00+00:00', ...packet })
    })
    return result
  }

  // The packet carries ignition and movement, so an idling vehicle (engine
  // running, stationary) is distinguishable from a parked one. A speed-only
  // derivation reported every idling vehicle in the fleet as parked.
  it('reports an ignition-on, stationary vehicle as idle rather than parked', () => {
    const result = send({ speed: 0, ignition: 'on', movement: 'off', status: 'stopped', is_online: true })
    expect(result.current.locations['42'].status).toBe('idle')
  })

  it('reports an ignition-off, stationary vehicle as parked', () => {
    const result = send({ speed: 0, ignition: 'off', movement: 'off', status: 'active', is_online: true })
    expect(result.current.locations['42'].status).toBe('parked')
  })

  it('reports a moving vehicle as in_transit', () => {
    const result = send({ speed: 48, ignition: 'on', movement: 'on', status: 'in_transit', is_online: true })
    expect(result.current.locations['42'].status).toBe('in_transit')
  })

  it('honours an explicit is_online false instead of overriding it with true', () => {
    const result = send({ speed: 0, ignition: 'off', movement: 'off', is_online: false })
    expect(result.current.locations['42'].is_online).toBe(false)
    expect(result.current.locations['42'].status).toBe('offline')
  })
})
