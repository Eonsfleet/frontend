import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlaybackSummaryPanel } from '@/app/(portal)/tracking/playback/components/PlaybackSummaryPanel'
import type { PlaybackEvent, PlaybackMovement } from '@/types'

const t = (min: number) => new Date(Date.UTC(2024, 0, 1, 8, min)).toISOString()
const pt = (min: number, speed: number, extra: Partial<PlaybackMovement> = {}): PlaybackMovement => ({
  id: min, vehicle_id: 'v', lat: 6.5, lng: 3.4, speed, heading: 0, timestamp: t(min), ...extra,
})
const movements = [pt(0, 40), pt(10, 0, { ignition: true }), pt(20, 30, { fuel_level_liters: 40 })]
const stats = { durationMinutes: 20, distanceKm: 156.8, avgSpeed: 52, maxSpeed: 102 }
const events: PlaybackEvent[] = [
  { type: 'overspeed', startIndex: 0, endIndex: 1, timestamp: t(0), lat: 6.5, lng: 3.4, peakSpeed: 95 },
  { type: 'harsh_braking', startIndex: 1, endIndex: 2, timestamp: t(10), lat: 6.5, lng: 3.4 },
]

describe('PlaybackSummaryPanel', () => {
  it('shows headline stats and the time breakdown', () => {
    render(<PlaybackSummaryPanel stats={stats} stops={[]} events={events} movements={movements} />)
    expect(screen.getByText('156.8 km')).toBeInTheDocument()
    expect(screen.getByText('102 km/h')).toBeInTheDocument()
    expect(screen.getByText('Where the time went')).toBeInTheDocument()
    expect(screen.getAllByText('10m').length).toBeGreaterThan(0)
  })

  it('summarises behaviour events', () => {
    render(<PlaybackSummaryPanel stats={stats} stops={[]} events={events} movements={movements} />)
    expect(screen.getByText('Harsh braking').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Harsh acceleration').nextSibling).toHaveTextContent('None')
  })

  it('renders without data', () => {
    render(<PlaybackSummaryPanel stats={{ durationMinutes: 0, distanceKm: 0, avgSpeed: 0, maxSpeed: 0 }} stops={[]} events={[]} movements={[]} />)
    expect(screen.queryByText('Where the time went')).not.toBeInTheDocument()
  })
})
