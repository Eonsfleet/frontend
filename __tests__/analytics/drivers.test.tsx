import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithClient } from './helpers'

// The searchable picker (cmdk) needs these, which jsdom does not have.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView ??= () => {}

let query = ''
const replace = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace }),
    usePathname: () => '/analytics/drivers',
    useSearchParams: () => new URLSearchParams(query),
}))
vi.mock('recharts', async (importOriginal) => {
    const real = await importOriginal<typeof import('recharts')>()
    return { ...real, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }
})
const catalog = vi.hoisted(() =>
    ['events.list'].map((type) => ({ type, title: type, category: 'x', permission: 'p', endpoint: '/e', filters: ['filter', 'start_date', 'end_date', 'vehicle_ids', 'driver_ids', 'cluster_ids'], columns: [], window: '60d', allowed: true })),
)
vi.mock('@/lib/api/reports', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/reports')>()), getReportCatalog: vi.fn().mockResolvedValue(catalog) }))

const d = vi.hoisted(() => ({
    getDriverTrips: vi.fn(), getDriverIncidents: vi.fn(), getDriverTelemetry: vi.fn(), getDriverVehicleUsage: vi.fn(), getInspections: vi.fn(), getDocumentExpiry: vi.fn(), DRIVER_LIST_LIMIT: 500,
}))
vi.mock('@/lib/api/analyticsDrivers', () => d)
const tele = vi.hoisted(() => ({ getEventCounts: vi.fn(), getEventTrend: vi.fn(), getTrips: vi.fn() }))
vi.mock('@/lib/api/telemetryReports', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/telemetryReports')>()), ...tele }))
const people = vi.hoisted(() => ({ getDrivers: vi.fn(), getDriverById: vi.fn() }))
vi.mock('@/lib/api/drivers', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/drivers')>()), ...people }))

import { DriversV2 } from '@/components/analytics/drivers/DriversV2'
import { bucketExpiry, datesBetween, groupTripsByDay, minutesOfDay } from '@/components/analytics/drivers/charts'

const meta = (over = {}) => ({ from: '', to: '', timezone: 'Africa/Lagos', partial: false, available_from: null, page: 1, per_page: 50, total: 0, last_page: 1, ...over })
const tRow = (id: number, name: string, trips: number, duration_s = 3600, idle_s = 600, active_days = 3) => ({ driver_id: id, driver: name, trips, duration_s, idle_s, active_days })
const ev = (key: number | null, label: string | null, total: number) => ({ key, label, total, by_kind: {} })
const doc = (over = {}) => ({ id: 1, owner_type: 'driver', owner_id: 1, owner: 'Ada Obi', category: 'driver_license', title: 'Licence', expires_at: '2026-11-20', days_left: 10, status: 'expiring', ...over })
const docs = (list: object[], over = {}) => ({
    data: list,
    totals: { driver: { expired: 1, expiring: 2 }, vehicle: { expired: 0, expiring: 1 } },
    meta: { days: 30, limit: 200, truncated: false, expired_lookback_days: 365, superseded_filtered: true, ...over },
})

// The links of a chart's text version.
const links = () => [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/analytics/drivers?"]')]
const names = () => links().map((a) => a.textContent)

beforeEach(() => {
    query = ''
    replace.mockReset()
    ;[...Object.values({ ...d, DRIVER_LIST_LIMIT: undefined }).filter(Boolean), ...Object.values(tele), ...Object.values(people)].forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset?.())
    d.getDriverTelemetry.mockResolvedValue({ data: [tRow(1, 'Ada Obi', 4, 3600, 600, 3), tRow(2, 'Tunde Bello', 9, 7200, 1800, 5), tRow(3, 'Zero Trips', 0, 0, 0, 0)], totals: { drivers: 3, trips: 13, duration_s: 10800, idle_s: 2400, unassigned_trips: 2 }, meta: meta() })
    d.getDriverTrips.mockResolvedValue({ period: { start: '', end: '' }, drivers: [{ driver_id: 5, driver_name: 'Dispatch Dan', trips_count: 6 }] })
    d.getDriverIncidents.mockResolvedValue([{ driver_id: 2, driver_name: 'Tunde Bello', incident_count: 3 }, { driver_id: 1, driver_name: 'Ada Obi', incident_count: 1 }])
    d.getDocumentExpiry.mockResolvedValue(docs([doc(), doc({ id: 2, owner_type: 'vehicle', owner_id: 9, owner: 'ABC-123', category: 'insurance', title: 'Insurance', days_left: -4, status: 'expired' })]))
    d.getInspections.mockResolvedValue({ data: [{ date: '2026-11-02', driver_id: 1, driver: 'Ada Obi', inspections: 2, with_defects: 1 }], totals: { inspections: 2, with_defects: 1, drivers: 1 } })
    d.getDriverVehicleUsage.mockResolvedValue({ data: [{ driver_id: 1, driver: 'Ada Obi', vehicle_id: 7, vehicle: 'ABC-123', trips: 3, duration_s: 5400 }, { driver_id: 1, driver: 'Ada Obi', vehicle_id: 8, vehicle: 'XYZ-9', trips: 1, duration_s: 1800 }], totals: { rows: 2, truncated: false } })
    tele.getEventCounts.mockResolvedValue({ data: [ev(1, 'Ada Obi', 5), ev(null, null, 8), ev(2, 'Tunde Bello', 2)], meta: meta(), extra: { group_by: 'driver' } })
    tele.getEventTrend.mockResolvedValue({ data: [{ period: '2026-11-01', total: 5, by_category: { speeding: 3, idling: 2 } }, { period: '2026-11-02', total: 2, by_category: { speeding: 2 } }], meta: meta(), extra: { interval: 'day' } })
    tele.getTrips.mockResolvedValue({ data: [{ id: 't1', started_at: '2026-11-02T08:00:00+01:00', ended_at: '2026-11-02T09:30:00+01:00', duration_s: 5400 }], meta: meta({ total: 1 }), extra: {} })
    people.getDrivers.mockResolvedValue({ data: [{ id: '1', attributes: { full_name: 'Ada Obi', email: 'a@x' } }, { id: '2', attributes: { full_name: 'Tunde Bello', email: 't@x' } }], pagination: { total: 2 } })
    people.getDriverById.mockResolvedValue({ data: { id: '1', attributes: { full_name: 'Ada Obi', status: 'active' }, relationships: { cluster: { id: 1, name: 'Lagos' } } } })
})

describe('chart helpers', () => {
    it('places a trip at its Lagos time of day, whatever the offset it was sent with', () => {
        expect(minutesOfDay('2026-11-02T08:30:00+01:00')).toBe(8 * 60 + 30)
        expect(minutesOfDay('2026-11-02T07:30:00Z')).toBe(8 * 60 + 30)
    })

    it('groups finished trips by day, newest day first, and stops a trip that runs past midnight at the end of its day', () => {
        const days = groupTripsByDay([
            { id: 'a', started_at: '2026-11-01T10:00:00+01:00', ended_at: '2026-11-01T11:00:00+01:00', duration_s: 3600 },
            { id: 'b', started_at: '2026-11-02T23:00:00+01:00', ended_at: '2026-11-03T01:00:00+01:00', duration_s: 7200 },
            { id: 'open', started_at: '2026-11-02T12:00:00+01:00', ended_at: null, duration_s: null },
        ] as never)
        expect(days.map((x) => x.date)).toEqual(['2026-11-02', '2026-11-01'])
        expect(days[0].trips).toHaveLength(1) // the open trip is left out
        expect(days[0].trips[0]).toMatchObject({ from: 23 * 60, to: 24 * 60 })
    })

    it('lists every date of a range and buckets documents by how soon they expire, split by owner', () => {
        expect(datesBetween('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
        const rows = bucketExpiry([doc({ days_left: -3 }), doc({ days_left: 5 }), doc({ days_left: 5, owner_type: 'vehicle' }), doc({ days_left: 30 })] as never)
        expect(rows).toEqual([
            { bucket: 'Expired', Drivers: 1, Vehicles: 0 },
            { bucket: 'Within 7 days', Drivers: 1, Vehicles: 1 },
            { bucket: '8 to 14 days', Drivers: 0, Vehicles: 0 },
            { bucket: '15 days or more', Drivers: 1, Vehicles: 0 },
        ])
    })
})

describe('Drivers tab: comparing drivers', () => {
    it('ranks drivers by trips from the tracker store, leaving out drivers with none, and says how many trips have no driver', async () => {
        renderWithClient(<DriversV2 />)
        await waitFor(() => expect(names().slice(0, 2)).toEqual(['Tunde Bello', 'Ada Obi']))
        expect(names()).not.toContain('Zero Trips')
        expect(await screen.findByText('2 trips have no driver assigned')).toBeInTheDocument()
    })

    it('opens a driver’s own page from a bar: the same tab, filtered to that driver, keeping the other filters', async () => {
        query = 'filter=7d&vehicle_ids=4'
        renderWithClient(<DriversV2 />)
        await waitFor(() => expect(links()[0]).toHaveAttribute('href', '/analytics/drivers?filter=7d&vehicle_ids=4&driver_ids=2'))
    })

    it('re-ranks by trip time, idle time and days driven from the same data, with no new request', async () => {
        renderWithClient(<DriversV2 />)
        await waitFor(() => expect(names()[0]).toBe('Tunde Bello'))
        const calls = d.getDriverTelemetry.mock.calls.length
        fireEvent.click(screen.getByRole('radio', { name: 'Trip time' }))
        await waitFor(() => expect(links()[0].parentElement).toHaveTextContent('Tunde Bello: 2 h'))
        fireEvent.click(screen.getByRole('radio', { name: 'Days driven' }))
        await waitFor(() => expect(links()[0].parentElement).toHaveTextContent('Tunde Bello: 5'))
        expect(d.getDriverTelemetry.mock.calls.length).toBe(calls)
        expect(d.getDriverTrips).not.toHaveBeenCalled()
    })

    it('uses the older dispatched-trips endpoint only for that metric, and says the list can be cut', async () => {
        d.getDriverTrips.mockResolvedValue({ period: { start: '', end: '' }, drivers: Array.from({ length: 500 }, (_, i) => ({ driver_id: i + 1, driver_name: `D${i + 1}`, trips_count: 1 })) })
        renderWithClient(<DriversV2 />)
        await waitFor(() => expect(names().length).toBeGreaterThan(0))
        fireEvent.click(screen.getByRole('radio', { name: 'Dispatched trips' }))
        expect(await screen.findByText(/lists up to 500 drivers/)).toBeInTheDocument()
        expect(screen.getByText('Dispatched trips, not tracker trips')).toBeInTheDocument()
    })

    it('serves 60 days to the tracker-store metrics but refuses it for dispatched trips, rather than using another period', async () => {
        query = 'filter=60d'
        renderWithClient(<DriversV2 />)
        await waitFor(() => expect(d.getDriverTelemetry).toHaveBeenCalledWith(expect.objectContaining({ filter: '60d' })))
        fireEvent.click(screen.getByRole('radio', { name: 'Dispatched trips' }))
        expect(await screen.findAllByText(/7 days, 30 days, 90 days or 12 months/)).not.toHaveLength(0)
        expect(d.getDriverTrips).not.toHaveBeenCalled()
    })

    it('never sends the new tracker-store endpoints a period they reject (90 days, 12 months), and says the range is not available', async () => {
        query = 'filter=90d'
        renderWithClient(<DriversV2 />)
        expect((await screen.findAllByText(/only kept for 60 days/)).length).toBeGreaterThan(0)
        expect(d.getDriverTelemetry).not.toHaveBeenCalled()
        expect(d.getInspections).not.toHaveBeenCalled()
        expect(tele.getEventCounts).not.toHaveBeenCalled()
    })

    it('asks the server for one event category at a time, and shows events with no driver as an unlinked bar', async () => {
        renderWithClient(<DriversV2 />)
        await waitFor(() => expect(screen.getAllByText(/No driver assigned: 8/).length).toBeGreaterThan(0))
        expect(tele.getEventCounts.mock.calls[0][0]).not.toHaveProperty('categories')
        fireEvent.click(screen.getByRole('radio', { name: 'Speeding' }))
        await waitFor(() => expect(tele.getEventCounts).toHaveBeenCalledWith(expect.objectContaining({ categories: ['speeding'], group_by: 'driver' })))
        expect(names()).not.toContain('No driver assigned')
    })

    it('passes the filters where they apply and names where a card ignores them', async () => {
        query = 'vehicle_ids=3&driver_ids=5,6&cluster_ids=2'
        renderWithClient(<DriversV2 />)
        await waitFor(() => expect(tele.getEventCounts).toHaveBeenCalledWith(expect.objectContaining({ vehicle_ids: [3], driver_ids: [5, 6], cluster_ids: [2] })))
        const incidents = await screen.findByRole('region', { name: 'Incidents by driver' })
        expect(within(incidents).getByText('Whole fleet: the vehicle, cluster and driver filters are not applied')).toBeInTheDocument()
        await waitFor(() => expect(d.getDocumentExpiry).toHaveBeenCalledWith({ days: 30, driver_ids: [5, 6] }))
        const expiry = await screen.findByRole('region', { name: 'Document expiry: drivers and vehicles' })
        expect(within(expiry).getByText('Whole fleet: the vehicle and cluster filters are not applied')).toBeInTheDocument()
    })

    it('shows expired and expiring counts from the backend totals, the documents by expiry bucket, and who owns each', async () => {
        renderWithClient(<DriversV2 />)
        const card = await screen.findByRole('region', { name: 'Document expiry: drivers and vehicles' })
        await within(card).findByText('Expired')
        expect(within(card).getByText('1')).toBeInTheDocument() // 1 expired (driver) + 0 (vehicle)
        expect(within(card).getByText('3')).toBeInTheDocument() // 2 + 1 expiring
        const list = within(card).getByRole('region', { name: 'Documents by expiry date' })
        expect(within(list).getByText('Ada Obi')).toBeInTheDocument()
        expect(within(list).getByText('Expired 4 d ago')).toBeInTheDocument()
        expect(within(list).getByText('10 d left')).toBeInTheDocument()
    })

    it('says when the document list is cut, and when a renewed document might still show as expired', async () => {
        d.getDocumentExpiry.mockResolvedValue(docs([doc()], { truncated: true, limit: 200, superseded_filtered: false }))
        renderWithClient(<DriversV2 />)
        expect(await screen.findByText(/first 200 documents, soonest first/)).toBeInTheDocument()
        expect(screen.getByText(/renewed document may still show as expired/)).toBeInTheDocument()
    })

    it('shows incidents and inspections only when scrolled near, with inspections drawn as a day strip', async () => {
        renderWithClient(<DriversV2 />)
        expect(d.getDriverIncidents).not.toHaveBeenCalled()
        const card = await screen.findByRole('region', { name: 'Pre-trip inspections' })
        await within(card).findByText('Inspections')
        expect(within(card).getByText('1 driver, 1 with defects')).toBeInTheDocument()
        expect(within(card).getByRole('img', { name: 'Inspections per day' })).toBeInTheDocument()
    })

    it('tells a role without access on that card only', async () => {
        tele.getEventCounts.mockRejectedValue({ response: { status: 403, data: { errors: [{ code: 'ANALYTICS_ACCESS_DENIED' }] } } })
        renderWithClient(<DriversV2 />)
        const card = await screen.findByRole('region', { name: 'Alarms and events per driver' })
        expect(await within(card).findByText(/role does not have access/)).toBeInTheDocument()
        await waitFor(() => expect(names()[0]).toBe('Tunde Bello'))
    })

    it('has no table, no composite score, no workload buckets, no compliance donut and no distance', async () => {
        renderWithClient(<DriversV2 />)
        await screen.findByRole('region', { name: 'Pre-trip inspections' })
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
        expect(screen.queryByText(/score|scorecard|risk rank/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/workload/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/\bkm\b/i)).not.toBeInTheDocument()
    })
})

describe('Drivers tab: one driver', () => {
    it('becomes that driver’s page when exactly one driver is chosen', async () => {
        query = 'driver_ids=1'
        renderWithClient(<DriversV2 />)
        expect(await screen.findByRole('heading', { name: 'Ada Obi' })).toBeInTheDocument()
        expect(screen.getByText('active · Lagos')).toBeInTheDocument()
        expect(screen.queryByRole('region', { name: 'Incidents by driver' })).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Open driver profile/ })).toHaveAttribute('href', '/drivers/1')
    })

    it('stays a comparison when several drivers are chosen', async () => {
        query = 'driver_ids=1,2'
        renderWithClient(<DriversV2 />)
        expect(await screen.findByRole('region', { name: 'Incidents by driver' })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Ada Obi' })).not.toBeInTheDocument()
    })

    it('shows this driver’s trips, time, idle time, days, events and incidents from the backend', async () => {
        query = 'driver_ids=1'
        renderWithClient(<DriversV2 />)
        const card = await screen.findByRole('region', { name: 'This driver in the period' })
        await within(card).findByText('Trips')
        expect(within(card).getByText('4')).toBeInTheDocument()
        expect(within(card).getByText('1 h')).toBeInTheDocument()
        expect(within(card).getByText('10 min')).toBeInTheDocument()
        await waitFor(() => expect(within(card).getByText('5')).toBeInTheDocument()) // events: 5 for driver 1
        expect(d.getDriverTelemetry).toHaveBeenCalledWith(expect.objectContaining({ driver_ids: [1] }))
    })

    it('says so when the driver has no trips, instead of showing zeros', async () => {
        query = 'driver_ids=99'
        renderWithClient(<DriversV2 />)
        expect(await screen.findByText('No trips recorded for this driver in this period.')).toBeInTheDocument()
    })

    it('draws events over time, time per vehicle, the trip timeline, documents and inspections for that driver', async () => {
        query = 'driver_ids=1'
        renderWithClient(<DriversV2 />)
        expect(await screen.findByRole('region', { name: 'Alarms and events over time' })).toBeInTheDocument()
        await waitFor(() => expect(screen.getByRole('img', { name: 'Events per period by category' })).toBeInTheDocument())
        const usage = await screen.findByRole('region', { name: 'Time in each vehicle' })
        expect(await within(usage).findByText('ABC-123')).toBeInTheDocument()
        expect(await screen.findByRole('region', { name: 'Trip timeline' })).toBeInTheDocument()
        await waitFor(() => expect(d.getDocumentExpiry).toHaveBeenCalledWith({ days: 30, driver_ids: [1] }))
        expect(await screen.findByRole('img', { name: 'Inspections per day' })).toBeInTheDocument()
    })

    it('goes back to all drivers by clearing the driver filter', async () => {
        query = 'driver_ids=1&filter=7d'
        renderWithClient(<DriversV2 />)
        fireEvent.click(await screen.findByRole('button', { name: /All drivers/ }))
        expect(replace).toHaveBeenCalledWith('/analytics/drivers?filter=7d', { scroll: false })
    })

    it('has one driver dropdown, in the filter bar, and choosing a driver there opens that driver’s page', async () => {
        renderWithClient(<DriversV2 />)
        expect(screen.queryByRole('button', { name: 'Look at one driver' })).not.toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /^Drivers filter/ })).toHaveLength(1)
        fireEvent.click(screen.getByRole('button', { name: /^Drivers filter/ }))
        fireEvent.click(await screen.findByText('Tunde Bello'))
        expect(replace).toHaveBeenCalledWith('/analytics/drivers?driver_ids=2', { scroll: false })
    })
})
