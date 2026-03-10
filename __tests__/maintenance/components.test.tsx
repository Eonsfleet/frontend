/**
 * Maintenance component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/lib/api/maintenance', () => ({
    acknowledgeMaintenanceAlert: vi.fn(),
    deleteSchedule: vi.fn(),
}))

// Render Radix DropdownMenu inline so items are always visible in jsdom
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
}))

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: mockToast }))

import { acknowledgeMaintenanceAlert, deleteSchedule } from '@/lib/api/maintenance'
import { MaintenanceAlertList } from '@/components/maintenance/MaintenanceAlertList'
import { MaintenanceScheduleTable } from '@/components/maintenance/MaintenanceScheduleTable'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeQC() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}
function wrap(ui: React.ReactElement) {
    return render(<QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>)
}

// ─── Alert fixtures ───────────────────────────────────────────────────────────
const mockAlerts = [
    {
        id: '1',
        attributes: {
            alert_type: 'overdue',
            threshold_type: 'mileage',
            triggered_at: '2026-03-01T10:00:00Z',
            created_at: '2026-03-01T10:00:00Z',
        },
        relationships: { vehicle: { registration_number: 'LAG-001-XY' } },
    },
    {
        id: '2',
        attributes: {
            alert_type: 'upcoming',
            threshold_type: 'time',
            triggered_at: '2026-03-05T08:00:00Z',
            created_at: '2026-03-05T08:00:00Z',
        },
        relationships: { vehicle: { registration_number: 'ABJ-202-ZZ' } },
    },
]

// ─── Schedule fixtures ────────────────────────────────────────────────────────
const mockSchedules = [
    {
        id: '10',
        attributes: {
            service_type: 'oil_change',
            status: 'pending',
            schedule_type: 'time',
            interval_value: 3,
            interval_unit: 'months',
            due_date: '2026-06-01',
            description: 'Routine oil change',
        },
        relationships: {
            vehicle: { registration_number: 'LAG-001-XY', make: 'Toyota', model: 'Hilux' },
        },
    },
    {
        id: '11',
        attributes: {
            service_type: 'brake_service',
            status: 'completed',
            schedule_type: 'mileage',
            interval_value: 10000,
            interval_unit: null,
            due_date: '2026-01-15',
            description: null,
        },
        relationships: {
            vehicle: { registration_number: 'ABJ-202-ZZ', make: 'Ford', model: 'Ranger' },
        },
    },
]

const mockPagination = { current_page: 1, last_page: 1, total: 2, per_page: 20 }

beforeEach(() => {
    vi.clearAllMocks()
})

// ─── MaintenanceAlertList ────────────────────────────────────────────────────
describe('MaintenanceAlertList', () => {
    it('shows loading skeletons when isLoading=true', () => {
        const { container } = wrap(<MaintenanceAlertList alerts={[]} isLoading={true} />)
        // Loading renders skeleton divs
        expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
    })

    it('shows empty state when no alerts', () => {
        wrap(<MaintenanceAlertList alerts={[]} isLoading={false} />)
        expect(screen.getByText('All Assets Optimal')).toBeInTheDocument()
    })

    it('renders alert items', () => {
        wrap(<MaintenanceAlertList alerts={mockAlerts as any} isLoading={false} />)
        expect(screen.getByText(/overdue.*mileage/i)).toBeInTheDocument()
        expect(screen.getByText(/upcoming.*time/i)).toBeInTheDocument()
    })

    it('shows vehicle registrations', () => {
        wrap(<MaintenanceAlertList alerts={mockAlerts as any} isLoading={false} />)
        expect(screen.getByText(/LAG-001-XY/)).toBeInTheDocument()
        expect(screen.getByText(/ABJ-202-ZZ/)).toBeInTheDocument()
    })

    it('shows Critical badge for overdue alerts', () => {
        wrap(<MaintenanceAlertList alerts={mockAlerts as any} isLoading={false} />)
        expect(screen.getByText('Critical')).toBeInTheDocument()
    })

    it('calls acknowledgeMaintenanceAlert when Silence is clicked', async () => {
        vi.mocked(acknowledgeMaintenanceAlert).mockResolvedValue({})
        wrap(<MaintenanceAlertList alerts={mockAlerts as any} isLoading={false} />)

        const silenceButtons = screen.getAllByRole('button', { name: /Silence/i })
        fireEvent.click(silenceButtons[0])

        await waitFor(() => expect(acknowledgeMaintenanceAlert).toHaveBeenCalledWith('1'))
    })

    it('shows error toast when acknowledge fails', async () => {
        vi.mocked(acknowledgeMaintenanceAlert).mockRejectedValue(new Error('Server error'))
        wrap(<MaintenanceAlertList alerts={mockAlerts as any} isLoading={false} />)

        fireEvent.click(screen.getAllByRole('button', { name: /Silence/i })[0])
        await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to acknowledge alert'))
    })

    it('shows "More" button when more than 5 alerts', () => {
        const manyAlerts = Array.from({ length: 7 }, (_, i) => ({
            ...mockAlerts[0],
            id: String(i + 1),
        }))
        wrap(<MaintenanceAlertList alerts={manyAlerts as any} isLoading={false} />)
        expect(screen.getByText(/Show 2 More Critical Events/)).toBeInTheDocument()
    })
})

// ─── MaintenanceScheduleTable ────────────────────────────────────────────────
describe('MaintenanceScheduleTable', () => {
    it('shows skeletons when isLoading=true', () => {
        const { container } = wrap(
            <MaintenanceScheduleTable data={[]} isLoading={true} />
        )
        expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
    })

    it('shows empty state when no data', () => {
        wrap(<MaintenanceScheduleTable data={[]} isLoading={false} />)
        expect(screen.getByText('No active schedules found')).toBeInTheDocument()
    })

    it('renders schedule rows', () => {
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} />)
        expect(screen.getByText('LAG-001-XY')).toBeInTheDocument()
        expect(screen.getByText('ABJ-202-ZZ')).toBeInTheDocument()
    })

    it('shows service type formatted', () => {
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} />)
        // Text content is lowercase; CSS `uppercase` handles visual display
        expect(screen.getByText('oil change')).toBeInTheDocument()
        expect(screen.getByText('brake service')).toBeInTheDocument()
    })

    it('shows time-based interval', () => {
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} />)
        expect(screen.getByText('3 months')).toBeInTheDocument()
    })

    it('shows mileage-based interval', () => {
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} />)
        expect(screen.getByText('10,000 KM')).toBeInTheDocument()
    })

    it('calls deleteSchedule when Cancel Schedule is clicked', async () => {
        vi.mocked(deleteSchedule).mockResolvedValue(undefined)
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} />)

        // With mocked dropdown, items are always visible
        const cancelButtons = screen.getAllByText('Cancel Schedule')
        fireEvent.click(cancelButtons[0])

        await waitFor(() => expect(deleteSchedule).toHaveBeenCalledWith('10'))
    })

    it('shows toast on cancel success', async () => {
        vi.mocked(deleteSchedule).mockResolvedValue(undefined)
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} />)

        const cancelButtons = screen.getAllByText('Cancel Schedule')
        fireEvent.click(cancelButtons[0])

        await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Schedule cancelled.'))
    })

    it('does not render pagination when only 1 page', () => {
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} pagination={mockPagination} />)
        expect(screen.queryByText(/Page/)).toBeNull()
    })

    it('renders pagination on multi-page response', () => {
        const multiPage = { current_page: 1, last_page: 3, total: 60, per_page: 20 }
        wrap(<MaintenanceScheduleTable data={mockSchedules as any} isLoading={false} pagination={multiPage} onPageChange={vi.fn()} />)
        expect(screen.getByText('60')).toBeInTheDocument()
    })
})
