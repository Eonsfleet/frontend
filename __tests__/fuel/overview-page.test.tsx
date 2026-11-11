import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FuelOverviewSummary } from '@/lib/api/fuelPage'

const api = vi.hoisted(() => ({ getFuelOverviewSummary: vi.fn(), getFuelAlertAssignees: vi.fn() }))
vi.mock('@/lib/api/fuelPage', async (orig) => ({ ...(await orig<typeof import('@/lib/api/fuelPage')>()), ...api }))
vi.mock('@/lib/api/settings', () => ({ getClustersBatched: vi.fn().mockResolvedValue([{ id: '4', attributes: { name: 'Lagos North' } }]) }))
vi.mock('@/hooks/useEcho', () => ({ useEcho: () => ({ subscribePrivate: () => undefined }) }))
vi.mock('recharts', async () => {
    const R = await import('react')
    const Box = ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children)
    return { ResponsiveContainer: Box, AreaChart: Box, Area: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null }
})

import FuelOverviewPage from '@/app/(portal)/fuel/page'

const metrics = (over: Partial<FuelOverviewSummary['current']> = {}): FuelOverviewSummary['current'] => ({
    litres: 1000, litres_measured: 700, litres_estimated: 300, distance_km: 8000, l_per_100km: 12.5, spend: 1_200_000,
    purchased_litres: 1100, price_per_litre: 1090, idle_litres: 90, idle_cost: 98_000, ...over,
})

const summary = (over: Partial<FuelOverviewSummary> = {}): FuelOverviewSummary => ({
    period: { from: '2026-11-01', to: '2026-11-10', days: 10 },
    previous_period: { from: '2026-10-01', to: '2026-10-10', basis: 'last_month' },
    current: metrics(),
    previous: metrics({ litres: 800 }),
    change: { litres: { absolute: 200, percent: 25 }, spend: { absolute: null, percent: null }, l_per_100km: { absolute: -0.4, percent: -3.1 } },
    quality: { vehicles: 10, with_usage: 8, with_measured_usage: 5, with_sensor_readings: 6, estimated_only: 3, no_data: 2 },
    loss: {
        drain_alerts: { count: 2, vehicles: 1, litres: 55 },
        unmatched_refills: { count: 1, litres: 60 },
        bought_vs_used: { purchased_litres: 1100, used_litres: 1000, gap_litres: 100 },
        idle: { litres: 90, cost: 98_000 },
    },
    by_cluster: [{ cluster_id: 4, name: 'Lagos North', vehicles: 6, litres: 600, distance_km: 5000, l_per_100km: 12, spend: 700_000 }],
    by_type: [{ type: 'pickup', make: 'toyota', model: 'hilux', vehicles: 6, litres: 600, distance_km: 5000, l_per_100km: 12 }],
    outliers: [{ vehicle_id: 7, registration_number: 'LAG-7-XY', make: 'toyota', model: 'hilux', l_per_100km: 20, peer_median_l_per_100km: 10, peers: 4, excess_litres: 50, basis: 'estimated' }],
    budget: null,
    needs_action: {
        counts: { new: 1, acknowledged: 0 },
        alerts: [{ id: 21, vehicle_id: 7, registration_number: 'LAG-7-XY', type: 'fuel_theft', status: 'new', severity: 'critical', alert_time: '2026-11-10T08:00:00Z', difference: 30, unit: 'L', message: 'Fuel level dropped by 30L, suspected drain', assigned_to: null, investigating: false }],
    },
    trend: [{ date: '2026-11-01', litres: 100, spend: null }],
    generated_at: '2026-11-10T09:00:00Z',
    ...over,
})

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><FuelOverviewPage /></QueryClientProvider>)

beforeEach(() => { vi.clearAllMocks(); api.getFuelOverviewSummary.mockResolvedValue(summary()); api.getFuelAlertAssignees.mockResolvedValue([]) })

describe('fuel overview', () => {
    it('opens on month to date against the same days last month', async () => {
        renderPage()
        await screen.findByText('Fuel used')

        const params = api.getFuelOverviewSummary.mock.calls[0][0]
        expect(params.compare).toBe('last_month')
        expect(params.from).toMatch(/-01$/)
    })

    it('states how much of the fleet the figures stand on', async () => {
        renderPage()
        const strip = await screen.findByTestId('quality-strip')

        expect(strip.textContent).toContain('5 of 10 vehicles have measured fuel use')
        expect(strip.textContent).toContain('3 estimated only')
        expect(strip.textContent).toContain('2 with no data this period')
    })

    it('splits mixed litres into measured and estimated, and shows the change against last month', async () => {
        renderPage()
        await screen.findByText('Fuel used')

        expect(screen.getByText(/700 L measured · ≈ 300 L estimated/)).toBeTruthy()
        expect(screen.getByText('+25.0%')).toBeTruthy()
        expect(screen.getAllByText(/vs same days last month/).length).toBeGreaterThan(0)
    })

    it('says there is nothing to compare with instead of inventing a change', async () => {
        renderPage()
        await screen.findByText('Fuel spend')

        expect(screen.getAllByText(/No same days last month figure to compare/).length).toBeGreaterThan(0)
    })

    it('shows a dash, never zero, for figures with nothing behind them', async () => {
        api.getFuelOverviewSummary.mockResolvedValue(summary({ current: metrics({ litres: null, litres_measured: null, litres_estimated: null, spend: null, l_per_100km: null, distance_km: null, purchased_litres: null, idle_litres: null, idle_cost: null, price_per_litre: null }) }))
        renderPage()
        await screen.findByText('Fuel used')

        expect(screen.queryByText('0.0 L')).toBeNull()
        expect(screen.queryByText('₦0')).toBeNull()
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
    })

    it('invites budget setup when there is none, and shows the projection when there is', async () => {
        const { unmount } = renderPage()
        expect(await screen.findByText('Set fuel budgets →')).toBeTruthy()
        unmount()

        api.getFuelOverviewSummary.mockResolvedValue(summary({ budget: { month: '2026-11', vehicles: 8, budget_litres: 3000, used_litres: 1000, used_percent: 33.3, projected_litres: 3300, projected_over_litres: 300, days_elapsed: 10, days_in_month: 30 } }))
        renderPage()
        expect(await screen.findByText(/over by ≈ 300 L/)).toBeTruthy()
    })

    it('puts the loss signals in plain words, without calling a gap proof of theft', async () => {
        renderPage()
        await screen.findByText('Where fuel may be leaking')

        expect(screen.getByText('Suspected drains')).toBeTruthy()
        expect(screen.getByText(/60 L went in without a record/)).toBeTruthy()
        expect(screen.getByText(/Worth a look, not proof of loss/)).toBeTruthy()
    })

    it('lists what needs action with the actions to take', async () => {
        renderPage()
        await screen.findByText('Needs action today')

        expect(screen.getByText('Suspected drain')).toBeTruthy()
        expect(screen.getByText('Acknowledge')).toBeTruthy()
        expect(screen.getByText('Call driver')).toBeTruthy()
        expect(screen.getByText('Investigate')).toBeTruthy()
    })

    it('flags a vehicle against its peers with the basis of the comparison', async () => {
        renderPage()
        await screen.findByText('Burning more than their peers')

        expect(screen.getAllByText('LAG-7-XY').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Estimated').length).toBeGreaterThan(0)
    })

    it('changing the period refetches with it and the comparison that suits it', async () => {
        renderPage()
        await screen.findByText('Fuel used')

        fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'last7' } })

        await waitFor(() => expect(api.getFuelOverviewSummary).toHaveBeenLastCalledWith(expect.objectContaining({ compare: 'previous' })))
    })

    it('does not fetch a custom range until both dates are chosen', async () => {
        renderPage()
        await screen.findByText('Fuel used')
        api.getFuelOverviewSummary.mockClear()

        fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'custom' } })
        fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } })
        expect(api.getFuelOverviewSummary).not.toHaveBeenCalled()

        fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-15' } })
        await waitFor(() => expect(api.getFuelOverviewSummary).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-10-01', to: '2026-10-15' })))
    })

    it('reports a failed load instead of an empty page', async () => {
        api.getFuelOverviewSummary.mockRejectedValue(new Error('boom'))
        renderPage()

        expect(await screen.findByText(/Failed to load fuel overview/)).toBeTruthy()
    })
})
