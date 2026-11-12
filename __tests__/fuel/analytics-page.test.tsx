import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FuelAnalytics } from '@/lib/api/fuelPage'

const api = vi.hoisted(() => ({ getFuelAnalytics: vi.fn() }))
vi.mock('@/lib/api/fuelPage', async (orig) => ({ ...(await orig<typeof import('@/lib/api/fuelPage')>()), ...api }))
vi.mock('@/lib/api/settings', () => ({ getClustersBatched: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/api/fuel', () => ({
    getFuelVehicles: vi.fn().mockResolvedValue({ data: { vehicles: [{ id: '7', attributes: { registration_number: 'LAG-7-XY', make: 'Toyota', model: 'Hilux' } }] } }),
}))
vi.mock('recharts', async () => {
    const R = await import('react')
    const Box = ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children)
    const Null = () => null
    return { ResponsiveContainer: Box, ComposedChart: Box, LineChart: Box, BarChart: Box, Bar: Null, Line: Null, Legend: Null, ReferenceLine: Null, CartesianGrid: Null, XAxis: Null, YAxis: Null, Tooltip: Null }
})

import FuelAnalyticsPage from '@/app/(portal)/fuel/analytics/page'

const analytics = (over: Partial<FuelAnalytics> = {}): FuelAnalytics => ({
    period: { from: '2026-10-12', to: '2026-11-10', days: 30, bucket: 'day' },
    vehicles: 3,
    totals: {
        litres_used: 1000, litres_measured: 700, litres_estimated: 300, distance_km: 8000, l_per_100km: 12.5, km_per_litre: 8, vehicles_with_usage: 3, days_with_usage: 20,
        refill_count: 2, refilled_litres: 120, purchase_count: 2, purchased_litres: 110, spend: 120_000, price_per_litre: 1090,
    },
    series: [{ date: '2026-11-02', litres: 40, distance_km: 400, l_per_100km: 10, refilled_litres: 60, refills: 1, purchased_litres: null, spend: null }],
    levels: null,
    refills: [{ id: 1, vehicle_id: 7, registration_number: 'LAG-7-XY', at: '2026-11-03T08:00:00Z', litres: 60, source: 'device', matched_purchase: false }],
    drains: [],
    by_vehicle: [{ vehicle_id: 7, registration_number: 'LAG-7-XY', make: 'Toyota', model: 'Hilux', days: 9, litres: 400, distance_km: 3000, l_per_100km: 13.3, km_per_litre: 7.5, refilled_litres: 60, refills: 1, purchased_litres: null, spend: null, basis: 'measured' }],
    generated_at: '2026-11-10T09:00:00Z',
    ...over,
})

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><FuelAnalyticsPage /></QueryClientProvider>)

beforeEach(() => { vi.clearAllMocks(); api.getFuelAnalytics.mockResolvedValue(analytics()) })

describe('fuel analytics', () => {
    it('opens on the last 30 days for the whole fleet', async () => {
        renderPage()
        await screen.findByText('Fuel used')

        const params = api.getFuelAnalytics.mock.calls[0][0]
        expect(params.vehicle_ids).toBeUndefined()
        expect(params.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(screen.getByText(/3 vehicles/)).toBeTruthy()
    })

    it('says how much of the used litres were measured when they are mixed', async () => {
        renderPage()
        expect(await screen.findByText(/700 L measured/)).toBeTruthy()
    })

    it('shows a dash, not zero, when nothing was recorded', async () => {
        api.getFuelAnalytics.mockResolvedValue(analytics({ totals: { ...analytics().totals, refilled_litres: null, refill_count: 0, purchased_litres: null, spend: null, price_per_litre: null, purchase_count: 0 }, refills: [], series: [] }))
        renderPage()
        await screen.findByText('Fuel used')
        expect(screen.getByText('No refills detected in this period.')).toBeTruthy()
        expect(screen.queryByText('0 L')).toBeNull()
    })

    it('asks for one to five vehicles before it shows the tank level', async () => {
        renderPage()
        expect(await screen.findByText(/Choose one to five vehicles/)).toBeTruthy()
    })

    it('flags a refill with no purchase on record', async () => {
        renderPage()
        expect(await screen.findByText('No purchase on record')).toBeTruthy()
    })

    it('asks again with the chosen period', async () => {
        renderPage()
        await screen.findByText('Fuel used')
        fireEvent.change(screen.getByRole('combobox', { name: 'Period' }), { target: { value: 'last7' } })
        await waitFor(() => expect(api.getFuelAnalytics.mock.calls.length).toBeGreaterThan(1))
        const last = api.getFuelAnalytics.mock.calls.at(-1)![0]
        expect(last.from < last.to).toBe(true)
    })

    it('shows the tank level once vehicles are chosen, each in its own unit', async () => {
        api.getFuelAnalytics.mockResolvedValue(analytics({
            vehicles: 1,
            levels: [{ vehicle_id: 7, registration_number: 'LAG-7-XY', step_seconds: 300, points: [{ at: '2026-11-02T10:00:00Z', litres: null, percent: 80 }] }],
        }))
        renderPage()
        expect(await screen.findByText(/Fuel level history \(percent of tank\)/)).toBeTruthy()
    })
})
