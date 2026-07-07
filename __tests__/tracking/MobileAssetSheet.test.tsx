import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileAssetSheet } from '@/app/(portal)/tracking/components/MobileAssetSheet'

const vehicles = [
  { id: '1', attributes: { registration_number: 'ABC-123-XD' } },
] as any

const baseProps = {
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
  isFilterActive: false,
  onOpenFilterDrawer: vi.fn(),
  viewType: 'list' as const,
  clusters: [],
}

describe('MobileAssetSheet', () => {
  it('opens the sheet and shows the restyled search input placeholder', () => {
    render(<MobileAssetSheet {...baseProps} />)
    fireEvent.click(screen.getByText(/Assets \(1\)/))
    expect(screen.getByPlaceholderText('Search vehicle')).toBeInTheDocument()
  })

  it('lists vehicles using the restyled row', () => {
    render(<MobileAssetSheet {...baseProps} />)
    fireEvent.click(screen.getByText(/Assets \(1\)/))
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })
})
