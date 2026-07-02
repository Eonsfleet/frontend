import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MapZoomControl } from '@/app/(portal)/tracking/components/MapZoomControl'
import { MapLegend } from '@/app/(portal)/tracking/components/MapLegend'

describe('MapZoomControl', () => {
  it('calls window.leafletMap.zoomIn / zoomOut on click', () => {
    const zoomIn = vi.fn()
    const zoomOut = vi.fn()
    ;(window as any).leafletMap = { zoomIn, zoomOut }

    const { getByLabelText } = render(<MapZoomControl />)
    fireEvent.click(getByLabelText('Zoom in'))
    fireEvent.click(getByLabelText('Zoom out'))

    expect(zoomIn).toHaveBeenCalledTimes(1)
    expect(zoomOut).toHaveBeenCalledTimes(1)
  })
})

describe('MapLegend', () => {
  it('renders one entry per status, in canonical order, with correct labels', () => {
    const { getAllByTestId } = render(<MapLegend />)
    const entries = getAllByTestId('legend-entry')
    expect(entries.map((el) => el.textContent)).toEqual(['Moving', 'Parked', 'Idle', 'Offline', 'Alarm'])
  })
})
