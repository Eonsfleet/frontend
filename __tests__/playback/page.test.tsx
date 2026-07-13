import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createFakeMapProvider } from '../helpers/fakeMapProvider'

// jsdom has no ResizeObserver — the shadcn Slider (Radix) used by PlaybackScrubber
// needs one to mount at all.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = ResizeObserverStub

// PlaybackMap mounts a real Mapbox/Leaflet instance via lib/map/MapProviderFactory —
// jsdom can't run either, so swap in the fake provider test double.
vi.mock('@/lib/map/MapProviderFactory', () => ({
  createMapProvider: vi.fn(async () => createFakeMapProvider()),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams('vehicleId=1&start=2024-01-01T08:00:00.000Z&end=2024-01-01T14:00:00.000Z'),
}))

vi.mock('@/lib/api/vehicles', () => ({
  getVehicles: vi.fn().mockResolvedValue({ data: [{ id: '1', attributes: { registration_number: 'ABC-123-XD' }, relationships: {} }] }),
}))
vi.mock('@/lib/api/settings', () => ({ getClusters: vi.fn().mockResolvedValue({ data: { clusters: [] } }) }))
vi.mock('@/lib/api/drivers', () => ({ getDrivers: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('@/lib/api/geofencing', () => ({ getGeofences: vi.fn().mockResolvedValue({ data: { geofences: [] } }) }))
vi.mock('@/lib/api/trips', () => ({ getTripRoutes: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('@/lib/api/tracking', () => ({
  getVehiclePlayback: vi.fn().mockResolvedValue({
    data: [{ latitude: 6.5, longitude: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' }],
  }),
  getTripPlayback: vi.fn().mockResolvedValue({ data: { gps_points: [] } }),
}))
vi.mock('@/store/uiStore', () => ({ useUIStore: () => ({ setSidebarCollapsed: vi.fn() }) }))

import PlaybackPage from '@/app/(portal)/tracking/playback/page'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)

describe('PlaybackPage', () => {
  it('pre-selects the vehicle from the vehicleId search param and renders its plate in the filter bar', async () => {
    render(<PlaybackPage />, { wrapper: Wrapper })
    expect((await screen.findAllByText('ABC-123-XD')).length).toBeGreaterThan(0)
  })

  it('renders the summary panel by default and swaps to advanced filters when More Filters is clicked', async () => {
    render(<PlaybackPage />, { wrapper: Wrapper })
    await screen.findAllByText('ABC-123-XD')
    expect(screen.getByText(/top events/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /more filters/i }))
    expect(await screen.findByText(/vehicle status/i)).toBeInTheDocument()
  })

  it('renders the bottom tab panel', async () => {
    render(<PlaybackPage />, { wrapper: Wrapper })
    await screen.findAllByText('ABC-123-XD')
    expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument()
  })
})
