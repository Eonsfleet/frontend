import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithClient } from './helpers'

let query = ''
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/analytics/maintenance',
    useSearchParams: () => new URLSearchParams(query),
}))
vi.mock('recharts', async (importOriginal) => {
    const real = await importOriginal<typeof import('recharts')>()
    return { ...real, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }
})
const m = vi.hoisted(() => ({ getScheduleSummary: vi.fn(), getMaintenanceCost: vi.fn(), getMaintenanceWorkflow: vi.fn(), getWorkshopSummary: vi.fn(), getMaintenanceDue: vi.fn() }))
vi.mock('@/lib/api/analyticsMaintenance', () => m)

import { MaintenanceV2, bucketDue } from '@/components/analytics/maintenance/MaintenanceV2'
import { nairaFromKobo } from '@/lib/analytics/money'

const due = (id: number, plate: string | null, days: number, title: string | null = 'oil_change') => ({
    schedule_id: id, title, due_date: '2026-11-20', days_until_due: days, expected_odometer: null,
    vehicle: plate ? { id: id + 100, registration_number: plate, make: null, model: null } : null,
})

beforeEach(() => {
    query = ''
    Object.values(m).forEach((fn) => fn.mockReset())
    m.getScheduleSummary.mockResolvedValue({ total: 20, overdue: 3, upcoming_14d: 4, current: 13 })
    m.getMaintenanceDue.mockResolvedValue({ upcoming_count: 4, overdue_count: 3, upcoming: [due(1, 'ABC-1', 2), due(2, 'XYZ-2', 9), due(3, null, 18), due(4, 'DEF-4', 28, null)] })
    m.getMaintenanceCost.mockResolvedValue({
        total_cost_kobo: 5_000_000, period: { start: '2026-10-04', end: '2026-11-03' },
        trend: [{ period: '2026-10-10', total_kobo: 2_000_000, jobs_count: 2 }, { period: '2026-10-20', total_kobo: 3_000_000, jobs_count: 1 }],
        by_vehicle: [{ vehicle_id: 7, registration_number: 'ABC-123', total_kobo: 3_500_000, jobs_count: 2 }, { vehicle_id: 8, registration_number: null, total_kobo: 1_500_000, jobs_count: 1 }],
    })
    m.getMaintenanceWorkflow.mockResolvedValue({ by_status: [{ status: 'in_progress', count: 4 }, { status: 'closed', count: 9 }, { status: 'draft', count: 0 }], avg_turnaround_days: 2.34 })
    m.getWorkshopSummary.mockResolvedValue({ total_jobs: 15, in_progress: 4, pending_verification: 2, closed: 9, total_cost_kobo: 12_345_600, avg_vendor_rating: 4.25 })
})

describe('naira display', () => {
    it('shows kobo as naira, and a missing amount as a dash', () => {
        expect(nairaFromKobo(5_000_000)).toBe('₦50,000')
        expect(nairaFromKobo(12_345_600)).toBe('₦123,456')
        expect(nairaFromKobo(0)).toBe('₦0')
        expect(nairaFromKobo(null)).toBe('—')
        expect(nairaFromKobo(undefined)).toBe('—')
    })

    it('groups schedules due soon into weeks without losing any', () => {
        const rows = [due(1, 'A', 0), due(2, 'A', 7), due(3, 'A', 8), due(4, 'A', 21), due(5, 'A', 22), due(6, 'A', 30)] as never
        expect(bucketDue(rows)).toEqual([
            { bucket: 'Within 7 days', schedules: 2 },
            { bucket: '8 to 14 days', schedules: 1 },
            { bucket: '15 to 21 days', schedules: 1 },
            { bucket: '22 to 30 days', schedules: 2 },
        ])
    })
})

describe('Maintenance tab', () => {
    it('shows schedules by due date, and names the rest "on schedule or finished"', async () => {
        renderWithClient(<MaintenanceV2 />)
        const card = await screen.findByRole('region', { name: 'Maintenance schedules' })
        await within(card).findByText('Schedules')
        expect(within(card).getAllByText('20').length).toBeGreaterThan(0)
        expect(within(card).getByText('On schedule or finished')).toBeInTheDocument()
        expect(within(card).getAllByText('Overdue')).toHaveLength(2) // the KPI and the donut legend
        expect(within(card).getByText('Open schedules; finished ones are not overdue')).toBeInTheDocument()
        // The backend's "compliance_rate" is not a measure of being on schedule, so it is not shown.
        expect(screen.queryByText(/compliance/i)).not.toBeInTheDocument()
    })

    it('shows an empty state when there are no schedules', async () => {
        m.getScheduleSummary.mockResolvedValue({ total: 0, overdue: 0, upcoming_14d: 0, current: 0 })
        renderWithClient(<MaintenanceV2 />)
        expect(await screen.findByText('No maintenance schedules yet.')).toBeInTheDocument()
    })

    it('lists what is due soon in a scrolling box, soonest first, naming a vehicle it does not know', async () => {
        renderWithClient(<MaintenanceV2 />)
        const list = await screen.findByRole('region', { name: 'Schedules due soon' })
        expect(list.className).toMatch(/overflow-y-auto/)
        expect(list).toHaveAttribute('tabindex', '0')
        const rows = within(list).getAllByRole('listitem')
        expect(rows).toHaveLength(4)
        expect(rows[0]).toHaveTextContent('ABC-1')
        expect(rows[0]).toHaveTextContent('Oil change')
        expect(rows[0]).toHaveTextContent('In 2 d')
        expect(rows[2]).toHaveTextContent('Vehicle')
        expect(rows[3]).toHaveTextContent('Unspecified')
    })

    it('says when the due list is cut', async () => {
        m.getMaintenanceDue.mockResolvedValue({ upcoming_count: 80, overdue_count: 0, upcoming: [due(1, 'ABC-1', 2)] })
        renderWithClient(<MaintenanceV2 />)
        expect(await screen.findByText('Showing the first 1 of 80.')).toBeInTheDocument()
    })

    it('tells a role without the insights permission so on that card only, while the others still show', async () => {
        m.getMaintenanceDue.mockRejectedValue({ response: { status: 403, data: { errors: [{ code: 'ANALYTICS_ACCESS_DENIED' }] } } })
        renderWithClient(<MaintenanceV2 />)
        const card = await screen.findByRole('region', { name: 'Maintenance due in the next 30 days' })
        expect(await within(card).findByText(/role does not have access/)).toBeInTheDocument()
        const schedules = await screen.findByRole('region', { name: 'Maintenance schedules' })
        expect(await within(schedules).findByText('Schedules')).toBeInTheDocument()
    })
})

describe('maintenance cost', () => {
    it('shows the cost in naira from kobo, sends the period, and says what the figure covers', async () => {
        query = 'filter=90d'
        renderWithClient(<MaintenanceV2 />)
        const card = await screen.findByRole('region', { name: 'Maintenance cost over time' })
        expect(await within(card).findByText('₦50,000')).toBeInTheDocument()
        expect(m.getMaintenanceCost).toHaveBeenCalledWith('90d')
        expect(within(card).getByText(/Closed jobs only, counted in the period of their last update/)).toBeInTheDocument()
        expect(within(card).getByText(/2026-10-10: ₦20,000, 2 jobs/)).toBeInTheDocument()
    })

    it('refuses a period the report cannot serve instead of using another', async () => {
        query = 'filter=60d'
        renderWithClient(<MaintenanceV2 />)
        expect((await screen.findAllByText(/7 days, 30 days, 90 days or 12 months/)).length).toBeGreaterThan(0)
        expect(m.getMaintenanceCost).not.toHaveBeenCalled()
    })

    it('says there is nothing to show instead of ₦0 when no closed job had a cost', async () => {
        m.getMaintenanceCost.mockResolvedValue({ total_cost_kobo: 0, period: { start: '', end: '' }, trend: [], by_vehicle: [] })
        renderWithClient(<MaintenanceV2 />)
        expect((await screen.findAllByText('No closed jobs with a cost in this period.')).length).toBe(2)
    })

    it('ranks vehicles by cost in naira and opens the vehicle from a bar', async () => {
        renderWithClient(<MaintenanceV2 />)
        const card = await screen.findByRole('region', { name: 'Vehicles that cost the most to maintain' })
        await waitFor(() => expect(within(card).getByText('ABC-123')).toBeInTheDocument())
        expect(within(card).getByText('ABC-123')).toHaveAttribute('href', '/vehicles/7')
        expect(within(card).getByText('ABC-123').parentElement).toHaveTextContent('₦35,000')
        expect(within(card).getByText('Vehicle 8')).toHaveAttribute('href', '/vehicles/8')
    })
})

describe('jobs and workshop', () => {
    it('shows jobs by stage with stages that have none left out, the average time, and the note about other statuses', async () => {
        renderWithClient(<MaintenanceV2 />)
        const card = await screen.findByRole('region', { name: 'Maintenance jobs by stage' })
        expect(await within(card).findByText('2.3 days')).toBeInTheDocument()
        expect(within(card).getByText(/In progress: 4/)).toBeInTheDocument()
        expect(within(card).getByText(/Closed: 9/)).toBeInTheDocument()
        expect(within(card).queryByText(/Draft/)).not.toBeInTheDocument()
        expect(within(card).getByText(/Jobs in any other status, such as rejected, are not/)).toBeInTheDocument()
    })

    it('shows a dash, not 0 days, when no job has a start and completion date', async () => {
        m.getMaintenanceWorkflow.mockResolvedValue({ by_status: [{ status: 'draft', count: 2 }], avg_turnaround_days: null })
        renderWithClient(<MaintenanceV2 />)
        const card = await screen.findByRole('region', { name: 'Maintenance jobs by stage' })
        await within(card).findByText('Average time from start to completion')
        expect(within(card).getByText('—')).toBeInTheDocument()
    })

    it('shows the workshop figures, with the cost in naira and a vendor rating only when there are reviews', async () => {
        renderWithClient(<MaintenanceV2 />)
        const card = await screen.findByRole('region', { name: 'Workshop' })
        expect(await within(card).findByText('₦123,456')).toBeInTheDocument()
        expect(within(card).getByText('4.3')).toBeInTheDocument()
        expect(within(card).getByText('Awaiting verification')).toBeInTheDocument()
    })

    it('says there are no reviews rather than showing a rating of 0', async () => {
        m.getWorkshopSummary.mockResolvedValue({ total_jobs: 1, in_progress: 0, pending_verification: 0, closed: 1, total_cost_kobo: 0, avg_vendor_rating: null })
        renderWithClient(<MaintenanceV2 />)
        expect(await screen.findByText('No reviews yet')).toBeInTheDocument()
    })

    it('does not ask for the lower cards until they are scrolled near', async () => {
        renderWithClient(<MaintenanceV2 />)
        expect(m.getMaintenanceWorkflow).not.toHaveBeenCalled()
        await waitFor(() => expect(m.getMaintenanceWorkflow).toHaveBeenCalled())
        expect(m.getWorkshopSummary).toHaveBeenCalled()
    })
})

describe('what the tab leaves out', () => {
    it('offers only the periods the cost report can serve, no entity filters, and has no table', async () => {
        renderWithClient(<MaintenanceV2 />)
        const select = (await screen.findByLabelText('Period')) as HTMLSelectElement
        expect([...select.options].map((o) => o.value)).toEqual(['7d', '30d', '90d', '1y'])
        expect(screen.queryByRole('button', { name: /Drivers filter/ })).not.toBeInTheDocument()
        await screen.findByRole('region', { name: 'Workshop' })
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('shows a failed load as an error, never as zero', async () => {
        m.getScheduleSummary.mockRejectedValue({ response: { status: 500, data: {} } })
        renderWithClient(<MaintenanceV2 />)
        await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0), { timeout: 4000 })
        expect(within(screen.getByRole('region', { name: 'Maintenance schedules' })).queryByText('Schedules')).not.toBeInTheDocument()
    })
})
