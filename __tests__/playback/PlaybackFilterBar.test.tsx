import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackFilterBar } from '@/app/(portal)/tracking/playback/components/PlaybackFilterBar'

const baseProps = {
  vehicles: [{ id: '1', label: 'ABC-123-XD' }],
  selectedVehicleId: '1',
  onVehicleChange: vi.fn(),
  clusters: [{ id: '9', label: 'Lagos Fleet' }],
  selectedClusterId: null,
  onClusterChange: vi.fn(),
  drivers: [{ id: '5', label: 'John Doe' }],
  selectedDriverId: null,
  onDriverChange: vi.fn(),
  startTime: '2024-01-01T08:00',
  endTime: '2024-01-01T14:00',
  onStartTimeChange: vi.fn(),
  onEndTimeChange: vi.fn(),
  isRangeReadOnly: false,
  activeFilterCount: 2,
  isAdvancedOpen: false,
  onToggleAdvanced: vi.fn(),
  activeChips: [{ key: 'moving', label: 'Moving' }],
  onRemoveChip: vi.fn(),
  onClearAllChips: vi.fn(),
}

describe('PlaybackFilterBar', () => {
  it('shows the active filter count badge on the More Filters button', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    expect(screen.getByRole('button', { name: /more filters/i })).toHaveTextContent('2')
  })

  it('calls onToggleAdvanced when More Filters is clicked', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /more filters/i }))
    expect(baseProps.onToggleAdvanced).toHaveBeenCalled()
  })

  it('renders active filter chips and calls onRemoveChip when a chip is dismissed', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /remove moving filter/i }))
    expect(baseProps.onRemoveChip).toHaveBeenCalledWith('moving')
  })

  it('disables the Location select since no locations endpoint exists', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    expect(screen.getByRole('combobox', { name: /location/i })).toBeDisabled()
  })

  it('calls onStartTimeChange when the start datetime input changes', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    fireEvent.change(screen.getByLabelText(/date & time \(start\)/i), { target: { value: '2024-01-02T09:00' } })
    expect(baseProps.onStartTimeChange).toHaveBeenCalledWith('2024-01-02T09:00')
  })
})
