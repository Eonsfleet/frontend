import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusFilters } from '@/app/(portal)/tracking/components/StatusFilters'

const vehicles = [
  { id: '1', attributes: { uuid: 'uuid-1' } },
  { id: '2', attributes: { uuid: 'uuid-2' } },
  { id: '3', attributes: { uuid: 'uuid-3' } },
] as any

const locations = {
  'uuid-1': { status: 'in_transit', is_online: true },
  'uuid-2': { status: 'idle', is_online: true },
  'uuid-3': { is_online: false },
}

describe('StatusFilters', () => {
  it('renders mockup-style "Label Count" tabs (no parentheses)', () => {
    render(
      <StatusFilters vehicles={vehicles} locations={locations} statusFilter="all" onStatusChange={vi.fn()} />,
    )
    expect(screen.getByText('All 3')).toBeInTheDocument()
    expect(screen.getByText('Moving 1')).toBeInTheDocument()
    expect(screen.getByText('Idle 1')).toBeInTheDocument()
    expect(screen.getByText('Offline 1')).toBeInTheDocument()
  })

  it('calls onStatusChange with the clicked filter key', () => {
    const onStatusChange = vi.fn()
    render(
      <StatusFilters vehicles={vehicles} locations={locations} statusFilter="all" onStatusChange={onStatusChange} />,
    )
    fireEvent.click(screen.getByText('Moving 1'))
    expect(onStatusChange).toHaveBeenCalledWith('moving')
  })

  it('keeps each status tab colored even when not the active filter', () => {
    render(
      <StatusFilters vehicles={vehicles} locations={locations} statusFilter="all" onStatusChange={vi.fn()} />,
    )
    // "moving" is not the active filter here ("all" is), but its tab should
    // still carry the moving status color, not a neutral grey.
    expect(screen.getByText('Moving 1').className).toMatch(/text-emerald-600/)
    expect(screen.getByText('Idle 1').className).toMatch(/text-amber-600/)
    expect(screen.getByText('Offline 1').className).toMatch(/text-blue-600/)
  })
})
