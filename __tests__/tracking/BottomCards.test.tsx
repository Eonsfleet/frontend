import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BottomCards } from '@/app/(portal)/tracking/components/BottomCards'

vi.mock('@/lib/api/trips', () => ({ getActiveTripForVehicle: vi.fn().mockResolvedValue(null) }))

const vehicle = { id: '1', attributes: {} } as any
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
})
