import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createFakeMapProvider } from '../helpers/fakeMapProvider'

vi.mock('@/lib/map/MapProviderFactory', () => ({
  createMapProvider: vi.fn(async () => createFakeMapProvider()),
}))

import { PlaybackMap } from '@/app/(portal)/tracking/playback/components/PlaybackMap'

const movements = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 50, heading: 0, timestamp: '2024-01-01T08:05:00Z' },
]
const speedSegments = [{ positions: [[6.5, 3.4], [6.51, 3.41]] as [number, number][], bucket: '40-60' as const, color: '#eab308' }]

describe('PlaybackMap', () => {
  it('renders one route legend swatch per speed bucket', () => {
    render(
      <PlaybackMap
        movements={movements}
        speedSegments={speedSegments}
        stops={[]}
        currentIndex={0}
        mapStyle="standard"
        onToggleMapStyle={vi.fn()}
        isFullscreen={false}
        onToggleFullscreen={vi.fn()}
      />,
    )
    expect(screen.getAllByTestId('speed-legend-swatch')).toHaveLength(5)
  })

  it('calls onToggleMapStyle when the Satellite toggle is clicked', () => {
    render(
      <PlaybackMap
        movements={movements}
        speedSegments={speedSegments}
        stops={[]}
        currentIndex={0}
        mapStyle="standard"
        onToggleMapStyle={vi.fn()}
        isFullscreen={false}
        onToggleFullscreen={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /satellite/i }))
  })

  it('disables the Traffic toggle since no traffic layer provider is configured', () => {
    render(
      <PlaybackMap
        movements={movements}
        speedSegments={speedSegments}
        stops={[]}
        currentIndex={0}
        mapStyle="standard"
        onToggleMapStyle={vi.fn()}
        isFullscreen={false}
        onToggleFullscreen={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /traffic/i })).toBeDisabled()
  })
})
