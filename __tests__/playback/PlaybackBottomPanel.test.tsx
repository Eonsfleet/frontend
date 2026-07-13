import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackBottomPanel } from '@/app/(portal)/tracking/playback/components/PlaybackBottomPanel'
import type { PlaybackEvent, PlaybackStop, PlaybackMovement } from '@/types'

const movements: PlaybackMovement[] = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 90, heading: 0, timestamp: '2024-01-01T08:05:00Z' },
]
const events: PlaybackEvent[] = [
  { type: 'overspeed', startIndex: 1, endIndex: 1, timestamp: '2024-01-01T08:05:00Z', lat: 6.51, lng: 3.41, peakSpeed: 90 },
]
const stops: PlaybackStop[] = [
  { startIndex: 0, endIndex: 0, startTimestamp: '2024-01-01T08:00:00Z', endTimestamp: '2024-01-01T08:06:00Z', durationMinutes: 6, lat: 6.5, lng: 3.4 },
]
const stats = { durationMinutes: 60, distanceKm: 20, avgSpeed: 40, maxSpeed: 90 }

describe('PlaybackBottomPanel', () => {
  it('renders the Timeline tab by default with start/event/end entries', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    expect(screen.getByText(/playback started/i)).toBeInTheDocument()
    expect(screen.getByText(/overspeed/i)).toBeInTheDocument()
  })

  it('switches to the Events tab and shows only events', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /events/i }))
    expect(screen.queryByText(/playback started/i)).not.toBeInTheDocument()
    expect(screen.getByText(/overspeed/i)).toBeInTheDocument()
  })

  it('switches to the Stops tab and shows stop duration', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^stops$/i }))
    expect(screen.getByText(/6 min/i)).toBeInTheDocument()
  })

  it('shows an empty state on the Altitude tab', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /altitude/i }))
    expect(screen.getByText(/altitude data isn't available/i)).toBeInTheDocument()
  })

  it('shows an empty state on the Fuel tab', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^fuel$/i }))
    expect(screen.getByText(/fuel data isn't available/i)).toBeInTheDocument()
  })

  it('shows the selected vehicle row on the Vehicles tab', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /vehicles/i }))
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })
})
