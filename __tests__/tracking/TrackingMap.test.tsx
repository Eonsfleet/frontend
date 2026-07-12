import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createFakeMapProvider } from '../helpers/fakeMapProvider'
import { MapInstanceProvider } from '@/app/(portal)/tracking/MapInstanceContext'
import type { MapProvider } from '@/lib/map/types'

vi.mock('@/app/(portal)/tracking/components/TrafficOverlay', () => ({
  TrafficOverlay: () => <div data-testid="traffic-overlay" />,
}))

import TrackingMap from '@/app/(portal)/tracking/TrackingMap'
import { getVehicleIcon } from '@/app/(portal)/tracking/utils'

const baseProps = {
  containerRef: { current: null } as React.RefObject<HTMLDivElement | null>,
  filteredVehicles: [],
  locations: {},
  selectedVehicle: null,
  setSelectedVehicle: vi.fn(),
  getVehicleIcon,
}

/** Renders TrackingMap as if mounted under an already-ready MapInstanceContext. */
function renderMap(ui: React.ReactElement, provider: MapProvider = createFakeMapProvider()) {
  return {
    provider,
    ...render(
      <MapInstanceProvider value={{ provider, providerKind: provider.kind, isReady: true, isFallback: false }}>
        {ui}
      </MapInstanceProvider>,
    ),
  }
}

describe('TrackingMap live route trail', () => {
  it('does not render a trail polyline when no vehicle is selected', () => {
    const { provider } = renderMap(<TrackingMap {...baseProps} trail={[]} />)
    expect(provider.setPolyline).not.toHaveBeenCalledWith('trail', expect.anything(), expect.anything())
  })

  it('does not render a trail polyline with fewer than 2 points', () => {
    const selectedVehicle = { id: '42', attributes: { uuid: '42', body_type: 'truck' } }
    const { provider } = renderMap(
      <TrackingMap {...baseProps} selectedVehicle={selectedVehicle} trail={[{ lat: 6.5, lng: 3.4, timestamp: 1 }]} />,
    )
    expect(provider.setPolyline).not.toHaveBeenCalledWith('trail', expect.anything(), expect.anything())
  })

  it('renders a solid blue trail polyline for the selected vehicle with 2+ points', () => {
    const selectedVehicle = { id: '42', attributes: { uuid: '42', body_type: 'truck' } }
    const trail = [
      { lat: 6.5, lng: 3.4, timestamp: 1 },
      { lat: 6.51, lng: 3.41, timestamp: 2 },
    ]
    const { provider } = renderMap(<TrackingMap {...baseProps} selectedVehicle={selectedVehicle} trail={trail} />)

    expect(provider.setPolyline).toHaveBeenCalledWith(
      'trail',
      expect.any(Array),
      expect.objectContaining({ color: '#2563eb' }),
    )
    const [, points] = (provider.setPolyline as any).mock.calls.find((call: any[]) => call[0] === 'trail')
    expect(points).toHaveLength(2)
  })
})

describe('TrackingMap traffic overlay', () => {
  it('is hidden by default', () => {
    const { queryByTestId } = renderMap(<TrackingMap {...baseProps} />)
    expect(queryByTestId('traffic-overlay')).toBeNull()
  })

  it('renders when showTraffic is true and not in replay mode', () => {
    const { getByTestId } = renderMap(<TrackingMap {...baseProps} showTraffic />)
    expect(getByTestId('traffic-overlay')).toBeTruthy()
  })
})
