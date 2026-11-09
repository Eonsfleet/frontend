import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { filtersFrom, httpError, renderWithClient } from './helpers'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/analytics',
    useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/echo', () => ({ getEcho: () => null }))

const api = vi.hoisted(() => ({
    getFleetHealthScore: vi.fn(), getVehicleStatus: vi.fn(), getDeviceStatus: vi.fn(), getActiveAlerts: vi.fn(),
    detectAnomalies: vi.fn(), getIncidentSummary: vi.fn(), getIncidentsOverTime: vi.fn(), getTripCounts: vi.fn(),
}))
vi.mock('@/lib/api/analyticsOverview', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/analyticsOverview')>()), ...api }))
const telemetry = vi.hoisted(() => ({ getEventCounts: vi.fn(), getEventTrend: vi.fn() }))
vi.mock('@/lib/api/telemetryReports', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/telemetryReports')>()), ...telemetry }))
vi.mock('@/lib/api/reports', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/reports')>()), getReportCatalog: vi.fn().mockResolvedValue([]) }))

import { KpiCard, Delta, percentChange } from '@/components/analytics/kit/KpiCard'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { HealthPanel } from '@/components/analytics/overview/HealthPanel'
import { AlertsPanel, alertHref } from '@/components/analytics/overview/AlertsPanel'
import { FleetStatusTile } from '@/components/analytics/overview/StatusTiles'
import { AlarmsPanel } from '@/components/analytics/overview/AlarmsPanel'
import { evaluateWidget } from '@/lib/analytics/applicability'
import { useAuthStore } from '@/store/authStore'

const health = (over = {}) => ({
    score: 72, rating: 'good', total_vehicles: 20, computed_at: '2026-11-03T09:00:00Z',
    components: { vehicle_active_rate: 80, maintenance_compliance: 70, incident_free_rate: 90, fuel_efficiency_score: 100 }, ...over,
})

beforeEach(() => Object.values({ ...api, ...telemetry }).forEach((fn) => fn.mockReset()))

describe('KPI figures', () => {
    it('shows a dash for a figure that was not measured, never 0', () => {
        const { rerender } = renderWithClient(<KpiCard label="Trips" value={null} />)
        expect(screen.getByText('—')).toBeInTheDocument()
        rerender(<KpiCard label="Trips" value="0" />)
        expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('computes the change only when both periods exist and the base is not zero', () => {
        expect(percentChange(150, 100)).toBe(50)
        expect(percentChange(5, 0)).toBeNull()
        expect(percentChange(null, 10)).toBeNull()
    })

    it('says "No previous figure" rather than inventing a delta, and colors by what a rise means', () => {
        const { rerender, container } = renderWithClient(<Delta change={null} rise="bad" />)
        expect(screen.getByText('No previous figure')).toBeInTheDocument()
        rerender(<Delta change={20} rise="bad" />)
        expect(container.querySelector('.text-an-bad')).not.toBeNull()
        rerender(<Delta change={-20} rise="bad" />)
        expect(container.querySelector('.text-an-good')).not.toBeNull()
    })
})

describe('widget frame states', () => {
    const ok = evaluateWidget('alarms', filtersFrom('filter=7d'))
    const idle = { isPending: false, isError: false, error: null, refetch: vi.fn() }

    it('shows a range the widget cannot serve as unavailable, with the reason, and no data', () => {
        renderWithClient(<WidgetFrame title="Alarms" evaluation={evaluateWidget('alarms', filtersFrom('filter=1y'))} query={idle}><p>DATA</p></WidgetFrame>)
        expect(screen.getByText(/only kept for 60 days/)).toBeInTheDocument()
        expect(screen.queryByText('DATA')).not.toBeInTheDocument()
    })

    it('shows loading, and then neither data nor zeros', () => {
        renderWithClient(<WidgetFrame title="Alarms" evaluation={ok} query={{ ...idle, isPending: true }}><p>DATA</p></WidgetFrame>)
        expect(screen.getByRole('status', { name: 'Loading Alarms' })).toBeInTheDocument()
        expect(screen.queryByText('DATA')).not.toBeInTheDocument()
    })

    it('shows a failure to load as an error with a retry, never as an empty or zero card', () => {
        const refetch = vi.fn()
        renderWithClient(<WidgetFrame title="Alarms" evaluation={ok} query={{ ...idle, isError: true, error: httpError(500), refetch }}><p>DATA</p></WidgetFrame>)
        expect(screen.getByRole('alert')).toHaveTextContent(/Could not load/)
        fireEvent.click(screen.getByRole('button', { name: /Retry/ }))
        expect(refetch).toHaveBeenCalled()
        expect(screen.queryByText('DATA')).not.toBeInTheDocument()
    })

    it('explains a role denial, a missing plan module and a payment block in their own words', () => {
        const { rerender } = renderWithClient(<WidgetFrame title="A" evaluation={ok} query={{ ...idle, isError: true, error: httpError(403, 'ANALYTICS_ACCESS_DENIED') }}>x</WidgetFrame>)
        expect(screen.getByText(/role does not have access/)).toBeInTheDocument()
        rerender(<WidgetFrame title="A" evaluation={ok} query={{ ...idle, isError: true, error: httpError(403, 'MODULE_NOT_IN_PLAN') }}>x</WidgetFrame>)
        expect(screen.getByText(/not included in your current plan/)).toBeInTheDocument()
        rerender(<WidgetFrame title="A" evaluation={ok} query={{ ...idle, isError: true, error: httpError(402) }}>x</WidgetFrame>)
        expect(screen.getByText(/paused until the outstanding payment/)).toBeInTheDocument()
    })

    it('shows "no data" as its own state', () => {
        renderWithClient(<WidgetFrame title="A" evaluation={ok} query={idle} isEmpty emptyText="Nothing here.">DATA</WidgetFrame>)
        expect(screen.getByText('Nothing here.')).toBeInTheDocument()
    })

    it('names a filter the card did not apply, instead of implying it did', () => {
        renderWithClient(<WidgetFrame title="Status" evaluation={evaluateWidget('fleet-status', filtersFrom('vehicle_ids=3'))} query={idle}>DATA</WidgetFrame>)
        expect(screen.getByText('Whole fleet: the vehicle filter is not applied')).toBeInTheDocument()
    })

    it('puts secondary actions in the overflow menu, not on the card face', () => {
        renderWithClient(<WidgetFrame title="A" evaluation={ok} query={idle} actions={<div>Export</div>}>DATA</WidgetFrame>)
        expect(screen.queryByText('Export')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'A: more actions' })).toBeInTheDocument()
    })
})

describe('fleet health', () => {
    it('shows the four factors as returned and keeps the overall score out until it is trustworthy', async () => {
        api.getFleetHealthScore.mockResolvedValue(health())
        renderWithClient(<HealthPanel filters={filtersFrom()} />)
        expect(await screen.findByText('Vehicles in service')).toBeInTheDocument()
        expect(screen.getByRole('meter', { name: 'Fuel efficiency' })).toHaveAttribute('aria-valuenow', '100')
        expect(screen.getByText(/overall score will appear here/)).toBeInTheDocument()
        expect(screen.queryByText('72')).not.toBeInTheDocument()
        expect(screen.getByText(/Completed schedules are currently counted as overdue/)).toBeInTheDocument()
    })

    it('shows an empty fleet as empty, not as the score the backend gives it', async () => {
        api.getFleetHealthScore.mockResolvedValue(health({ total_vehicles: 0, score: 70 }))
        renderWithClient(<HealthPanel filters={filtersFrom()} />)
        expect(await screen.findByText(/No vehicles yet/)).toBeInTheDocument()
        expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    })

    it('tells a user without insights access so, and shows no factors', async () => {
        api.getFleetHealthScore.mockRejectedValue(httpError(403, 'ANALYTICS_ACCESS_DENIED'))
        renderWithClient(<HealthPanel filters={filtersFrom()} />)
        expect(await screen.findByText(/role does not have access/)).toBeInTheDocument()
    })
})

describe('active alerts', () => {
    const alert = (id: string, type: string, severity: string) => ({ id, type, severity, title: `T ${id}`, description: null, vehicle_id: 1, vehicle_registration: 'ABC-123', created_at: '2026-11-03T08:00:00Z', meta: {} })

    it('links each alert to where it is handled', () => {
        expect(alertHref(alert('incident-12', 'incident', 'critical') as never)).toBe('/incidents/12')
        expect(alertHref(alert('maintenance-4', 'maintenance_alert', 'warning') as never)).toBe('/maintenance/alerts')
        expect(alertHref(alert('fuel-9', 'fuel_alert', 'critical') as never)).toBe('/fuel/alerts')
        expect(alertHref(alert('incident-x', 'incident', 'critical') as never)).toBeNull()
    })

    it('lists the first five, counts the critical ones, and expands on request', async () => {
        api.getActiveAlerts.mockResolvedValue(Array.from({ length: 8 }, (_, i) => alert(`fuel-${i}`, 'fuel_alert', i < 2 ? 'critical' : 'warning')))
        renderWithClient(<AlertsPanel filters={filtersFrom()} />)
        expect(await screen.findByText('2 critical')).toBeInTheDocument()
        expect(screen.getAllByRole('listitem')).toHaveLength(5)
        fireEvent.click(screen.getByRole('button', { name: 'Show all 8' }))
        expect(screen.getAllByRole('listitem')).toHaveLength(8)
    })

    it('says nothing needs attention when there are no alerts', async () => {
        api.getActiveAlerts.mockResolvedValue([])
        renderWithClient(<AlertsPanel filters={filtersFrom()} />)
        expect(await screen.findByText(/No active alerts/)).toBeInTheDocument()
    })
})

describe('fleet status', () => {
    it('shows the backend counts and names the connection state without live updates', async () => {
        useAuthStore.setState({ token: 'tok', organization: { id: '1', attributes: { identifier: 'org-7' } } as never })
        api.getVehicleStatus.mockResolvedValue({ total: 5, distribution: [{ status: 'in_transit', count: 3, percentage: 60 }, { status: 'active', count: 2, percentage: 40 }] })
        renderWithClient(<FleetStatusTile filters={filtersFrom()} />)
        expect(await screen.findByText('In transit')).toBeInTheDocument()
        expect(screen.getByText('Live updates unavailable')).toBeInTheDocument()
    })
})

describe('alarms and events', () => {
    beforeEach(() => telemetry.getEventTrend.mockResolvedValue({ data: [{ period: '2026-11-01', total: 4, by_category: {} }, { period: '2026-11-02', total: 6, by_category: {} }], meta: {}, extra: { interval: 'day' } }))
    const counts = (totals: number[]) => ({ data: totals.map((total, i) => ({ key: i, label: `cat${i}`, total, by_kind: {} })), meta: { partial: false, from: '', to: '' }, extra: { group_by: 'category' } })

    it('totals the categories and compares with the previous period only when asked and possible', async () => {
        telemetry.getEventCounts.mockImplementation(async (p: { start_date?: string }) => (p.start_date ? counts([5, 5]) : counts([8, 7])))
        renderWithClient(<AlarmsPanel filters={filtersFrom('filter=7d&compare=prev')} />)
        expect(await screen.findByText('15')).toBeInTheDocument()
        expect(await screen.findByText('10 in the previous period')).toBeInTheDocument()
        expect(screen.getByText(/50% ?/)).toBeInTheDocument()
    })

    it('does not call the backend for a range it cannot serve, and says so', async () => {
        renderWithClient(<AlarmsPanel filters={filtersFrom('filter=1y')} />)
        expect(await screen.findByText(/only kept for 60 days/)).toBeInTheDocument()
        expect(telemetry.getEventCounts).not.toHaveBeenCalled()
    })

    it('says when the window kept by the backend cuts the period short', async () => {
        telemetry.getEventCounts.mockResolvedValue({ ...counts([3]), meta: { partial: true, available_from: '2026-09-04T00:00:00+01:00', from: '2026-09-04T00:00:00+01:00', to: '' } })
        renderWithClient(<AlarmsPanel filters={filtersFrom('start_date=2026-09-20&end_date=2026-10-30')} />)
        await waitFor(() => expect(screen.getByText(/earlier days are missing/)).toBeInTheDocument())
    })
})

describe('card styling', () => {
    it('draws cards with a border only, no shadow', () => {
        const idle = { isPending: false, isError: false, error: null, refetch: vi.fn() }
        const { container } = renderWithClient(
            <WidgetFrame title="A" evaluation={evaluateWidget('alarms', filtersFrom('filter=7d'))} query={idle}>
                <KpiCard label="x" value="1" />
            </WidgetFrame>,
        )
        expect(container.innerHTML).not.toMatch(/shadow/)
    })
})

describe('alarms and events as one card', () => {
    const counts = (totals: number[]) => ({ data: totals.map((total, i) => ({ key: i, label: `cat_${i}`, total, by_kind: {} })), meta: { partial: false, from: '', to: '' }, extra: { group_by: 'category' } })
    const trend = (interval: 'day' | 'week' = 'day') => ({ data: [{ period: '2026-11-01', total: 4, by_category: {} }], meta: {}, extra: { interval } })

    it('holds the total, the events-per-day chart and the category list together, with no separate chart card', async () => {
        telemetry.getEventCounts.mockResolvedValue(counts([9, 5]))
        telemetry.getEventTrend.mockResolvedValue(trend('day'))
        renderWithClient(<AlarmsPanel filters={filtersFrom('filter=7d')} />)
        const card = await screen.findByRole('region', { name: 'Alarms and events' })
        expect(await within(card).findByText('14')).toBeInTheDocument() // 9 + 5
        expect(await within(card).findByText('Events per day')).toBeInTheDocument()
        expect(within(card).getByText('By category')).toBeInTheDocument()
        expect(screen.queryAllByRole('region', { name: /Events per/ })).toHaveLength(0)
    })

    it('names the chart per week when the backend groups by week', async () => {
        telemetry.getEventCounts.mockResolvedValue(counts([9]))
        telemetry.getEventTrend.mockResolvedValue(trend('week'))
        renderWithClient(<AlarmsPanel filters={filtersFrom('filter=30d')} />)
        expect(await screen.findByText('Events per week')).toBeInTheDocument()
    })

    it('lists every category in a scrollable box inside the card, not just the top few', async () => {
        telemetry.getEventCounts.mockResolvedValue(counts([1, 2, 3, 4, 5, 6, 7, 8]))
        telemetry.getEventTrend.mockResolvedValue(trend())
        renderWithClient(<AlarmsPanel filters={filtersFrom('filter=7d')} />)
        const box = await screen.findByRole('region', { name: 'Alarms and events by category' })
        expect(box.className).toMatch(/overflow-y-auto/)
        expect(box.className).toMatch(/max-h-/)
        expect(box).toHaveAttribute('tabindex', '0')
        const items = within(box).getAllByRole('listitem')
        expect(items).toHaveLength(8)
        expect(items[0]).toHaveTextContent('Cat 7') // largest first
    })

    it('shows a failed chart as a message inside the card while the totals still show', async () => {
        telemetry.getEventCounts.mockResolvedValue(counts([3]))
        telemetry.getEventTrend.mockRejectedValue({ response: { status: 500, data: {} } })
        renderWithClient(<AlarmsPanel filters={filtersFrom('filter=7d')} />)
        const card = await screen.findByRole('region', { name: 'Alarms and events' })
        expect((await within(card).findAllByText('3')).length).toBeGreaterThan(0)
        await waitFor(() => expect(screen.getByText('Could not load the daily chart.')).toBeInTheDocument(), { timeout: 4000 })
    })

    it('does not ask for the chart when the range cannot be served', async () => {
        renderWithClient(<AlarmsPanel filters={filtersFrom('filter=1y')} />)
        expect(await screen.findByText(/only kept for 60 days/)).toBeInTheDocument()
        expect(telemetry.getEventTrend).not.toHaveBeenCalled()
    })
})

describe('fleet health with the corrected backend', () => {
    const fixed = (over = {}) => ({
        score: 72.4, rating: 'good', status: 'ok', total_vehicles: 20, computed_at: '2026-11-03T09:00:00Z',
        components: { vehicle_active_rate: 80, maintenance_compliance: 70, incident_free_rate: 90, fuel_efficiency_score: 55 },
        missing: [], weights: { vehicle_active_rate: 0.3, maintenance_compliance: 0.3, incident_free_rate: 0.2, fuel_efficiency_score: 0.2 }, ...over,
    })

    it('shows the overall score and its rating when the backend says every factor had data, and states the weights it gave', async () => {
        api.getFleetHealthScore.mockResolvedValue(fixed())
        renderWithClient(<HealthPanel filters={filtersFrom()} />)
        expect(await screen.findByText('72')).toBeInTheDocument()
        expect(screen.getByText('Good')).toBeInTheDocument()
        expect(screen.getByText(/weights the four factors 30%, 30%, 20% and 20%/)).toBeInTheDocument()
        // The old-backend caveats no longer apply.
        expect(screen.queryByText(/Completed schedules are currently counted as overdue/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Reads 100 when there is no fuel data/)).not.toBeInTheDocument()
    })

    it('shows "No data" for a factor the backend could not measure, draws no bar for it, and shows no overall score', async () => {
        api.getFleetHealthScore.mockResolvedValue(fixed({
            score: null, rating: null, status: 'insufficient_data', missing: ['fuel_efficiency_score'],
            components: { vehicle_active_rate: 80, maintenance_compliance: 70, incident_free_rate: 90, fuel_efficiency_score: null },
        }))
        renderWithClient(<HealthPanel filters={filtersFrom()} />)
        expect(await screen.findByText('No data')).toBeInTheDocument()
        expect(screen.queryByRole('meter', { name: 'Fuel efficiency' })).not.toBeInTheDocument()
        expect(screen.getAllByRole('meter')).toHaveLength(3)
        expect(screen.getByText(/No overall score yet: there is no data for fuel efficiency/)).toBeInTheDocument()
        expect(screen.queryByText('out of 100')).not.toBeInTheDocument()
    })

    it('treats an empty fleet as empty', async () => {
        api.getFleetHealthScore.mockResolvedValue(fixed({
            score: null, rating: null, status: 'empty_fleet', total_vehicles: 0, missing: ['vehicle_active_rate', 'maintenance_compliance', 'incident_free_rate', 'fuel_efficiency_score'],
            components: { vehicle_active_rate: null, maintenance_compliance: null, incident_free_rate: null, fuel_efficiency_score: null },
        }))
        renderWithClient(<HealthPanel filters={filtersFrom()} />)
        expect(await screen.findByText(/No vehicles yet/)).toBeInTheDocument()
        expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    })

    it('still withholds the score from an older backend that sends no status', async () => {
        api.getFleetHealthScore.mockResolvedValue({ score: 72, rating: 'good', total_vehicles: 20, computed_at: '2026-11-03T09:00:00Z', components: { vehicle_active_rate: 80, maintenance_compliance: 70, incident_free_rate: 90, fuel_efficiency_score: 100 } })
        renderWithClient(<HealthPanel filters={filtersFrom()} />)
        expect(await screen.findByText('Vehicles in service')).toBeInTheDocument()
        expect(screen.queryByText('out of 100')).not.toBeInTheDocument()
        expect(screen.getByText(/Completed schedules are currently counted as overdue/)).toBeInTheDocument()
    })
})
