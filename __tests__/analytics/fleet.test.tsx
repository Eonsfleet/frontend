import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithClient } from './helpers'

let query = ''
const push = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace: vi.fn() }),
    usePathname: () => '/analytics/fleet',
    useSearchParams: () => new URLSearchParams(query),
}))
vi.mock('recharts', async (importOriginal) => {
    const real = await importOriginal<typeof import('recharts')>()
    return { ...real, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }
})

const catalog = vi.hoisted(() =>
    ['gps.trips', 'gps.devices', 'events.counts', 'fleet.utilization-report'].map((type) => ({
        type, title: type, category: 'x', permission: 'p', endpoint: '/e', filters: ['filter', 'start_date', 'end_date', 'vehicle_ids', 'driver_ids', 'cluster_ids'], columns: [], window: '60d', allowed: true,
    })),
)
vi.mock('@/lib/api/reports', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/reports')>()), getReportCatalog: vi.fn().mockResolvedValue(catalog) }))

const fleet = vi.hoisted(() => ({ getFleetSummary: vi.fn(), getAvailabilitySnapshot: vi.fn(), getAvailabilityTrend: vi.fn() }))
vi.mock('@/lib/api/analyticsFleet', () => fleet)
const tele = vi.hoisted(() => ({ getTrips: vi.fn(), getTrackers: vi.fn(), getEventCounts: vi.fn() }))
vi.mock('@/lib/api/telemetryReports', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/telemetryReports')>()), ...tele }))

// The old page reads the same fleet endpoints through the untyped client.
vi.mock('@/lib/api/analytics', async (importOriginal) => {
    const real = await importOriginal<typeof import('@/lib/api/analytics')>()
    const stubs = Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn().mockResolvedValue(undefined)]))
    return {
        ...stubs,
        getFleetUtilizationSummary: vi.fn().mockResolvedValue({ total_vehicles: 10, active_vehicles: 4, devices_reporting: 6, utilization_rate_pct: 40, reporting_rate_pct: 60, total_distance_km: 321.5 }),
        getFleetAvailabilitySnapshot: vi.fn().mockResolvedValue({ total: 10, by_status: { active: 4 } }),
        getFleetAvailabilityTrend: vi.fn().mockResolvedValue({ trend: [], total_vehicles: 10, activity_source: 'gps_odometer' }),
        getFleetVehicleList: vi.fn().mockResolvedValue([]),
        getFleetTopVehicles: vi.fn().mockResolvedValue({}),
        getFleetAssetPerformance: vi.fn().mockResolvedValue({}),
    }
})

import { FleetV2 } from '@/components/analytics/fleet/FleetV2'
import LegacyFleet from '@/components/analytics/legacy/LegacyFleet'

const summary = (over = {}) => ({
    total_vehicles: 10, active_vehicles: 4, devices_reporting: 6, utilization_rate_pct: 40, reporting_rate_pct: 60,
    period: { start: '2026-10-04', end: '2026-11-03' }, activity_source: 'gps_odometer', ...over,
})
const meta = (over = {}) => ({ from: '2026-10-04T00:00:00+01:00', to: '2026-11-03T23:59:59+01:00', timezone: 'Africa/Lagos', partial: false, available_from: null, page: 1, per_page: 1, total: 0, last_page: 1, ...over })
const vehicle = (id: number, plate: string, trips: number, duration_s: number, idle_s: number) => ({ vehicle_id: id, vehicle: plate, trips, duration_s, idle_s, distance_km: 1, litres: null, litres_source: null, max_speed_kmh: null })
const tripsPage = (over = {}) => ({
    data: [], meta: meta(),
    extra: {
        totals: { trips: 12, duration_s: 7200, idle_s: 1800, distance_km: 99, litres: null, litres_source: null, max_speed_kmh: null },
        vehicles: [vehicle(1, 'ABC-1', 7, 5400, 600), vehicle(2, 'XYZ-2', 5, 1800, 1200)],
    }, ...over,
})

beforeEach(() => {
    query = ''
    push.mockReset()
    ;[...Object.values(fleet), ...Object.values(tele)].forEach((fn) => fn.mockReset())
    fleet.getFleetSummary.mockResolvedValue(summary())
    fleet.getAvailabilitySnapshot.mockResolvedValue({ total: 10, by_status: { active: 6, in_transit: 3, status_: 1 } })
    fleet.getAvailabilityTrend.mockResolvedValue({ trend: [{ period: '2026-10-05', active_vehicles: 4, availability_pct: 40 }], total_vehicles: 10, activity_source: 'gps_odometer' })
    tele.getTrips.mockResolvedValue(tripsPage())
    tele.getTrackers.mockResolvedValue({ data: [], meta: meta(), extra: { totals: { trackers: 10, online: 8, offline: 2 } } })
    tele.getEventCounts.mockResolvedValue({ data: [{ key: 2, label: 'XYZ-2', total: 9, by_kind: {} }, { key: 1, label: 'ABC-1', total: 3, by_kind: {} }], meta: meta(), extra: { group_by: 'vehicle' } })
})

describe('Fleet tab: fleet and GPS in one page', () => {
    it('shows vehicles, active in the period and trackers reporting, with what "active" meant', async () => {
        renderWithClient(<FleetV2 />)
        expect(await screen.findByText('Active in period')).toBeInTheDocument()
        expect(screen.getByText('40% of the fleet')).toBeInTheDocument()
        expect(screen.getByText('60% of the fleet')).toBeInTheDocument()
        expect(screen.getByText(/moved at least once in the period \(GPS odometer\)/)).toBeInTheDocument()
    })

    it('warns when there was no activity data and the figure is today’s status, not the period’s', async () => {
        fleet.getFleetSummary.mockResolvedValue(summary({ activity_source: 'status_snapshot' }))
        renderWithClient(<FleetV2 />)
        expect(await screen.findByText(/does not depend on the period/)).toBeInTheDocument()
    })

    it('shows an empty fleet as empty', async () => {
        fleet.getFleetSummary.mockResolvedValue(summary({ total_vehicles: 0, active_vehicles: 0 }))
        renderWithClient(<FleetV2 />)
        expect((await screen.findAllByText('No vehicles yet.')).length).toBeGreaterThan(0)
    })

    it('shows trips, trip time and idle time for the period, from one request that asks for one row', async () => {
        query = 'filter=7d'
        renderWithClient(<FleetV2 />)
        const card = await screen.findByRole('region', { name: 'Trips and driving' })
        expect(await within(card).findByText('12')).toBeInTheDocument()
        expect(within(card).getByText('2 h')).toBeInTheDocument()
        expect(within(card).getByText('30 min')).toBeInTheDocument()
        expect(tele.getTrips).toHaveBeenCalledWith(expect.objectContaining({ filter: '7d', per_page: 1 }))
    })

    it('has no tables and no distance, asset score or top-vehicles-by-distance', async () => {
        renderWithClient(<FleetV2 />)
        await screen.findByText('Active in period')
        await screen.findByRole('region', { name: 'Trips and driving' })
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
        expect(screen.queryByText(/\bkm\b/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/asset performance/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/top vehicles/i)).not.toBeInTheDocument()
    })

    it('offers only the periods every card can serve, with no compare or custom range', async () => {
        renderWithClient(<FleetV2 />)
        const select = (await screen.findByLabelText('Period')) as HTMLSelectElement
        expect([...select.options].map((o) => o.value)).toEqual(['7d', '30d'])
        expect(screen.queryByText(/Compare with previous period/)).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Vehicles filter/ })).toBeInTheDocument()
    })

    it('judges each card by its own endpoint: 60 days is refused by the fleet cards but served by the tracker-store cards', async () => {
        query = 'filter=60d'
        renderWithClient(<FleetV2 />)
        expect(await screen.findAllByText(/7 days, 30 days, 90 days or 12 months/)).not.toHaveLength(0)
        expect(fleet.getFleetSummary).not.toHaveBeenCalled()
        await waitFor(() => expect(tele.getTrips).toHaveBeenCalledWith(expect.objectContaining({ filter: '60d' })))
    })

    it('passes vehicle, driver and cluster filters only where they apply, and names where they do not', async () => {
        query = 'vehicle_ids=3&driver_ids=5&cluster_ids=2'
        renderWithClient(<FleetV2 />)
        await waitFor(() => expect(tele.getTrips).toHaveBeenCalledWith(expect.objectContaining({ vehicle_ids: [3], driver_ids: [5], cluster_ids: [2] })))
        // The tracker list has no driver, and the fleet activity cards have no entity filters at all.
        const trackers = await screen.findByRole('region', { name: 'Tracker health' })
        expect(within(trackers).getByText('Whole fleet: the driver filter is not applied')).toBeInTheDocument()
        const activity = screen.getByRole('region', { name: 'Fleet activity' })
        expect(within(activity).getByText('Whole fleet: the vehicle, cluster and driver filters are not applied')).toBeInTheDocument()
        const tripsCard = screen.getByRole('region', { name: 'Trips and driving' })
        expect(within(tripsCard).queryByText(/not applied/)).not.toBeInTheDocument()
    })

    it('draws status and tracker health as donuts with their numbers in text, and names an unresolved status', async () => {
        renderWithClient(<FleetV2 />)
        expect(await screen.findByText('Unknown status')).toBeInTheDocument()
        expect(screen.getByText('In transit')).toBeInTheDocument()
        const trackers = screen.getByRole('region', { name: 'Tracker health' })
        await within(trackers).findByText('Online')
        expect(within(trackers).getByText('8')).toBeInTheDocument()
        expect(within(trackers).getByText('2')).toBeInTheDocument()
    })

    it('says what each trend point means, and draws no trend when there was no activity data rather than a flat 0% line', async () => {
        const first = renderWithClient(<FleetV2 />)
        expect(await screen.findByText(/Share of today.s 10 vehicles/)).toBeInTheDocument()
        first.unmount()
        fleet.getAvailabilityTrend.mockResolvedValue({ trend: [{ period: 'x', active_vehicles: 0, availability_pct: 0 }], total_vehicles: 10, activity_source: 'status_snapshot' })
        renderWithClient(<FleetV2 />)
        expect(await screen.findByText(/so there is no trend to draw/)).toBeInTheDocument()
    })

    it('shows an error as an error, not as an empty or zero card', async () => {
        fleet.getFleetSummary.mockRejectedValue({ response: { status: 500, data: {} } })
        renderWithClient(<FleetV2 />)
        // A failed load is retried once before it is shown as failed.
        await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0), { timeout: 4000 })
        expect(screen.queryByText('Active in period')).not.toBeInTheDocument()
    })
})

describe('busiest vehicles', () => {
    // The vehicle links of the chart's text version (the card's own "View full report" link is not one).
    const links = () => [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/vehicles/"]')]
    const names = () => links().map((a) => a.textContent)

    it('ranks vehicles by trips first, from the server-grouped per-vehicle totals', async () => {
        renderWithClient(<FleetV2 />)
        await waitFor(() => expect(names()).toEqual(['ABC-1', 'XYZ-2']))
        expect(links()[0].parentElement).toHaveTextContent('ABC-1: 7')
        expect(links()[0]).toHaveAttribute('href', '/vehicles/1')
    })

    it('switches metric without another request for trip time and idle time, and re-ranks', async () => {
        renderWithClient(<FleetV2 />)
        await waitFor(() => expect(names()).toEqual(['ABC-1', 'XYZ-2']))
        const calls = tele.getTrips.mock.calls.length
        fireEvent.click(screen.getByRole('radio', { name: 'Idle time' }))
        await waitFor(() => expect(names()).toEqual(['XYZ-2', 'ABC-1']))
        expect(links()[0].parentElement).toHaveTextContent('XYZ-2: 20 min')
        expect(tele.getTrips.mock.calls.length).toBe(calls)
        expect(tele.getEventCounts).not.toHaveBeenCalled()
    })

    it('asks for alarms per vehicle only when that metric is chosen', async () => {
        renderWithClient(<FleetV2 />)
        await waitFor(() => expect(names()).toEqual(['ABC-1', 'XYZ-2']))
        expect(tele.getEventCounts).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('radio', { name: 'Alarms' }))
        await waitFor(() => expect(tele.getEventCounts).toHaveBeenCalledWith(expect.objectContaining({ group_by: 'vehicle' })))
        await waitFor(() => expect(links()[0].parentElement).toHaveTextContent('XYZ-2: 9'))
        expect(names()).toEqual(['XYZ-2', 'ABC-1'])
    })

    it('shows the top ten and says how many there are', async () => {
        const many = Array.from({ length: 12 }, (_, i) => vehicle(i + 1, `V-${i + 1}`, i + 1, 100, 10))
        tele.getTrips.mockResolvedValue(tripsPage({ extra: { totals: { trips: 78, duration_s: 1, idle_s: 1, distance_km: 1, litres: null, litres_source: null, max_speed_kmh: null }, vehicles: many } }))
        renderWithClient(<FleetV2 />)
        expect(await screen.findByText('Top 10 of 12 vehicles.')).toBeInTheDocument()
        expect(links()).toHaveLength(10)
        expect(names()[0]).toBe('V-12')
    })

    it('leaves out vehicles with nothing for the chosen metric', async () => {
        tele.getTrips.mockResolvedValue(tripsPage({ extra: { totals: { trips: 1, duration_s: 1, idle_s: 0, distance_km: 1, litres: null, litres_source: null, max_speed_kmh: null }, vehicles: [vehicle(1, 'ABC-1', 1, 60, 0), vehicle(2, 'ZERO', 0, 0, 0)] } }))
        renderWithClient(<FleetV2 />)
        await waitFor(() => expect(names()).toEqual(['ABC-1']))
    })
})

describe('new Fleet tab against the existing page, on the same backend data', () => {
    it('reports the same vehicles, active vehicles and utilization rate', async () => {
        const old = renderWithClient(<LegacyFleet />)
        expect(await old.findByText('4 / 10')).toBeInTheDocument()
        expect(old.getByText('40%')).toBeInTheDocument()
        old.unmount()

        renderWithClient(<FleetV2 />)
        const activity = await screen.findByRole('region', { name: 'Fleet activity' })
        await within(activity).findByText('Active in period')
        expect(within(activity).getByText('4')).toBeInTheDocument()
        expect(within(activity).getByText('10')).toBeInTheDocument()
        expect(within(activity).getByText('40% of the fleet')).toBeInTheDocument()
    })
})
