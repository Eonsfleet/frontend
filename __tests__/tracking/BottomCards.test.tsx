import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BottomCards } from '@/app/(portal)/tracking/components/BottomCards'

vi.mock('@/lib/api/trips', () => ({ getActiveTripForVehicle: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/api/tracking', () => ({ getDeviceById: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/gps', () => ({ reverseGeocode: vi.fn().mockResolvedValue('Geocoded Address, Lagos') }))

const vehicle = { id: '1', attributes: {}, relationships: {} } as any
const resolved = {
  speed: 58,
  heading: 45,
  ignition: true,
  address: 'Ikeja, Lagos',
  isDeviceOnline: true,
  satellites: 9,
} as any

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('BottomCards', () => {
  it('renders the three mockup card titles', () => {
    render(<BottomCards selectedVehicle={vehicle} resolved={resolved} />, { wrapper: Wrapper })
    expect(screen.getByText('Current Trip')).toBeInTheDocument()
    expect(screen.getByText('Location & Movement')).toBeInTheDocument()
    expect(screen.getByText('Device Status')).toBeInTheDocument()
  })

  it('renders live speed and address in the Location & Movement card', () => {
    render(<BottomCards selectedVehicle={vehicle} resolved={resolved} />, { wrapper: Wrapper })
    expect(screen.getByText('58 km/h')).toBeInTheDocument()
    expect(screen.getByText('Ikeja, Lagos')).toBeInTheDocument()
  })

  it('no longer renders the AI Insights card', () => {
    render(<BottomCards selectedVehicle={vehicle} resolved={resolved} />, { wrapper: Wrapper })
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument()
  })

  it('renders trip stats across two columns when a trip is active', async () => {
    const { getActiveTripForVehicle } = await import('@/lib/api/trips')
    vi.mocked(getActiveTripForVehicle).mockResolvedValueOnce({
      attributes: {
        status: 'in_progress',
        actual_start_time: '2026-07-03T08:15:00Z',
        distance_covered_km: 126,
        avg_speed: 64,
        routes: [{ is_stop_point: true }, { is_stop_point: false }, { is_stop_point: true }],
      },
    } as any)
    render(<BottomCards selectedVehicle={vehicle} resolved={resolved} />, { wrapper: Wrapper })
    expect(await screen.findByText('126 km')).toBeInTheDocument()
    expect(screen.getByText('64 km/h')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders GPS signal, battery, fuel, device and SIM in the Device Status card', async () => {
    const vehicleWithDevice = {
      id: '1',
      attributes: {},
      relationships: { device: { id: 'dev-1', imei: '123456789012345', status: 'active' } },
    }
    const { getDeviceById } = await import('@/lib/api/tracking')
    vi.mocked(getDeviceById).mockResolvedValueOnce({
      data: { attributes: { status: 'active' }, relationships: { hardware: { name: 'VT310' } } },
    } as any)
    const resolvedWithDevice = { ...resolved, batteryV: 13.8, fuelLiters: 13 }
    render(<BottomCards selectedVehicle={vehicleWithDevice} resolved={resolvedWithDevice} />, { wrapper: Wrapper })
    expect(await screen.findByText('VT310')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('13.800V')).toBeInTheDocument()
    expect(screen.getByText('13.0L')).toBeInTheDocument()
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('shows an em dash for Network when the device has not reported a GSM operator', () => {
    render(<BottomCards selectedVehicle={vehicle} resolved={resolved} />, { wrapper: Wrapper })
    expect(screen.getByText('Network')).toBeInTheDocument()
    const networkValue = screen.getByText('Network').nextElementSibling
    expect(networkValue?.textContent).toBe('—')
  })

  it('renders the live GSM operator code as Network when the device reports one', () => {
    const resolvedWithGsm = { ...resolved, gsmOperator: 62179 }
    render(<BottomCards selectedVehicle={vehicle} resolved={resolvedWithGsm} />, { wrapper: Wrapper })
    const networkValue = screen.getByText('Network').nextElementSibling
    expect(networkValue?.textContent).toBe('62179')
  })

  it('combines fuel percent and liters into one Fuel value when both are present', () => {
    const resolvedWithFuel = { ...resolved, fuel: 62, fuelLiters: 13 }
    render(<BottomCards selectedVehicle={vehicle} resolved={resolvedWithFuel} />, { wrapper: Wrapper })
    expect(screen.getByText('62% · 13.0L')).toBeInTheDocument()
  })

  it('reverse-geocodes the address when the device never sent a resolved address string', async () => {
    const resolvedNoAddress = { ...resolved, address: null, lat: 6.5, lng: 3.4 }
    render(<BottomCards selectedVehicle={vehicle} resolved={resolvedNoAddress} />, { wrapper: Wrapper })
    expect(await screen.findByText('Geocoded Address, Lagos')).toBeInTheDocument()
  })
})
