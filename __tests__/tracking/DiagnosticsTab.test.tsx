import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiagnosticsTab } from '@/app/(portal)/tracking/components/tabs/DiagnosticsTab'
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

describe('DiagnosticsTab', () => {
  it('shows "No active alerts" when all flags are inactive', () => {
    render(<DiagnosticsTab resolved={baseResolved} />)
    expect(screen.getByText('No active alerts')).toBeInTheDocument()
  })

  it('renders active alert chips and hides the "no active alerts" chip', () => {
    render(<DiagnosticsTab resolved={{ ...baseResolved, jamming: true, idling: true }} />)
    expect(screen.getByText('Jamming Detected')).toBeInTheDocument()
    expect(screen.getByText('Idling')).toBeInTheDocument()
    expect(screen.queryByText('No active alerts')).not.toBeInTheDocument()
  })

  it('renders populated telemetry fields with correct units', () => {
    render(
      <DiagnosticsTab
        resolved={{
          ...baseResolved,
          rpm: 1800,
          odometer: 45210,
          fuelRate: 3.2,
          extV: 12.6,
          ecoScore: 82,
          protocol: 'Teltonika Codec8',
        }}
      />,
    )
    expect(screen.getByText('1800 rpm')).toBeInTheDocument()
    expect(screen.getByText('45210 km')).toBeInTheDocument()
    expect(screen.getByText('3.2 L/h')).toBeInTheDocument()
    expect(screen.getByText('12.600V')).toBeInTheDocument()
    expect(screen.getByText('82/100')).toBeInTheDocument()
    expect(screen.getByText('Teltonika Codec8')).toBeInTheDocument()
  })

  it('shows an em dash placeholder for missing fields', () => {
    render(<DiagnosticsTab resolved={baseResolved} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(10)
  })

  it('falls back to raw string display instead of a placeholder when a numeric-suffixed field arrives as a non-numeric value', () => {
    render(<DiagnosticsTab resolved={{ ...baseResolved, oilLevel: 'normal' }} />)
    expect(screen.getByText('normal')).toBeInTheDocument()
  })
})
