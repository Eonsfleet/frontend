import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/lib/api/tracking', () => ({
  getVehiclePlayback: vi.fn().mockResolvedValue({
    data: [
      { latitude: 6.5, longitude: 3.4, speed: 40, heading: 90, timestamp: '2024-01-01T08:01:00Z' },
      { latitude: 6.51, longitude: 3.41, speed: 45, heading: 91, timestamp: '2024-01-01T08:00:00Z' },
    ],
  }),
  getTripPlayback: vi.fn().mockResolvedValue({
    data: { gps_points: [{ lat: 6.5, lng: 3.4, speed: 30, heading: 0, timestamp: '2024-01-01T09:00:00Z' }] },
  }),
}))

import { usePlaybackMovements } from '@/app/(portal)/tracking/playback/hooks/usePlaybackMovements'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children)

describe('usePlaybackMovements', () => {
  it('fetches vehicle history and normalizes + sorts points chronologically when no tripId is given', async () => {
    const { result } = renderHook(
      () => usePlaybackMovements({ vehicleId: '1', tripId: null, startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T09:00:00Z' }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.movements).toHaveLength(2)
    expect(result.current.movements[0].timestamp).toBe('2024-01-01T08:00:00Z')
    expect(result.current.movements[0].lat).toBe(6.51)
  })

  it('fetches trip playback gps_points when a tripId is given', async () => {
    const { result } = renderHook(
      () => usePlaybackMovements({ vehicleId: '1', tripId: '99', startTime: null, endTime: null }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.movements).toHaveLength(1)
    expect(result.current.movements[0].speed).toBe(30)
  })
})
