import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createFakeMapProvider } from '../helpers/fakeMapProvider'

// TrackingMap/PlaybackMap mount a real Mapbox/Leaflet instance via
// lib/map/MapProviderFactory — jsdom can't run either, so swap in the fake
// provider test double instead of exercising the real map engines here.
vi.mock('@/lib/map/MapProviderFactory', () => ({
  createMapProvider: vi.fn(async () => createFakeMapProvider()),
}))

// AssetPanel (rendered by page.tsx) calls useRouter() — no app router is mounted in
// this test env, so mock it the same way __tests__/tracking/AssetPanel.test.tsx does.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('@/lib/api/vehicles', () => ({
  getVehiclesMapPage: vi.fn().mockResolvedValue({
    data: [
      { id: '1', attributes: { registration_number: 'ABC-123-XD', model: 'Hilux' } },
    ],
    pagination: { current: 1, lastPage: 1, perPage: 1000, total: 1, next_page_url: null, prev_page_url: null, from: 1 },
  }),
  getVehicleById: vi.fn().mockResolvedValue({ data: null }),
}))
vi.mock('@/lib/api/trips', () => ({
  getTrips: vi.fn().mockResolvedValue({ data: { trips: [] } }),
  getActiveTripForVehicle: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/api/settings', () => ({ getClusters: vi.fn().mockResolvedValue({ data: { clusters: [] } }) }))
vi.mock('@/lib/api/geofencing', () => ({ getGeofences: vi.fn().mockResolvedValue({ data: { geofences: [] } }) }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ token: 'tok', organization: { id: 'org-1' } }) }))
vi.mock('@/store/uiStore', () => ({ useUIStore: () => ({ setSidebarCollapsed: vi.fn() }) }))
vi.mock('@/hooks/useEcho', () => ({ useEcho: () => ({ subscribePrivate: vi.fn() }) }))
vi.mock('@/hooks/useConnectionStatus', () => ({ useConnectionStatus: () => ({ status: 'connected' }) }))
// page.tsx consumes this store both as a whole-object call (AssetPanel) and with a
// selector (page.tsx reads isAssetListCollapsed via `(s) => s.isAssetListCollapsed`),
// so the mock must honor the selector argument — returning the whole object
// unconditionally would make a boolean selector resolve to a truthy object.
vi.mock('@/store/trackingUiStore', () => {
  const state = {
    setActiveTab: vi.fn(),
    activeTab: 'details',
    isAssetPanelCollapsed: false,
    toggleAssetPanel: vi.fn(),
    isAssetListCollapsed: false,
    toggleAssetList: vi.fn(),
    isMapFollowEnabled: true,
    setMapFollowEnabled: vi.fn(),
  }
  return {
    useTrackingUiStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  }
})
// UpgradeGate (pre-existing, unrelated to this task) blocks rendering unless the
// "geofence" capability is present — bypass it the same way __tests__/geofencing/
// flows.test.tsx does for the same gate, so the grid shell underneath is testable.
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    hasCapability: () => true,
  }),
}))

import TrackingPage from '@/app/(portal)/tracking/page'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('TrackingPage grid shell', () => {
  it('renders the top toolbar search icon (collapsed by default) and the asset list', async () => {
    render(<TrackingPage />, { wrapper: Wrapper })
    expect(screen.getByLabelText('Search location')).toBeInTheDocument()
    expect(await screen.findByText('ABC-123-XD')).toBeInTheDocument()
  })

  it('says so when the fleet list cannot be loaded, instead of an empty map', async () => {
    const { getVehiclesMapPage } = await import('@/lib/api/vehicles')
    vi.mocked(getVehiclesMapPage).mockRejectedValueOnce(new Error('network'))
    render(<TrackingPage />, { wrapper: Wrapper })
    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicles could not be loaded.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('does not render the removed floating SelectedVehicleBar quick-action pill', async () => {
    render(<TrackingPage />, { wrapper: Wrapper })
    await screen.findByText('ABC-123-XD')
    expect(screen.queryByText('Velocity')).toBeNull()
  })

  it('sets the detail panel to 400px and keeps the sidebar/detail panel full height (row-span-2) when a vehicle is selected', async () => {
    const { container } = render(<TrackingPage />, { wrapper: Wrapper })
    const row = await screen.findByRole('button', { name: /ABC-123-XD/ })
    fireEvent.click(row)

    const grid = container.querySelector('.grid') as HTMLElement
    expect(grid.className).toContain('lg:grid-cols-[320px_1fr_400px]')
    expect(container.querySelectorAll('.row-start-1.row-span-2')).toHaveLength(2)
  })

  it('navigates to the playback page with the selected vehicle when Playback is clicked', async () => {
    const push = vi.fn()
    ;(vi.mocked(await import('next/navigation')) as any).useRouter = () => ({ push })
    render(<TrackingPage />, { wrapper: Wrapper })
    const row = await screen.findByRole('button', { name: /ABC-123-XD/ })
    fireEvent.click(row)
    const [playbackButton] = await screen.findAllByRole('button', { name: /playback/i })
    fireEvent.click(playbackButton)
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/tracking\/playback\?vehicleId=1&start=.+&end=.+$/))
  })
})
