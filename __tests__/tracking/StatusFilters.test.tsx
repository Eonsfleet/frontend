import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusFilters } from '@/app/(portal)/tracking/components/StatusFilters'

const vehicles = [
  { id: '1', attributes: {} },
  { id: '2', attributes: {} },
  { id: '3', attributes: {} },
] as any

const locations = {
  '1': { status: 'in_transit', is_online: true },
  '2': { status: 'idle', is_online: true },
  '3': { is_online: false },
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
})
