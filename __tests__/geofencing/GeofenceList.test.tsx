import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GeofenceList } from '@/components/geofencing/GeofenceList'

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

// Mock geofencing API
vi.mock('@/lib/api/geofencing', () => ({
    getGeofences: vi.fn(),
    deleteGeofence: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Mock child modals to avoid Leaflet/complex deps
vi.mock('@/components/geofencing/BulkAssignmentModal', () => ({
    BulkAssignmentModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="bulk-assignment-modal" /> : null,
}))
vi.mock('@/components/geofencing/BreachAnalytics', () => ({
    BreachAnalytics: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="breach-analytics-modal" /> : null,
}))

import { getGeofences, deleteGeofence } from '@/lib/api/geofencing'

const mockGeofences = [
    {
        id: '1',
        attributes: { name: 'Warehouse Alpha', type: 'circle', alert_type: 'both', is_active: true, radius: 500 },
        relationships: { vehicles: { data: [{ id: '10' }, { id: '11' }] } },
    },
    {
        id: '2',
        attributes: { name: 'Depot Beta', type: 'polygon', alert_type: 'exit', is_active: false, radius: undefined },
        relationships: { vehicles: { data: [] } },
    },
]

function renderWithQuery(ui: React.ReactElement) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGeofences).mockResolvedValue({
        message: 'OK',
        data: {
            geofences: mockGeofences as any,
            pagination: { current: 1, lastPage: 1, total: 2, perPage: 9, next_page_url: null, prev_page_url: null, from: 1 },
        },
    })
})

describe('GeofenceList', () => {
    it('renders loading skeletons initially', () => {
        renderWithQuery(<GeofenceList />)
        const skeletons = document.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders geofence cards after load', async () => {
        renderWithQuery(<GeofenceList />)
        await waitFor(() => expect(screen.getByText('Warehouse Alpha')).toBeInTheDocument())
        expect(screen.getByText('Depot Beta')).toBeInTheDocument()
    })

    it('shows correct vehicle count from relationships', async () => {
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('Warehouse Alpha'))
        // Warehouse Alpha has 2 vehicles
        const counts = screen.getAllByText('2')
        expect(counts.length).toBeGreaterThan(0)
    })

    it('shows active/inactive badges correctly', async () => {
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('MONITORING ACTIVE'))
        expect(screen.getByText('INACTIVE')).toBeInTheDocument()
    })

    it('opens BulkAssignmentModal when ASSIGN is clicked', async () => {
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('Warehouse Alpha'))
        const assignButtons = screen.getAllByTitle('Assign vehicles')
        fireEvent.click(assignButtons[0])
        expect(screen.getByTestId('bulk-assignment-modal')).toBeInTheDocument()
    })

    it('opens BreachAnalytics modal when INSIGHTS is clicked', async () => {
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('Warehouse Alpha'))
        const insightButtons = screen.getAllByTitle('View breach analytics')
        fireEvent.click(insightButtons[0])
        expect(screen.getByTestId('breach-analytics-modal')).toBeInTheDocument()
    })

    it('shows delete confirmation dialog when DELETE is clicked', async () => {
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('Warehouse Alpha'))
        const deleteButtons = screen.getAllByTitle('Delete geofence')
        fireEvent.click(deleteButtons[0])
        expect(screen.getByText('Delete Geofence')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
    })

    it('calls deleteGeofence API and closes dialog on confirm', async () => {
        vi.mocked(deleteGeofence).mockResolvedValue(undefined)
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('Warehouse Alpha'))

        fireEvent.click(screen.getAllByTitle('Delete geofence')[0])
        await waitFor(() => screen.getByText('Delete Geofence'))

        const confirmBtn = screen.getByRole('button', { name: /Delete$/ })
        fireEvent.click(confirmBtn)

        await waitFor(() => expect(deleteGeofence).toHaveBeenCalledWith('1'))
    })

    it('shows empty state when no geofences returned', async () => {
        vi.mocked(getGeofences).mockResolvedValue({
            message: 'OK',
            data: { geofences: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 9, next_page_url: null, prev_page_url: null, from: 0 } },
        })
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('No Active Zones'))
    })

    it('shows custom empty state message when searchTerm provided', async () => {
        vi.mocked(getGeofences).mockResolvedValue({
            message: 'OK',
            data: { geofences: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 9, next_page_url: null, prev_page_url: null, from: 0 } },
        })
        renderWithQuery(<GeofenceList searchTerm="nonexistent" />)
        await waitFor(() => expect(screen.getByText(/No geofences match/)).toBeInTheDocument())
    })

    it('does not render pagination when only 1 page', async () => {
        renderWithQuery(<GeofenceList />)
        await waitFor(() => screen.getByText('Warehouse Alpha'))
        expect(screen.queryByText(/Page 1 of/)).toBeNull()
    })

    it('renders pagination when multiple pages exist', async () => {
        vi.mocked(getGeofences).mockResolvedValue({
            message: 'OK',
            data: {
                geofences: mockGeofences as any,
                pagination: { current: 1, lastPage: 3, total: 27, perPage: 9, next_page_url: null, prev_page_url: null, from: 1 },
            },
        })
        renderWithQuery(<GeofenceList />)
        await waitFor(() => expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument())
    })
})
