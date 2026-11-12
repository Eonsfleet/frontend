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

  it('shows litres for a tank reported in litres only, with no bar', () => {
    const loc = { status: 'parked', is_online: true, speed: 0, fuel: null, fuel_liters: 38.5, fuel_basis: 'device' }
    render(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('38.5 L')).toBeInTheDocument()
  })

  it('marks litres worked out from a percentage with ≈', () => {
    const loc = { status: 'parked', is_online: true, speed: 0, fuel: 40, fuel_liters: 24, fuel_basis: 'calculated' }
    render(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('≈ 24.0 L')).toBeInTheDocument()
  })

  it('shows nothing about fuel when there is no reading, not 0', () => {
    const loc = { status: 'parked', is_online: true, speed: 0 }
    render(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={vi.fn()} />)
    expect(screen.queryByText(/ L$/)).toBeNull()
    expect(screen.queryByText(/%$/)).toBeNull()
  })
})
