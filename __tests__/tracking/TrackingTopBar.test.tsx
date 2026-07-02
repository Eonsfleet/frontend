import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { TrackingTopBar } from '@/app/(portal)/tracking/components/TrackingTopBar'

const baseProps = {
  locationSearch: '',
  setLocationSearch: vi.fn(),
  onLocationSearchSubmit: vi.fn(),
  mapStyle: 'standard' as const,
  setMapStyle: vi.fn(),
  showTraffic: false,
  setShowTraffic: vi.fn(),
  showGeofences: false,
  setShowGeofences: vi.fn(),
  viewMode: 'all' as const,
  setViewMode: vi.fn(),
  selectedClusterIds: [],
  onOpenClusterModal: vi.fn(),
  onRefresh: vi.fn(),
  isFullscreen: false,
  onToggleFullscreen: vi.fn(),
}

describe('TrackingTopBar', () => {
  it('renders the location search input with the mockup placeholder', () => {
    render(<TrackingTopBar {...baseProps} />)
    expect(screen.getByPlaceholderText('Search location / address')).toBeInTheDocument()
  })

  it('calls setLocationSearch as the user types and submits on Enter', () => {
    render(<TrackingTopBar {...baseProps} />)
    const input = screen.getByPlaceholderText('Search location / address')
    fireEvent.change(input, { target: { value: 'Ikeja' } })
    expect(baseProps.setLocationSearch).toHaveBeenCalledWith('Ikeja')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(baseProps.onLocationSearchSubmit).toHaveBeenCalled()
  })

  it('calls onRefresh when the refresh button is clicked', () => {
    render(<TrackingTopBar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Re-sync fleet data'))
    expect(baseProps.onRefresh).toHaveBeenCalled()
  })

  it('calls onToggleFullscreen when the fullscreen button is clicked', () => {
    render(<TrackingTopBar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Fullscreen'))
    expect(baseProps.onToggleFullscreen).toHaveBeenCalled()
  })
})
