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

  it('keys .vehicle.status.changed and .fuel.event by vehicle_id too', () => {
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

    const fuelHandler = handlers.get('fuel.alerts.org-1::.fuel.event')!
    act(() => {
      fuelHandler({ vehicle_id: '7' })
    })
    expect(result.current.alarmState['7']).toBe(true)
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

  it('forces is_online true, since the new payload carries no is_online/device_status field to derive it from', () => {
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
