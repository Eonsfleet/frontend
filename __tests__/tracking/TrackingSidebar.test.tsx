import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrackingSidebar } from '@/app/(portal)/tracking/components/TrackingSidebar'

const toggleAssetList = vi.fn()
vi.mock('@/store/trackingUiStore', () => ({
  useTrackingUiStore: () => ({ isAssetListCollapsed: false, toggleAssetList }),
}))

const vehicles = [
  { id: '1', attributes: { registration_number: 'ABC-123-XD' } },
] as any

const baseProps = {
  viewMode: 'all' as const,
  vehicles,
  filteredVehicles: vehicles,
  locations: { '1': { status: 'in_transit', is_online: true, speed: 58 } },
  alarmState: {},
  selectedVehicleId: null,
  setSelectedVehicleId: vi.fn(),
  isLoadingVehicles: false,
  statusFilter: 'all' as const,
  setStatusFilter: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  ongoingTripsCount: 0,
  ongoingTripsData: [],
  onReplayVehicle: vi.fn(),
  isLoadingTrips: false,
  selectedClusterIds: [],
  onOpenClusterModal: vi.fn(),
  onRefresh: vi.fn(),
  isFilterActive: false,
  onOpenFilterDrawer: vi.fn(),
  viewType: 'listing' as const,
  clusters: [],
}

describe('TrackingSidebar', () => {
  it('renders the docked panel as a static block filling its container (no fixed/absolute positioning)', () => {
    const { container } = render(<TrackingSidebar {...baseProps} />)
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toMatch(/\babsolute\b/)
    expect(root.className).toMatch(/\bh-full\b/)
    expect(root.className).toMatch(/\bw-full\b/)
  })

  it('renders the asset count badge and vehicle rows', () => {
    render(<TrackingSidebar {...baseProps} />)
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })

  it('renders filter, refresh, and collapse controls inline with the Assets header', () => {
    render(<TrackingSidebar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Filter by cluster'))
    expect(baseProps.onOpenClusterModal).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Re-sync fleet data'))
    expect(baseProps.onRefresh).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Collapse asset list'))
    expect(toggleAssetList).toHaveBeenCalled()
  })
})
