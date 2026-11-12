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

  it('draws only the rows the device reported, and lists the rest once instead of a column of dashes', () => {
    render(<DetailsTab resolved={{ ...baseResolved, rpm: 1450, hdop: 0.9 }} />)

    expect(screen.getByText('Engine RPM')).toBeInTheDocument()
    expect(screen.getByText('GPS Precision (HDOP)')).toBeInTheDocument()
    // Not drawn as rows with a dash ...
    expect(screen.queryAllByText('—')).toHaveLength(0)
    expect(screen.queryByText('Oil Level', { selector: 'span.uppercase' })).toBeNull()
    // ... but named, once, as not reported.
    const note = screen.getByTestId('not-reported')
    expect(note).toHaveTextContent('Not reported by this device')
    expect(note).toHaveTextContent('Oil Level')
    expect(note).toHaveTextContent('Engine Hours')
    expect(note.textContent).not.toMatch(/Engine RPM(?! \()/) // RPM was reported (the OBD variant was not)
    expect(note.textContent).not.toMatch(/GPS Precision \(HDOP\)/)
  })

  it('shows the readings the platform names: load, throttle, coolant, battery level, PDOP and GSM signal', () => {
    render(<DetailsTab resolved={{ ...baseResolved, engineLoad: 41, throttle: 18, coolantTemp: 88, batteryLevel: 87, pdop: 1.4, gsmSignal: 4, tripOdo: 12.5 } as never} />)

    expect(screen.getByText('41%')).toBeInTheDocument()
    expect(screen.getByText('18%')).toBeInTheDocument()
    expect(screen.getByText('88°C')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
    expect(screen.getByText('1.4')).toBeInTheDocument()
    expect(screen.getByText('4 of 5')).toBeInTheDocument()
    expect(screen.getByText('12.5 km')).toBeInTheDocument()
  })

  it('shows the fuel level as percentage and litres together', () => {
    const { rerender } = render(<DetailsTab resolved={{ ...baseResolved, fuel: 62, fuelLiters: 38.5, fuelBasis: 'device' } as never} />)
    expect(screen.getByText('62% · 38.5 L')).toBeInTheDocument()

    rerender(<DetailsTab resolved={{ ...baseResolved, fuel: 40, fuelLiters: 24, fuelBasis: 'calculated' } as never} />)
    expect(screen.getByText('40% · ≈ 24.0 L')).toBeInTheDocument()
  })

  it('says nothing is reported, not that everything is closed or zero, for a device with no readings', () => {
    render(<DetailsTab resolved={baseResolved} />)

    expect(screen.queryByText('Door Status')).not.toBeInTheDocument()
    expect(screen.queryByText('0 rpm')).not.toBeInTheDocument()
    expect(screen.getByTestId('not-reported')).toHaveTextContent('Door Status')
  })

  it('shows oil level, engine hours, load weight and the eco score with their units', () => {
    render(<DetailsTab resolved={{ ...baseResolved, oilLevel: 64, engineHours: 1.5, loadWeight: 1250, ecoScore: 82.5 } as never} />)

    expect(screen.getByText('64%')).toBeInTheDocument()
    expect(screen.getByText('1.5 hrs')).toBeInTheDocument()
    expect(screen.getByText('1250 kg')).toBeInTheDocument()
    expect(screen.getByText('82.5/100')).toBeInTheDocument()
  })
})
