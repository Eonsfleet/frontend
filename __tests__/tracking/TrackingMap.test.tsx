import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    point: vi.fn((x: number, y: number) => ({ x, y })),
    Icon: { Default: { mergeOptions: vi.fn(), prototype: {} } },
  },
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: (props: any) => (
    <div data-testid="polyline" data-color={props.color} data-points={props.positions?.length ?? 0} />
  ),
  Polygon: () => <div data-testid="polygon" />,
  Circle: () => <div data-testid="circle" />,
  Tooltip: ({ children }: any) => <div data-testid="leaflet-tooltip">{children}</div>,
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}))

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: any) => <div data-testid="cluster-group">{children}</div>,
}))

vi.mock('@/app/(portal)/tracking/components/TrafficOverlay', () => ({
  TrafficOverlay: () => <div data-testid="traffic-overlay" />,
}))

import TrackingMap from '@/app/(portal)/tracking/TrackingMap'
import { MAP_LAYERS, getMarkerSVG, getVehicleIcon } from '@/app/(portal)/tracking/utils'

const baseProps = {
  filteredVehicles: [],
  locations: {},
  selectedVehicle: null,
  setSelectedVehicle: vi.fn(),
  vehicles: [],
  TILE_URL: MAP_LAYERS.standard,
  getMarkerSVG,
  getVehicleIcon,
}

describe('TrackingMap live route trail', () => {
  it('does not render a trail polyline when no vehicle is selected', () => {
    const { queryByTestId } = render(<TrackingMap {...baseProps} trail={[]} />)
    expect(queryByTestId('polyline')).toBeNull()
  })

  it('does not render a trail polyline with fewer than 2 points', () => {
    const selectedVehicle = { id: '42', attributes: { body_type: 'truck' } }
    const { queryByTestId } = render(
      <TrackingMap {...baseProps} selectedVehicle={selectedVehicle} trail={[{ lat: 6.5, lng: 3.4, timestamp: 1 }]} />,
    )
    expect(queryByTestId('polyline')).toBeNull()
  })

  it('renders a solid blue trail polyline for the selected vehicle with 2+ points', () => {
    const selectedVehicle = { id: '42', attributes: { body_type: 'truck' } }
    const trail = [
      { lat: 6.5, lng: 3.4, timestamp: 1 },
      { lat: 6.51, lng: 3.41, timestamp: 2 },
    ]
    const { getByTestId } = render(<TrackingMap {...baseProps} selectedVehicle={selectedVehicle} trail={trail} />)
    const polyline = getByTestId('polyline')
    expect(polyline.dataset.color).toBe('#2563eb')
    expect(polyline.dataset.points).toBe('2')
  })
})

describe('TrackingMap traffic overlay', () => {
  it('is hidden by default', () => {
    const { queryByTestId } = render(<TrackingMap {...baseProps} />)
    expect(queryByTestId('traffic-overlay')).toBeNull()
  })

  it('renders when showTraffic is true and not in replay mode', () => {
    const { getByTestId } = render(<TrackingMap {...baseProps} showTraffic />)
    expect(getByTestId('traffic-overlay')).toBeTruthy()
  })
})
