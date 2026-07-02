import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssetPanel } from '@/app/(portal)/tracking/components/AssetPanel'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/trackingUiStore', () => ({
  useTrackingUiStore: () => ({
    activeTab: 'details',
    setActiveTab: vi.fn(),
    isAssetPanelCollapsed: false,
    toggleAssetPanel: vi.fn(),
  }),
}))
vi.mock('@/lib/api/drivers', () => ({ getDriverById: vi.fn().mockResolvedValue({ data: { attributes: {} } }) }))
vi.mock('@/lib/api/trips', () => ({ getActiveTripForVehicle: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/api/tracking', () => ({ getDeviceStatus: vi.fn().mockResolvedValue(null) }))
vi.mock('@/hooks/useResolvedVehicleTelemetry', () => ({
  useResolvedVehicleTelemetry: () => ({ fuel: null, batteryV: null, satellites: null, engineHours: null, address: '' }),
}))

const vehicle = {
  id: '1',
  attributes: { make: 'Toyota', model: 'Hilux', registration_number: 'ABC-123-XD', image: null },
  relationships: {},
} as any

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('AssetPanel', () => {
  it('is a static, full-size block at desktop widths (no fixed positioning class outside the mobile breakpoint)', () => {
    const { container } = render(
      <AssetPanel
        isOpen
        onClose={vi.fn()}
        selectedVehicle={vehicle}
        locations={{}}
        vehicles={[vehicle]}
        onLiveTrack={vi.fn()}
        onPlayback={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/lg:static/)
    expect(root.className).toMatch(/lg:h-full/)
    expect(root.className).toMatch(/lg:w-full/)
  })

  it('renders a fallback truck icon when the vehicle has no photo', () => {
    render(
      <AssetPanel
        isOpen
        onClose={vi.fn()}
        selectedVehicle={vehicle}
        locations={{}}
        vehicles={[vehicle]}
        onLiveTrack={vi.fn()}
        onPlayback={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByTestId('asset-panel-photo-fallback')).toBeInTheDocument()
  })

  it('renders the vehicle photo when vehicle.attributes.image is set', () => {
    const vehicleWithPhoto = { ...vehicle, attributes: { ...vehicle.attributes, image: '/photo.jpg' } }
    render(
      <AssetPanel
        isOpen
        onClose={vi.fn()}
        selectedVehicle={vehicleWithPhoto}
        locations={{}}
        vehicles={[vehicleWithPhoto]}
        onLiveTrack={vi.fn()}
        onPlayback={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByAltText('Toyota Hilux')).toHaveAttribute('src', '/photo.jpg')
  })
})
