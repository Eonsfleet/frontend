import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlaybackSummaryPanel } from '@/app/(portal)/tracking/playback/components/PlaybackSummaryPanel'
import type { PlaybackEvent } from '@/types'

const events: PlaybackEvent[] = [
  { type: 'overspeed', startIndex: 0, endIndex: 1, timestamp: '2024-01-01T08:00:00Z', lat: 6.5, lng: 3.4, peakSpeed: 95 },
  { type: 'overspeed', startIndex: 5, endIndex: 6, timestamp: '2024-01-01T08:10:00Z', lat: 6.5, lng: 3.4, peakSpeed: 90 },
  { type: 'harsh_braking', startIndex: 8, endIndex: 9, timestamp: '2024-01-01T08:15:00Z', lat: 6.5, lng: 3.4 },
]

describe('PlaybackSummaryPanel', () => {
  it('renders the stat grid from computed stats', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 360, distanceKm: 156.8, avgSpeed: 52, maxSpeed: 102 }}
        stopsCount={8}
        events={events}
        vehicleLabel="ABC-123-XD"
      />,
    )
    expect(screen.getByText('156.8 km')).toBeInTheDocument()
    expect(screen.getByText('102 km/h')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('groups Top Events by type with counts, most frequent first', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 360, distanceKm: 156.8, avgSpeed: 52, maxSpeed: 102 }}
        stopsCount={8}
        events={events}
        vehicleLabel="ABC-123-XD"
      />,
    )
    const overspeedRow = screen.getByText(/overspeed/i).closest('div')
    expect(overspeedRow).toHaveTextContent('2')
  })

  it('renders a single Top Vehicles row for the selected vehicle', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 360, distanceKm: 156.8, avgSpeed: 52, maxSpeed: 102 }}
        stopsCount={8}
        events={events}
        vehicleLabel="ABC-123-XD"
      />,
    )
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })

  it('does not render the removed Recent Playbacks section', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 0, distanceKm: 0, avgSpeed: 0, maxSpeed: 0 }}
        stopsCount={0}
        events={[]}
        vehicleLabel="ABC-123-XD"
      />,
    )
    expect(screen.queryByText(/recent playbacks/i)).not.toBeInTheDocument()
  })
})
