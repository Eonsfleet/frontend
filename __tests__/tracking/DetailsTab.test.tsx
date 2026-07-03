import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DetailsTab } from '@/app/(portal)/tracking/components/tabs/DetailsTab'
import type { ResolvedVehicleTelemetry } from '@/lib/resolveVehicleTelemetry'

const baseResolved = {
  address: null, speed: 0, heading: 0, ignition: false, movement: null, status: null,
  lat: undefined, lng: undefined, altitude: null, satellites: null, odometer: null,
  engineHours: null, lastUpdate: null, rpm: null, rpmObd: null, oilLevel: null,
  fuelRate: null, fuelConsumed: null, fuelUsedGps: null, fuelLevelObd: null, fuelSource: null,
  ecoScore: null, idling: false, jamming: false, immobilizer: false, unplug: undefined,
  sleepMode: undefined, doorStatus: null, loadWeight: null, drivingState: null,
  batteryV: null, extV: null, batteryCurrent: null, engineTemp: 0, rssi: null, hdop: null,
  mileage: null, tripOdo: null, odoSource: null, protocol: null, confidence: null,
  fuel: null, fuelLiters: null, fuelTankCap: null, fuelQuality: null, fuelLastUpdate: null,
  deviceHasFuel: null, isDeviceOnline: true, fuelColor: '', ecoColor: '', ecoRingColor: '',
  batteryWarn: false, tempWarn: false, weakGps: false, health: {},
} as unknown as ResolvedVehicleTelemetry

describe('DetailsTab', () => {
  it('does not render driver name or phone (moved out of this tab)', () => {
    render(<DetailsTab resolved={baseResolved} todayKm={null} />)
    expect(screen.queryByText('Driver')).not.toBeInTheDocument()
    expect(screen.queryByText('Phone')).not.toBeInTheDocument()
  })

  it('shows "No active alerts" when all flags are inactive', () => {
    render(<DetailsTab resolved={baseResolved} todayKm={null} />)
    expect(screen.getByText('No active alerts')).toBeInTheDocument()
  })

  it('renders active alert chips', () => {
    render(<DetailsTab resolved={{ ...baseResolved, jamming: true, idling: true }} todayKm={null} />)
    expect(screen.getByText('Jamming Detected')).toBeInTheDocument()
    expect(screen.getByText('Idling')).toBeInTheDocument()
    expect(screen.queryByText('No active alerts')).not.toBeInTheDocument()
  })

  it('renders merged diagnostics fields with correct units', () => {
    render(
      <DetailsTab
        resolved={{
          ...baseResolved,
          rpm: 1800,
          odometer: 45210,
          fuelRate: 3.2,
          extV: 12.6,
          ecoScore: 82,
          protocol: 'Teltonika Codec8',
          engineHours: 120,
        }}
        todayKm={42}
      />,
    )
    expect(screen.getByText('1800 rpm')).toBeInTheDocument()
    expect(screen.getByText('45210 km')).toBeInTheDocument()
    expect(screen.getByText('3.2 L/h')).toBeInTheDocument()
    expect(screen.getByText('12.600V')).toBeInTheDocument()
    expect(screen.getByText('82/100')).toBeInTheDocument()
    expect(screen.getByText('Teltonika Codec8')).toBeInTheDocument()
    expect(screen.getByText('120 hrs')).toBeInTheDocument()
    expect(screen.getByText('42 km')).toBeInTheDocument()
  })

  it('does not render a current-address or battery-voltage row (owned by the bottom cards)', () => {
    render(<DetailsTab resolved={{ ...baseResolved, address: 'Ikeja, Lagos', batteryV: 13.8 }} todayKm={null} />)
    expect(screen.queryByText('Current Address')).not.toBeInTheDocument()
    expect(screen.queryByText('Battery')).not.toBeInTheDocument()
  })
})
