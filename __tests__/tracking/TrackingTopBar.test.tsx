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
    const searchPill = screen.getByPlaceholderText('Search location / address').closest('div')
    expect(searchPill?.className).toContain('rounded-2xl')
    expect(searchPill?.className).toContain('shadow-lg')
  })

  it('renders a persistent connection status indicator', () => {
    render(<TrackingTopBar {...baseProps} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
