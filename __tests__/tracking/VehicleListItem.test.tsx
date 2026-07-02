import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VehicleListItem } from '@/app/(portal)/tracking/components/VehicleListItem'

const vehicle = {
  id: '1',
  attributes: { registration_number: 'ABC-123-XD', make: 'Toyota', model: 'Hilux' },
} as any

describe('VehicleListItem', () => {
  it('renders plate, status label, and speed', () => {
    const loc = { status: 'in_transit', is_online: true, speed: 58, address: 'Ikeja, Lagos' }
    render(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
    expect(screen.getByText('Moving')).toBeInTheDocument()
    expect(screen.getByText(/58/)).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<VehicleListItem vehicle={vehicle} loc={null} isSelected={false} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('marks the row aria-pressed when selected', () => {
    render(<VehicleListItem vehicle={vehicle} loc={null} isSelected onSelect={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
