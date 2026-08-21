import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { TrackingTopBar } from '@/app/(portal)/tracking/components/TrackingTopBar'

const baseProps = {
  locationSearch: '',
  setLocationSearch: vi.fn(),
  onLocationSelect: vi.fn(),
  mapStyle: 'standard' as const,
  setMapStyle: vi.fn(),
  showTraffic: false,
  setShowTraffic: vi.fn(),
  showGeofences: false,
  setShowGeofences: vi.fn(),
}

describe('TrackingTopBar', () => {
  it('renders the search collapsed to an icon-only button by default', () => {
    render(<TrackingTopBar {...baseProps} />)
    expect(screen.getByLabelText('Search location')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search location / address')).toBeNull()
  })

  it('expands into the search input when the icon is clicked', () => {
    render(<TrackingTopBar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Search location'))
    expect(screen.getByPlaceholderText('Search location / address')).toBeInTheDocument()
  })

  it('collapses back to the icon on blur', () => {
    render(<TrackingTopBar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Search location'))
    const input = screen.getByPlaceholderText('Search location / address')
    expect(input).toBeInTheDocument()
    fireEvent.blur(input)
    expect(screen.queryByPlaceholderText('Search location / address')).toBeNull()
    expect(screen.getByLabelText('Search location')).toBeInTheDocument()
  })

  it('calls setShowGeofences when the layers toggle is clicked', () => {
    render(<TrackingTopBar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Toggle layers'))
    expect(baseProps.setShowGeofences).toHaveBeenCalledWith(true)
  })

  it('does not render view-mode, cluster-filter, refresh, or fullscreen controls (moved elsewhere)', () => {
    render(<TrackingTopBar {...baseProps} />)
    expect(screen.queryByLabelText('Toggle focus mode')).toBeNull()
    expect(screen.queryByLabelText('Filter by cluster')).toBeNull()
    expect(screen.queryByLabelText('Re-sync fleet data')).toBeNull()
    expect(screen.queryByLabelText('Fullscreen')).toBeNull()
  })

  it('renders the search box and the desktop controls as two separate floating pills', () => {
    const { container } = render(<TrackingTopBar {...baseProps} />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('justify-between')
    const searchButton = screen.getByLabelText('Search location')
    expect(searchButton.className).toContain('rounded-2xl')
    expect(searchButton.className).toContain('shadow-lg')
  })

  it('renders a persistent connection status indicator', () => {
    render(<TrackingTopBar {...baseProps} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
