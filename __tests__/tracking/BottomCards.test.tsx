import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BottomCards } from '@/app/(portal)/tracking/components/BottomCards'

vi.mock('@/lib/api/trips', () => ({ getActiveTripForVehicle: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/api/tracking', () => ({ getDeviceStatus: vi.fn().mockResolvedValue(null) }))

const vehicle = { id: '1', attributes: {}, relationships: {} } as any
const loc = { speed: 58, heading: 45, ignition: true, address: 'Ikeja, Lagos', is_online: true, satellites: 9 }

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('BottomCards', () => {
  it('renders the three mockup card titles', () => {
    render(<BottomCards selectedVehicle={vehicle} loc={loc} />, { wrapper: Wrapper })
    expect(screen.getByText('Current Trip')).toBeInTheDocument()
    expect(screen.getByText('Location & Movement')).toBeInTheDocument()
    expect(screen.getByText('Device Status')).toBeInTheDocument()
  })

  it('renders live speed and address in the Location & Movement card', () => {
    render(<BottomCards selectedVehicle={vehicle} loc={loc} />, { wrapper: Wrapper })
    expect(screen.getByText('58 km/h')).toBeInTheDocument()
    expect(screen.getByText('Ikeja, Lagos')).toBeInTheDocument()
  })

  it('no longer renders the AI Insights card', () => {
    render(<BottomCards selectedVehicle={vehicle} loc={loc} />, { wrapper: Wrapper })
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
    render(<BottomCards selectedVehicle={vehicle} loc={loc} />, { wrapper: Wrapper })
    expect(await screen.findByText('126 km')).toBeInTheDocument()
    expect(screen.getByText('64 km/h')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders GPS signal, network, battery, fuel, device and SIM in the Device Status card', async () => {
    const vehicleWithDevice = { id: '1', attributes: {}, relationships: { device: { imei: '123456789012345', status: 'active' } } }
    const { getDeviceStatus } = await import('@/lib/api/tracking')
    vi.mocked(getDeviceStatus).mockResolvedValueOnce({
      data: { model: 'VT310', network: '4G' },
    } as any)
    const locWithDevice = { ...loc, battery_voltage: 13.8, fuel_liters: 13 }
    render(<BottomCards selectedVehicle={vehicleWithDevice} loc={locWithDevice} />, { wrapper: Wrapper })
    expect(await screen.findByText('4G')).toBeInTheDocument()
    expect(screen.getByText('VT310')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('13.800V')).toBeInTheDocument()
    expect(screen.getByText('13L')).toBeInTheDocument()
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })
})
