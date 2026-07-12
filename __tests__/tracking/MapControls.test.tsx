import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MapZoomControl } from '@/app/(portal)/tracking/components/MapZoomControl'
import { MapLegend } from '@/app/(portal)/tracking/components/MapLegend'
import { MapInstanceProvider } from '@/app/(portal)/tracking/MapInstanceContext'
import { createFakeMapProvider } from '../helpers/fakeMapProvider'

describe('MapZoomControl', () => {
  it('calls provider.zoomIn / zoomOut on click', () => {
    const provider = createFakeMapProvider()

    const { getByLabelText } = render(
      <MapInstanceProvider value={{ provider, providerKind: provider.kind, isReady: true, isFallback: false }}>
        <MapZoomControl />
      </MapInstanceProvider>,
    )
    fireEvent.click(getByLabelText('Zoom in'))
    fireEvent.click(getByLabelText('Zoom out'))

    expect(provider.zoomIn).toHaveBeenCalledTimes(1)
    expect(provider.zoomOut).toHaveBeenCalledTimes(1)
  })
})

describe('MapLegend', () => {
  it('renders one entry per status, in canonical order, with correct labels', () => {
    const { getAllByTestId } = render(<MapLegend />)
    const entries = getAllByTestId('legend-entry')
    expect(entries.map((el) => el.textContent)).toEqual(['Moving', 'Parked', 'Idle', 'Offline', 'Alarm'])
  })
})
