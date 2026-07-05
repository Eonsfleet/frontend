import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackScrubber } from '@/app/(portal)/tracking/playback/components/PlaybackScrubber'

// jsdom has no ResizeObserver — the shadcn Slider (Radix) reads thumb size via
// @radix-ui/react-use-size, which needs one to mount at all.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = ResizeObserverStub

const movements = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 90, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 60, heading: 91, timestamp: '2024-01-01T08:05:00Z' },
]

describe('PlaybackScrubber', () => {
  it('calls onTogglePlaying when the play/pause button is clicked', () => {
    const onTogglePlaying = vi.fn()
    render(
      <PlaybackScrubber
        movements={movements}
        currentIndex={0}
        onIndexChange={vi.fn()}
        isPlaying={false}
        onTogglePlaying={onTogglePlaying}
        speed={1}
        onSpeedChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(onTogglePlaying).toHaveBeenCalled()
  })

  it('highlights the active speed button', () => {
    render(
      <PlaybackScrubber
        movements={movements}
        currentIndex={0}
        onIndexChange={vi.fn()}
        isPlaying={false}
        onTogglePlaying={vi.fn()}
        speed={4}
        onSpeedChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '4X' })).toHaveClass('bg-slate-900')
  })

  it('shows the current point speed and step forward moves the index ahead by 10', () => {
    const onIndexChange = vi.fn()
    render(
      <PlaybackScrubber
        movements={movements}
        currentIndex={0}
        onIndexChange={onIndexChange}
        isPlaying={false}
        onTogglePlaying={vi.fn()}
        speed={1}
        onSpeedChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/40 km\/h/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /step forward/i }))
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })
})
