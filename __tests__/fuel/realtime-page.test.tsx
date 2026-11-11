import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { RealtimeFuelSnapshot, RealtimeFuelVehicle } from '@/lib/api/fuelPage'

const api = vi.hoisted(() => ({ getFuelRealtimeSnapshot: vi.fn() }))
vi.mock('@/lib/api/fuelPage', async (orig) => ({ ...(await orig<typeof import('@/lib/api/fuelPage')>()), ...api }))
vi.mock('@/lib/api/settings', () => ({ getClustersBatched: vi.fn().mockResolvedValue([{ id: '4', attributes: { name: 'Lagos North' } }]) }))
vi.mock('@/lib/api/fuel', async (orig) => ({ ...(await orig<typeof import('@/lib/api/fuel')>()), getVehicleAbnormalities: vi.fn().mockResolvedValue({ data: { abnormalities: [], pagination: {} } }) }))
vi.mock('@/hooks/useEcho', () => ({ useEcho: () => ({ subscribePrivate: () => undefined }) }))
vi.mock('@/app/(portal)/fuel/components/useFuelLiveSync', () => ({ useFuelLiveSync: () => ({}) }))
vi.mock('@/app/(portal)/fuel/components/FuelLevelMap', () => ({ FuelLevelMap: ({ vehicles }: { vehicles: unknown[] }) => <div data-testid="map">{vehicles.length} on map</div> }))

import FuelRealtimePage from '@/app/(portal)/fuel/realtime/page'

const v = (id: number, over: Partial<RealtimeFuelVehicle> = {}): RealtimeFuelVehicle => ({
    vehicle_id: id, registration_number: `LAG-${id}-XY`, make: 'Toyota', model: 'Hilux', type: 'pickup', cluster_id: 4,
    level_litres: 40, level_percent: 50, basis: 'measured', capacity_litres: 80,
    recorded_at: '2026-11-10T09:58:00Z', age_minutes: 2, freshness: 'live',
    burn_litres_per_hour: 5, burn_percent_per_hour: null, burn_basis: { span_minutes: 60, points: 6 },
    hours_to_empty: 8, range_km: 400, location: null, open_alerts: 0, ...over,
})

const snapshot = (over: Partial<RealtimeFuelSnapshot> = {}): RealtimeFuelSnapshot => ({
    summary: { reporting: 3, live: 2, stale: 1, silent: 1, low: 1 },
    vehicles: [
        v(1),
        v(2, { level_percent: 12, level_litres: 9.6, basis: 'calculated', hours_to_empty: 1.9, range_km: 80, open_alerts: 2 }),
        v(3, { freshness: 'stale', age_minutes: 90, burn_basis: null, burn_litres_per_hour: null, hours_to_empty: null, range_km: null, basis: 'percent_only', level_litres: null }),
    ],
    silent: [{ vehicle_id: 9, registration_number: 'LAG-9-XY', last_reading_at: '2026-11-07T10:00:00Z', age_minutes: 4300, cluster_id: null }],
    generated_at: new Date().toISOString(),
    ...over,
})

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><FuelRealtimePage /></QueryClientProvider>)

beforeEach(() => { vi.clearAllMocks(); api.getFuelRealtimeSnapshot.mockResolvedValue(snapshot()) })

describe('real-time fuel tab', () => {
    it('lists the vehicle that runs dry soonest first, with unknown range last', async () => {
        renderPage()
        await screen.findByText('LAG-2-XY')

        const rows = screen.getAllByRole('button', { pressed: false }).filter((b) => /LAG-\d-XY/.test(b.textContent ?? ''))
        expect(rows.map((r) => r.textContent?.match(/LAG-\d/)?.[0])).toEqual(['LAG-2', 'LAG-1', 'LAG-3'])
    })

    it('says how each level was obtained and never shows litres it does not have', async () => {
        renderPage()
        await screen.findByText('LAG-2-XY')

        expect(screen.getByText('Calculated')).toBeTruthy()
        expect(screen.getByText('≈ 9.6 L')).toBeTruthy()
        expect(screen.getByText('% only')).toBeTruthy()
        const pctOnly = screen.getByText('LAG-3-XY').closest('button')!
        expect(within(pctOnly).getByText('—', { selector: 'span' })).toBeTruthy()
        expect(within(pctOnly).getByText('Burn —')).toBeTruthy()
    })

    it('keeps the silent vehicles collapsed until asked', async () => {
        renderPage()
        await screen.findByText('LAG-2-XY')

        expect(screen.queryByText('LAG-9-XY')).toBeNull()
        fireEvent.click(screen.getByText(/Sensor silent · 1/))
        expect(screen.getByText('LAG-9-XY')).toBeTruthy()
        expect(screen.getByText(/last reading 2 d ago/)).toBeTruthy()
    })

    it('opens the detail panel for the chosen vehicle', async () => {
        renderPage()
        fireEvent.click(await screen.findByText('LAG-1-XY'))

        expect(await screen.findByRole('heading', { name: 'LAG-1-XY' })).toBeTruthy()
        expect(screen.getByText('Open alerts')).toBeTruthy()
    })

    it('asks the server for a cluster when one is chosen', async () => {
        renderPage()
        await screen.findByText('LAG-1-XY')
        await screen.findByText('Lagos North')

        fireEvent.change(screen.getByLabelText('Cluster'), { target: { value: '4' } })

        await waitFor(() => expect(api.getFuelRealtimeSnapshot).toHaveBeenLastCalledWith({ cluster_id: 4 }))
    })

    it('says so when nothing has reported', async () => {
        api.getFuelRealtimeSnapshot.mockResolvedValue(snapshot({ vehicles: [], silent: [], summary: { reporting: 0, live: 0, stale: 0, silent: 0, low: 0 } }))
        renderPage()

        expect(await screen.findByText(/No vehicle has reported a fuel level in the last 24 hours/)).toBeTruthy()
    })

    it('reports a failed load instead of an empty board', async () => {
        api.getFuelRealtimeSnapshot.mockRejectedValue(new Error('boom'))
        renderPage()

        expect(await screen.findByText(/Failed to load live fuel levels/)).toBeTruthy()
    })
})
