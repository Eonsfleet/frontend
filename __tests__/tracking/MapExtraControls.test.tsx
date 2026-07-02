import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { MapExtraControls } from '@/app/(portal)/tracking/components/MapExtraControls'

describe('MapExtraControls', () => {
  it('calls onRecenter when the recenter button is clicked', () => {
    const onRecenter = vi.fn()
    render(<MapExtraControls isFullscreen={false} onToggleFullscreen={vi.fn()} onRecenter={onRecenter} />)
    fireEvent.click(screen.getByLabelText('Recenter map'))
    expect(onRecenter).toHaveBeenCalled()
  })

  it('calls onToggleFullscreen when the fullscreen button is clicked', () => {
    const onToggleFullscreen = vi.fn()
    render(<MapExtraControls isFullscreen={false} onToggleFullscreen={onToggleFullscreen} onRecenter={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Fullscreen'))
    expect(onToggleFullscreen).toHaveBeenCalled()
  })

  it('shows the exit-fullscreen label when isFullscreen is true', () => {
    render(<MapExtraControls isFullscreen onToggleFullscreen={vi.fn()} onRecenter={vi.fn()} />)
    expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument()
  })
})
