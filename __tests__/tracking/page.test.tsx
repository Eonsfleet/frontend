import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})), point: vi.fn((x: number, y: number) => ({ x, y })) },
}))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  Polyline: () => null,
  Polygon: () => null,
  Circle: () => null,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}))
vi.mock('react-leaflet-cluster', () => ({ default: ({ children }: any) => <div>{children}</div> }))

// AssetPanel (rendered by page.tsx) calls useRouter() — no app router is mounted in
// this test env, so mock it the same way __tests__/tracking/AssetPanel.test.tsx does.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('@/lib/api/vehicles', () => ({
  getVehiclesBatched: vi.fn().mockResolvedValue([
    { id: '1', attributes: { registration_number: 'ABC-123-XD', make: 'Toyota', model: 'Hilux' }, relationships: {} },
  ]),
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
  it('renders the top toolbar search input and the asset list', async () => {
    render(<TrackingPage />, { wrapper: Wrapper })
    expect(screen.getByPlaceholderText('Search location / address')).toBeInTheDocument()
    expect(await screen.findByText('ABC-123-XD')).toBeInTheDocument()
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
})
