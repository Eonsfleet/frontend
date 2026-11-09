import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithClient } from './helpers'

let query = ''
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/analytics/incidents',
    useSearchParams: () => new URLSearchParams(query),
}))
vi.mock('recharts', async (importOriginal) => {
    const real = await importOriginal<typeof import('recharts')>()
    return { ...real, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }
})

const overview = vi.hoisted(() => ({ getIncidentSummary: vi.fn(), getIncidentsOverTime: vi.fn() }))
vi.mock('@/lib/api/analyticsOverview', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/analyticsOverview')>()), ...overview }))
const inc = vi.hoisted(() => ({ getIncidentTypes: vi.fn(), getIncidentPriorities: vi.fn(), getIncidentResolution: vi.fn(), getIncidentVehicles: vi.fn(), INCIDENT_VEHICLE_LIMIT: 10 }))
vi.mock('@/lib/api/analyticsIncidents', () => inc)

import { IncidentsV2 } from '@/components/analytics/incidents/IncidentsV2'

const summary = (over = {}) => ({ total: 20, open: 8, resolved: 6, closed: 3, dismissed: 1, escalated: 2, ...over })
const mocks = () => [...Object.values({ a: overview.getIncidentSummary, b: overview.getIncidentsOverTime, c: inc.getIncidentTypes, d: inc.getIncidentPriorities, e: inc.getIncidentResolution, f: inc.getIncidentVehicles })]

beforeEach(() => {
    query = ''
    mocks().forEach((fn) => fn.mockReset())
    overview.getIncidentSummary.mockResolvedValue(summary())
    overview.getIncidentsOverTime.mockResolvedValue({ labels: ['2026-11-01', '2026-11-03'], data: [2, 5], chart_type: 'line' })
    inc.getIncidentTypes.mockResolvedValue([{ type: 'accident', count: 9 }, { type: null, count: 2 }])
    inc.getIncidentPriorities.mockResolvedValue([{ priority: 'high', count: 7 }, { priority: 'low', count: 4 }])
    inc.getIncidentResolution.mockResolvedValue({ overall_avg_days: 3.456, by_type: [{ type: 'accident', avg_days: 5.2, count: 4 }, { type: 'theft', avg_days: null, count: 1 }] })
    inc.getIncidentVehicles.mockResolvedValue([{ vehicle_id: 7, registration_number: 'ABC-123', make: 'Toyota', model: 'Hilux', incident_count: 6 }, { vehicle_id: 8, registration_number: null, make: null, model: null, incident_count: 2 }])
})

describe('Incidents tab', () => {
    it('shows the status counts, and the share that is cancelled is what is left of the total', async () => {
        renderWithClient(<IncidentsV2 />)
        const card = await screen.findByRole('region', { name: 'Incidents by status' })
        await within(card).findByText('Total')
        expect(within(card).getAllByText('20').length).toBeGreaterThan(0) // the KPI and the donut centre
        expect(within(card).getByText('Includes escalated')).toBeInTheDocument()
        // 20 total - 8 open - 6 resolved - 3 closed - 1 dismissed = 2 cancelled
        const legend = within(card).getByRole('img', { name: 'Incidents by status' }).parentElement!
        expect(legend).toHaveTextContent('Cancelled')
        expect(within(legend).getByText('Cancelled').closest('li')).toHaveTextContent('2')
        expect(within(card).getByRole('link', { name: 'Open all incidents' })).toHaveAttribute('href', '/incidents')
    })

    it('leaves a status with none out of the donut', async () => {
        overview.getIncidentSummary.mockResolvedValue(summary({ total: 14, open: 8, resolved: 6, closed: 0, dismissed: 0, escalated: 0 }))
        renderWithClient(<IncidentsV2 />)
        const card = await screen.findByRole('region', { name: 'Incidents by status' })
        await within(card).findByText('Total')
        expect(within(card).queryByText('Cancelled')).not.toBeInTheDocument()
        expect(within(card).queryByText('Dismissed')).not.toBeInTheDocument()
    })

    it('shows an empty state when there are no incidents at all', async () => {
        overview.getIncidentSummary.mockResolvedValue(summary({ total: 0, open: 0, resolved: 0, closed: 0, dismissed: 0, escalated: 0 }))
        renderWithClient(<IncidentsV2 />)
        expect(await screen.findByText('No incidents recorded.')).toBeInTheDocument()
    })

    it('sends the period to the over-time chart, and nowhere else', async () => {
        query = 'filter=90d'
        renderWithClient(<IncidentsV2 />)
        await waitFor(() => expect(overview.getIncidentsOverTime).toHaveBeenCalledWith('90d'))
        await waitFor(() => expect(inc.getIncidentVehicles).toHaveBeenCalled())
        // The all-time endpoints are asked without the period.
        expect(inc.getIncidentTypes).toHaveBeenCalled()
        expect(overview.getIncidentSummary).toHaveBeenCalled()
        expect(JSON.stringify([inc.getIncidentTypes.mock.calls, overview.getIncidentSummary.mock.calls, inc.getIncidentVehicles.mock.calls])).not.toContain('90d')
        expect(await screen.findByText('Periods with no incidents are not shown.')).toBeInTheDocument()
    })

    it('refuses a period the endpoint cannot serve for the trend, while the all-time cards still show', async () => {
        query = 'filter=60d'
        renderWithClient(<IncidentsV2 />)
        expect(await screen.findByText(/7 days, 30 days, 90 days or 12 months/)).toBeInTheDocument()
        expect(overview.getIncidentsOverTime).not.toHaveBeenCalled()
        const status = await screen.findByRole('region', { name: 'Incidents by status' })
        expect(await within(status).findByText('Total')).toBeInTheDocument()
    })

    it('offers only the periods the trend can serve, and no entity filters the backend ignores', async () => {
        renderWithClient(<IncidentsV2 />)
        const select = (await screen.findByLabelText('Period')) as HTMLSelectElement
        expect([...select.options].map((o) => o.value)).toEqual(['7d', '30d', '90d', '1y'])
        expect(screen.queryByRole('button', { name: /Drivers filter/ })).not.toBeInTheDocument()
    })

    it('says which cards are all-time', async () => {
        renderWithClient(<IncidentsV2 />)
        const types = await screen.findByRole('region', { name: 'Incidents by type' })
        expect(within(types).getByText('All time')).toBeInTheDocument()
        const status = await screen.findByRole('region', { name: 'Incidents by status' })
        expect(within(status).getByText('All time')).toBeInTheDocument()
    })

    it('draws type and priority as donuts, naming a missing value "Unspecified"', async () => {
        renderWithClient(<IncidentsV2 />)
        const types = await screen.findByRole('region', { name: 'Incidents by type' })
        expect(await within(types).findByText('Accident')).toBeInTheDocument()
        expect(within(types).getByText('Unspecified')).toBeInTheDocument()
        const priorities = await screen.findByRole('region', { name: 'Incidents by priority' })
        expect(await within(priorities).findByText('High')).toBeInTheDocument()
    })
})

describe('resolution and vehicles', () => {
    it('shows the average and the by-type bars, and says plainly that it is time to the last update, not to resolution', async () => {
        renderWithClient(<IncidentsV2 />)
        const card = await screen.findByRole('region', { name: 'Time from report to last update' })
        expect(await within(card).findByText('3.5 days')).toBeInTheDocument()
        expect(within(card).getByText(/The system keeps no resolved date/)).toBeInTheDocument()
        expect(within(card).getByText(/Accident: 5.2 days/)).toBeInTheDocument()
        // A type with no average is left out; the bars are not links.
        expect(within(card).queryByText(/Theft/)).not.toBeInTheDocument()
        expect(within(card).queryAllByRole('link', { hidden: true }).filter((a) => a.getAttribute('href')?.startsWith('/vehicles'))).toHaveLength(0)
    })

    it('says nothing has been resolved yet instead of showing 0 days', async () => {
        inc.getIncidentResolution.mockResolvedValue({ overall_avg_days: null, by_type: [] })
        renderWithClient(<IncidentsV2 />)
        expect(await screen.findByText('No incident has been resolved or closed yet.')).toBeInTheDocument()
    })

    it('ranks vehicles by incidents and opens the vehicle from a bar, naming one without a plate', async () => {
        renderWithClient(<IncidentsV2 />)
        const card = await screen.findByRole('region', { name: 'Vehicles with the most incidents' })
        await waitFor(() => expect(within(card).getByText('ABC-123')).toBeInTheDocument())
        expect(within(card).getByText('ABC-123')).toHaveAttribute('href', '/vehicles/7')
        expect(within(card).getByText('Vehicle 8')).toHaveAttribute('href', '/vehicles/8')
    })

    it('does not ask for the lower cards until they are scrolled near', async () => {
        renderWithClient(<IncidentsV2 />)
        expect(inc.getIncidentResolution).not.toHaveBeenCalled()
        expect(inc.getIncidentVehicles).not.toHaveBeenCalled()
        await waitFor(() => expect(inc.getIncidentResolution).toHaveBeenCalled())
    })
})

describe('failures and what is left out', () => {
    it('tells a role without access on that card, and still shows the others', async () => {
        overview.getIncidentsOverTime.mockRejectedValue({ response: { status: 403, data: { errors: [{ code: 'ANALYTICS_ACCESS_DENIED' }] } } })
        renderWithClient(<IncidentsV2 />)
        const trend = await screen.findByRole('region', { name: 'Incidents over time' })
        expect(await within(trend).findByText(/role does not have access/)).toBeInTheDocument()
        const status = await screen.findByRole('region', { name: 'Incidents by status' })
        expect(await within(status).findByText('Total')).toBeInTheDocument()
    })

    it('shows a failed load as an error, never as zero', async () => {
        overview.getIncidentSummary.mockRejectedValue({ response: { status: 500, data: {} } })
        renderWithClient(<IncidentsV2 />)
        await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0), { timeout: 4000 })
        const status = screen.getByRole('region', { name: 'Incidents by status' })
        expect(within(status).queryByText('Total')).not.toBeInTheDocument()
    })

    it('has no table', async () => {
        renderWithClient(<IncidentsV2 />)
        await screen.findByRole('region', { name: 'Vehicles with the most incidents' })
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
})
