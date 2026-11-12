import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FuelTab } from '@/app/(portal)/tracking/playback/components/tabs/FuelTab'

const point = (id: number, extra: Record<string, unknown>) => ({
  id, vehicle_id: '1', lat: 6.5, lng: 3.4, speed: 0, heading: 0, timestamp: `2026-11-12T10:0${id}:00Z`, ...extra,
}) as any

describe('playback fuel tab', () => {
  it('shows litres for a tank reported in litres only', () => {
    render(<FuelTab movements={[point(1, { fuel_level_liters: 52.4 }), point(2, { fuel_level_liters: 52.1 }), point(3, { fuel_level_liters: 40.2 })]} />)
    expect(screen.getByText('Remaining: 52 L')).toBeInTheDocument()
    expect(screen.getByText('Remaining: 40 L')).toBeInTheDocument()
  })

  it('shows a percentage for a percent tank, and says nothing is available when there is no level', () => {
    const { rerender } = render(<FuelTab movements={[point(1, { fuel_level_percent: 80 }), point(2, { fuel_level_percent: 70 })]} />)
    expect(screen.getByText('Remaining: 80%')).toBeInTheDocument()
    rerender(<FuelTab movements={[point(1, {})]} />)
    expect(screen.getByText("Fuel data isn't available for this device yet.")).toBeInTheDocument()
  })

  it('gives each reading its own entry key even though ids come from the server', () => {
    render(<FuelTab movements={[point(1, { fuel_level_liters: 50 }), point(2, { fuel_level_liters: 49 })]} />)
    expect(screen.getAllByText('Fuel level')).toHaveLength(2)
  })
})
