import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const echo = vi.hoisted(() => {
  const channels: string[] = []
  const left: string[] = []
  const channel = { listen: vi.fn().mockReturnThis() }
  return {
    channels,
    left,
    instance: {
      private: (name: string) => {
        channels.push(name)
        return channel
      },
      leave: (name: string) => {
        left.push(name)
      },
    },
  }
})

vi.mock('@/lib/echo', () => ({ getEcho: () => echo.instance }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ organization: { id: 'org-1', attributes: { identifier: 'org-1' } } }) }))
vi.mock('@/store/packetStreamStore', () => ({ usePacketStreamStore: { getState: () => ({ push: vi.fn() }) } }))

import { useVehicleTelemetry } from '@/hooks/useVehicleTelemetry'

describe('useVehicleTelemetry', () => {
  beforeEach(() => {
    echo.channels.length = 0
    echo.left.length = 0
  })

  it('opens only the channels the backend sends on: the device status and the fuel level', () => {
    renderHook(() => useVehicleTelemetry('7', 'dev-1'))

    expect(echo.channels.sort()).toEqual(['devicestatus.org-1.dev-1', 'fuel.vehicle.7'])
    // location.vehicle.{id} and location.{imei} are never dispatched to: no authorization request for them.
    expect(echo.channels.some((c) => c.startsWith('location.'))).toBe(false)
  })

  it('leaves what it opened when the vehicle changes or the panel closes', () => {
    const { unmount } = renderHook(() => useVehicleTelemetry('7', 'dev-1'))
    unmount()

    expect(echo.left.sort()).toEqual(['devicestatus.org-1.dev-1', 'fuel.vehicle.7'])
  })

  it('opens nothing without a vehicle', () => {
    renderHook(() => useVehicleTelemetry(null, 'dev-1'))
    expect(echo.channels).toEqual([])
  })
})
