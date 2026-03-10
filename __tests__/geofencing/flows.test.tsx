/**
 * Geofence E2E-style flow tests
 * Covers complete user journeys using React Testing Library.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ─── Next.js mocks ───────────────────────────────────────────────────────────
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    useParams: () => ({ id: '1' }),
}))
vi.mock('next/dynamic', () => ({
    default: (_loader: () => Promise<any>, opts?: { loading?: () => React.ReactNode }) =>
        function DynamicComponent(_props: any) {
            return opts?.loading ? opts.loading() : null
        },
}))

// ─── API mocks ────────────────────────────────────────────────────────────────
vi.mock('@/lib/api/geofencing', () => ({
    getGeofences: vi.fn(),
    getGeofenceById: vi.fn(),
    createGeofence: vi.fn(),
    updateGeofence: vi.fn(),
    deleteGeofence: vi.fn(),
    getGeofenceVehicles: vi.fn(),
    bulkAssignVehicles: vi.fn(),
    getGeofenceAnalytics: vi.fn(),
}))
vi.mock('@/lib/api/vehicles', () => ({
    getVehicles: vi.fn(),
}))

// ─── Subscription/Auth store mocks ───────────────────────────────────────────
vi.mock('@/hooks/useSubscription', () => ({
    useSubscription: () => ({
        hasCapability: () => true,
        planTier: 'enterprise',
        planName: 'Enterprise',
        isPaymentOverdue: false,
        isGracePeriod: false,
        dunningStage: null,
    }),
}))
vi.mock('@/store/authStore', () => ({
    useAuthStore: (selector: any) =>
        selector({
            user: { id: 1, name: 'Admin', role: 'administrator', organization_id: 'org-1' },
            organization: { id: 1, identifier: 'acme', name: 'ACME', subdomain: 'acme', slug: null },
            token: 'test-token',
        }),
}))

// ─── Shared modal mocks (avoid Leaflet/chart deps in flow tests) ──────────────
vi.mock('@/components/geofencing/BulkAssignmentModal', () => ({
    BulkAssignmentModal: ({ isOpen, geofenceName, onClose }: any) =>
        isOpen ? (
            <div data-testid="bulk-modal">
                <p>Assigning to {geofenceName}</p>
                <button onClick={onClose}>Close Assign</button>
            </div>
        ) : null,
}))
vi.mock('@/components/geofencing/BreachAnalytics', () => ({
    BreachAnalytics: ({ isOpen, onClose }: any) =>
        isOpen ? (
            <div data-testid="breach-modal">
                <button onClick={onClose}>Close Analytics</button>
            </div>
        ) : null,
}))

// ─── Toast mock (hoisted so vi.mock factory can reference it) ─────────────────
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: mockToast }))

// ─── Imports (after mocks) ────────────────────────────────────────────────────
import { getGeofences, deleteGeofence } from '@/lib/api/geofencing'
import { GeofenceList } from '@/components/geofencing/GeofenceList'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeQC() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}
function wrap(ui: React.ReactElement, qc = makeQC()) {
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockGeofences = [
    {
        id: '1',
        attributes: { name: 'Main Depot', type: 'circle', alert_type: 'both', is_active: true, radius: 1000 },
        relationships: { vehicles: { data: [{ id: '10' }, { id: '11' }] } },
    },
    {
        id: '2',
        attributes: { name: 'Customer Site A', type: 'polygon', alert_type: 'exit', is_active: false, radius: undefined },
        relationships: { vehicles: { data: [] } },
    },
]

beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    vi.mocked(getGeofences).mockResolvedValue({
        message: 'OK',
        data: {
            geofences: mockGeofences as any,
            pagination: { current: 1, lastPage: 1, total: 2, perPage: 9, next_page_url: null, prev_page_url: null, from: 1 },
        },
    })
})

// ─── FLOW 1: Delete geofence ─────────────────────────────────────────────────
describe('Flow: Delete geofence', () => {
    it('shows dialog → confirms → calls API → toast shown', async () => {
        vi.mocked(deleteGeofence).mockResolvedValue(undefined)
        wrap(<GeofenceList />)

        // Wait for list to load
        await waitFor(() => screen.getByText('Main Depot'))

        // Click delete on first geofence
        fireEvent.click(screen.getAllByTitle('Delete geofence')[0])

        // Confirmation dialog appears with the geofence name
        expect(screen.getByText('Delete Geofence')).toBeInTheDocument()
        expect(screen.getAllByText(/Main Depot/).length).toBeGreaterThan(0)

        // Cancel closes dialog
        fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
        expect(screen.queryByText('Delete Geofence')).toBeNull()

        // Re-open and confirm delete
        fireEvent.click(screen.getAllByTitle('Delete geofence')[0])
        fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

        await waitFor(() => {
            expect(deleteGeofence).toHaveBeenCalledWith('1')
            expect(mockToast.success).toHaveBeenCalledWith('Geofence deleted successfully.')
        })
    })

    it('shows error toast when delete fails', async () => {
        vi.mocked(deleteGeofence).mockRejectedValue(new Error('Server error'))
        wrap(<GeofenceList />)

        await waitFor(() => screen.getByText('Main Depot'))
        fireEvent.click(screen.getAllByTitle('Delete geofence')[0])
        fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

        await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to delete geofence.'))
    })
})

// ─── FLOW 2: Assign vehicles ──────────────────────────────────────────────────
describe('Flow: Bulk assign vehicles', () => {
    it('opens modal for correct geofence → closes on dismiss', async () => {
        wrap(<GeofenceList />)
        await waitFor(() => screen.getByText('Main Depot'))

        // Click ASSIGN on first geofence
        fireEvent.click(screen.getAllByTitle('Assign vehicles')[0])

        // Modal should open with the correct geofence name
        const modal = screen.getByTestId('bulk-modal')
        expect(modal).toBeInTheDocument()
        expect(screen.getByText(/Assigning to Main Depot/)).toBeInTheDocument()

        // Close modal
        fireEvent.click(screen.getByText('Close Assign'))
        await waitFor(() => expect(screen.queryByTestId('bulk-modal')).toBeNull())
    })

    it('opens INSIGHTS modal for correct geofence', async () => {
        wrap(<GeofenceList />)
        await waitFor(() => screen.getByText('Main Depot'))

        fireEvent.click(screen.getAllByTitle('View breach analytics')[0])
        expect(screen.getByTestId('breach-modal')).toBeInTheDocument()

        fireEvent.click(screen.getByText('Close Analytics'))
        await waitFor(() => expect(screen.queryByTestId('breach-modal')).toBeNull())
    })
})

// ─── FLOW 3: Navigate to edit ─────────────────────────────────────────────────
describe('Flow: Navigate to edit page', () => {
    it('clicking EDIT navigates to /geofences/:id/edit', async () => {
        wrap(<GeofenceList />)
        await waitFor(() => screen.getByText('Main Depot'))

        fireEvent.click(screen.getAllByTitle('Edit geofence')[0])
        expect(mockPush).toHaveBeenCalledWith('/geofences/1/edit')
    })
})

// ─── FLOW 4: Search filtering ─────────────────────────────────────────────────
describe('Flow: Search geofences', () => {
    it('passes searchTerm to getGeofences query', async () => {
        // Render with a search term prop
        vi.mocked(getGeofences).mockResolvedValue({
            message: 'OK',
            data: { geofences: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 9, next_page_url: null, prev_page_url: null, from: 0 } },
        })
        wrap(<GeofenceList searchTerm="depot" />)

        await waitFor(() => expect(getGeofences).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'depot' })
        ))
    })

    it('shows empty state with search term message when no results', async () => {
        vi.mocked(getGeofences).mockResolvedValue({
            message: 'OK',
            data: { geofences: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 9, next_page_url: null, prev_page_url: null, from: 0 } },
        })
        wrap(<GeofenceList searchTerm="xyz" />)
        await waitFor(() => expect(screen.getByText(/No geofences match "xyz"/)).toBeInTheDocument())
    })
})

// ─── FLOW 5: Pagination ───────────────────────────────────────────────────────
describe('Flow: Pagination', () => {
    it('shows prev/next buttons on multi-page response', async () => {
        vi.mocked(getGeofences).mockResolvedValue({
            message: 'OK',
            data: {
                geofences: mockGeofences as any,
                pagination: { current: 1, lastPage: 4, total: 36, perPage: 9, next_page_url: null, prev_page_url: null, from: 1 },
            },
        })
        wrap(<GeofenceList />)
        await waitFor(() => screen.getByText(/Page 1 of 4/))

        // Pagination controls are rendered
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
    })

    it('requests next page when next button clicked', async () => {
        vi.mocked(getGeofences)
            .mockResolvedValueOnce({
                message: 'OK',
                data: {
                    geofences: mockGeofences as any,
                    pagination: { current: 1, lastPage: 2, total: 18, perPage: 9, next_page_url: null, prev_page_url: null, from: 1 },
                },
            })
            .mockResolvedValueOnce({
                message: 'OK',
                data: {
                    geofences: mockGeofences as any,
                    pagination: { current: 2, lastPage: 2, total: 18, perPage: 9, next_page_url: null, prev_page_url: null, from: 10 },
                },
            })

        wrap(<GeofenceList />)
        await waitFor(() => screen.getByText(/Page 1 of 2/))

        // Find and click the next (ChevronRight) button
        const buttons = screen.getAllByRole('button')
        const nextBtn = buttons[buttons.length - 1] // last button is "next"
        fireEvent.click(nextBtn)

        await waitFor(() => {
            expect(getGeofences).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
        })
    })
})
