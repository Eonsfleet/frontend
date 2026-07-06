import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackAdvancedFilters } from '@/app/(portal)/tracking/playback/components/PlaybackAdvancedFilters'
import { DEFAULT_THRESHOLDS } from '@/lib/playback/derive'

const baseProps = {
  vehicleStatusFilters: { moving: true, parked: false, idle: true, offline: false },
  onVehicleStatusChange: vi.fn(),
  routes: [{ id: '1', label: 'Trip #1001' }],
  selectedRouteId: null,
  onRouteChange: vi.fn(),
  geofences: [{ id: '5', label: 'Ikeja Depot' }],
  selectedGeofenceId: null,
  onGeofenceChange: vi.fn(),
  radiusKm: 5,
  onRadiusChange: vi.fn(),
  eventFilters: { overspeed: true, harsh_braking: true, harsh_acceleration: false, geofence_enter: true, geofence_exit: true },
  onEventFilterChange: vi.fn(),
  thresholds: DEFAULT_THRESHOLDS,
  onThresholdsChange: vi.fn(),
  onApply: vi.fn(),
  onReset: vi.fn(),
}

describe('PlaybackAdvancedFilters', () => {
  it('toggles a vehicle status checkbox', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /^parked$/i }))
    expect(baseProps.onVehicleStatusChange).toHaveBeenCalledWith('parked', true)
  })

  it('toggles an event type checkbox', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /harsh acceleration/i }))
    expect(baseProps.onEventFilterChange).toHaveBeenCalledWith('harsh_acceleration', true)
  })

  it('updates max speed threshold', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.change(screen.getByLabelText(/max speed/i), { target: { value: '100' } })
    expect(baseProps.onThresholdsChange).toHaveBeenCalledWith({ ...DEFAULT_THRESHOLDS, maxSpeedThreshold: 100 })
  })

  it('calls onApply when Apply Filters is clicked', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }))
    expect(baseProps.onApply).toHaveBeenCalled()
  })

  it('disables the Device Filters section', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    expect(screen.getByTestId('device-filters-section')).toHaveAttribute('aria-disabled', 'true')
  })
})
