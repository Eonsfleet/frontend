import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BreachAnalytics } from '@/components/geofencing/BreachAnalytics'

vi.mock('@/lib/api/geofencing', () => ({
    getGeofenceAnalytics: vi.fn(),
}))

import { getGeofenceAnalytics } from '@/lib/api/geofencing'

const mockAnalyticsResponse = {
    data: {
        geofence_id: 1,
        geofence_name: 'Warehouse Alpha',
        analytics_period_days: 30,
        summary: {
            total_breaches: 12,
            breach_rate_per_day: 0.4,
            most_active_vehicle: { vehicle_id: 5, registration: 'LND-123-XY', breach_count: 4 },
            peak_breach_time: '18:00-20:00',
            average_dwell_time_minutes: 145,
        },
        timeline: [
            { date: '2026-03-03', day_of_week: 'Monday', breach_count: 2, unique_vehicles: 1 },
            { date: '2026-03-04', day_of_week: 'Tuesday', breach_count: 5, unique_vehicles: 2 },
            { date: '2026-03-05', day_of_week: 'Wednesday', breach_count: 1, unique_vehicles: 1 },
            { date: '2026-03-06', day_of_week: 'Thursday', breach_count: 0, unique_vehicles: 0 },
            { date: '2026-03-07', day_of_week: 'Friday', breach_count: 3, unique_vehicles: 2 },
            { date: '2026-03-08', day_of_week: 'Saturday', breach_count: 1, unique_vehicles: 1 },
            { date: '2026-03-09', day_of_week: 'Sunday', breach_count: 0, unique_vehicles: 0 },
        ],
        vehicle_ranking: [
            { rank: 1, vehicle_id: 5, registration: 'LND-123-XY', breach_count: 4, breach_duration_avg_minutes: 12, last_breach: '2026-03-09T18:30:00Z' },
            { rank: 2, vehicle_id: 8, registration: 'ABJ-567-ZZ', breach_count: 3, breach_duration_avg_minutes: 5, last_breach: '2026-03-08T19:15:00Z' },
        ],
    },
}

function renderWithQuery(ui: React.ReactElement) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGeofenceAnalytics).mockResolvedValue(mockAnalyticsResponse as any)
})

describe('BreachAnalytics', () => {
    it('does not render when isOpen=false', () => {
        const { container } = renderWithQuery(
            <BreachAnalytics isOpen={false} onClose={vi.fn()} geofenceId="1" />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders modal header when open', () => {
        renderWithQuery(<BreachAnalytics isOpen={true} onClose={vi.fn()} geofenceId="1" geofenceName="Warehouse Alpha" />)
        expect(screen.getByText('Breach')).toBeInTheDocument()
        expect(screen.getByText(/Warehouse Alpha/)).toBeInTheDocument()
    })

    it('shows loading spinner initially', () => {
        renderWithQuery(<BreachAnalytics isOpen={true} onClose={vi.fn()} geofenceId="1" />)
        expect(screen.getByText(/Loading breach data/)).toBeInTheDocument()
    })

    it('renders KPI stats from API response', async () => {
        renderWithQuery(<BreachAnalytics isOpen={true} onClose={vi.fn()} geofenceId="1" />)
        await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument())
        expect(screen.getByText('145m')).toBeInTheDocument()
        expect(screen.getByText('18:00-20:00')).toBeInTheDocument()
    })

    it('renders vehicle ranking list', async () => {
        renderWithQuery(<BreachAnalytics isOpen={true} onClose={vi.fn()} geofenceId="1" />)
        await waitFor(() => screen.getByText('LND-123-XY'))
        expect(screen.getByText('ABJ-567-ZZ')).toBeInTheDocument()
    })

    it('calls onClose when close button clicked', async () => {
        const onClose = vi.fn()
        renderWithQuery(<BreachAnalytics isOpen={true} onClose={onClose} geofenceId="1" />)
        await waitFor(() => screen.getByText('12'))
        fireEvent.click(screen.getByRole('button', { name: /CLOSE ANALYSIS/i }))
        expect(onClose).toHaveBeenCalled()
    })

    it('calls getGeofenceAnalytics with correct params', async () => {
        renderWithQuery(<BreachAnalytics isOpen={true} onClose={vi.fn()} geofenceId="42" />)
        await waitFor(() => expect(getGeofenceAnalytics).toHaveBeenCalledWith('42', {
            days: 30,
            include_timeline: true,
            include_ranking: true,
        }))
    })

    it('shows empty offender message when vehicle_ranking is empty', async () => {
        vi.mocked(getGeofenceAnalytics).mockResolvedValue({
            ...mockAnalyticsResponse,
            data: { ...mockAnalyticsResponse.data, vehicle_ranking: [] },
        } as any)
        renderWithQuery(<BreachAnalytics isOpen={true} onClose={vi.fn()} geofenceId="1" />)
        await waitFor(() => screen.getByText('No offender data available'))
    })
})
