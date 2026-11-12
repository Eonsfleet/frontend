import { describe, expect, it, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'

const api = vi.hoisted(() => ({ getVehicleSetup: vi.fn() }))
vi.mock('@/lib/api/telemetryReports', async (orig) => ({ ...(await orig<typeof import('@/lib/api/telemetryReports')>()), ...api }))

import { VehicleTelemetrySetupCard } from '@/components/analytics/telemetry/VehicleTelemetrySetupCard'

const renderCard = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VehicleTelemetrySetupCard vehicleId={7} /></QueryClientProvider>)

describe('VehicleTelemetrySetupCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('says the setup could not be loaded, rather than disappearing as if nothing needed attention', async () => {
    api.getVehicleSetup.mockRejectedValue(new Error('boom'))
    renderCard()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded'))
  })
})
