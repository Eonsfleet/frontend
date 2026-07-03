import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVehicleLocations } from '@/app/(portal)/tracking/hooks/useVehicleLocations'

vi.mock('@/store/packetStreamStore', () => ({
  usePacketStreamStore: {
    getState: () => ({ push: vi.fn() }),
  },
}))

function makeSubscribePrivate() {
  const handlers = new Map<string, (data: any) => void>()
  const subscribePrivate = vi.fn((channel: string, event: string, cb: (data: any) => void) => {
    handlers.set(`${channel}::${event}`, cb)
    return () => handlers.delete(`${channel}::${event}`)
  })
  return { subscribePrivate, handlers }
}

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
      { initialProps: { selectedVehicleId: '42' } },
    )

    const locationHandler = handlers.get('location.organization.org-1::.current.recent')!

    act(() => {
      locationHandler({ vehicle_id: '42', latitude: 6.5, longitude: 3.4, speed: 10, status: 'in_transit' })
    })
    act(() => {
      locationHandler({ vehicle_id: '99', latitude: 1.1, longitude: 2.2, speed: 10, status: 'in_transit' })
    })

    expect(result.current.trails['42']).toHaveLength(1)
    expect(result.current.trails['42'][0]).toMatchObject({ lat: 6.5, lng: 3.4 })
    expect(result.current.trails['99']).toBeUndefined()

    act(() => {
      locationHandler({ vehicle_id: '42', latitude: 6.51, longitude: 3.41, speed: 12, status: 'in_transit' })
    })
    expect(result.current.trails['42']).toHaveLength(2)

    // Changing selection clears the trail buffer
    rerender({ selectedVehicleId: '99' })
    expect(result.current.trails['42']).toBeUndefined()
  })
})

describe('useVehicleLocations lastUpdate/lastPacket timestamp priority', () => {
  it('prefers timestamp_utc (server ingestion time) over device-reported updated_at/gps_datetime', () => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(() =>
      useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: null }),
    )
    const locationHandler = handlers.get('location.organization.org-1::.current.recent')!

    act(() => {
      locationHandler({
        vehicle_id: '42',
        latitude: 6.5,
        longitude: 3.4,
        speed: 10,
        status: 'in_transit',
        // gps_datetime deliberately far in the past, simulating a GPS cold-start
        // clock artifact — timestamp_utc is the trustworthy, fresh value.
        gps_datetime: '2025-09-01T00:00:00Z',
        updated_at: '2025-09-01T00:00:00Z',
        timestamp_utc: '2026-07-03T12:00:00Z',
      })
    })

    expect(result.current.locations['42'].lastUpdate).toBe('2026-07-03T12:00:00Z')
  })

  it('falls back lastPacket to timestamp_utc when last_packet_received_at is absent from the live packet', () => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result } = renderHook(() =>
      useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: null }),
    )
    const locationHandler = handlers.get('location.organization.org-1::.current.recent')!

    act(() => {
      locationHandler({
        vehicle_id: '42',
        latitude: 6.5,
        longitude: 3.4,
        speed: 10,
        status: 'in_transit',
        timestamp_utc: '2026-07-03T12:00:00Z',
      })
    })

    expect(result.current.locations['42'].lastPacket).toBe('2026-07-03T12:00:00Z')
  })
})
