import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
    RouteHistoryPanel,
    formatDuration,
    describePlace,
    resolveRange,
} from '@/app/(portal)/tracking/components/RouteHistoryPanel'
import { useTrackingUiStore } from '@/store/trackingUiStore'

vi.mock('@/lib/api/tracking', () => ({
    getVehicleRouteHistory: vi.fn(),
    ROUTE_HISTORY_MAX_WINDOW_DAYS: 31,
}))

import { getVehicleRouteHistory } from '@/lib/api/tracking'

const mockFetch = getVehicleRouteHistory as ReturnType<typeof vi.fn>

const segment = (overrides: Record<string, unknown> = {}) => ({
    id: 'segment-1',
    started_at: '2026-08-30T08:15:00+01:00',
    ended_at: '2026-08-30T10:27:00+01:00',
    duration_seconds: 7920,
    idle_seconds: 300,
    distance_km: 68.4,
    max_speed: 92,
    avg_speed: 31.09,
    stops: 2,
    start: { latitude: 6.5244, longitude: 3.3792, address: 'Ikeja, Lagos' },
    end: { latitude: 6.4281, longitude: 3.4219, address: 'Victoria Island, Lagos' },
    stop_points: [],
    path: [
        { latitude: 6.5244, longitude: 3.3792, speed: 42, timestamp: '2026-08-30T08:15:00+01:00' },
        { latitude: 6.4281, longitude: 3.4219, speed: 0, timestamp: '2026-08-30T10:27:00+01:00' },
    ],
    ...overrides,
})

const response = (segments: unknown[] = [segment()]) => ({
    message: 'Route history retrieved successfully',
    data: segments,
    meta: {
        total: segments.length,
        vehicle_id: '1',
        start_date: '2026-08-30T00:00:00+01:00',
        end_date: '2026-08-30T23:59:59+01:00',
        summary: {
            trips: segments.length,
            distance_km: 182,
            duration_seconds: 24300,
            idle_seconds: 1800,
            stops: 8,
            max_speed: 92,
            avg_speed: 26.96,
        },
    },
})

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
)

const renderPanel = () =>
    render(<RouteHistoryPanel vehicleId="1" plate="ABC-123-XD" onClose={vi.fn()} />, { wrapper: Wrapper })

beforeEach(() => {
    vi.clearAllMocks()
    useTrackingUiStore.setState({ focusedRoute: null })
    vi.setSystemTime(new Date('2026-08-30T12:00:00+01:00'))
})

afterEach(() => {
    vi.useRealTimers()
})

describe('resolveRange', () => {
    const now = new Date('2026-08-30T12:00:00Z')

    it('spans exactly the current day for the Today preset', () => {
        const range = resolveRange('today', undefined, now)!
        expect(range.start.toDateString()).toBe(now.toDateString())
        expect(range.end.toDateString()).toBe(now.toDateString())
        expect(range.start.getHours()).toBe(0)
    })

    it('spans seven days ending today for the week preset', () => {
        const range = resolveRange('week', undefined, now)!
        const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000)
        expect(days).toBe(7)
    })

    it('is null until a custom range has a start date', () => {
        expect(resolveRange('custom', undefined, now)).toBeNull()
        expect(resolveRange('custom', { from: undefined, to: undefined }, now)).toBeNull()
    })

    it('treats a single picked day as that whole day', () => {
        const day = new Date('2026-08-20T09:30:00Z')
        const range = resolveRange('custom', { from: day, to: undefined }, now)!
        expect(range.start.getHours()).toBe(0)
        expect(range.end.getDate()).toBe(range.start.getDate())
        expect(range.end.getHours()).toBe(23)
    })

    it('honours both ends of a picked range', () => {
        const range = resolveRange(
            'custom',
            { from: new Date('2026-08-10T00:00:00Z'), to: new Date('2026-08-14T00:00:00Z') },
            now,
        )!
        expect(range.start.getDate()).toBe(10)
        expect(range.end.getDate()).toBe(14)
    })
})

describe('formatDuration', () => {
    it('formats hours and minutes, dropping empty units', () => {
        expect(formatDuration(7920)).toBe('2h 12m')
        expect(formatDuration(7200)).toBe('2h')
        expect(formatDuration(2700)).toBe('45m')
        expect(formatDuration(38)).toBe('38s')
        expect(formatDuration(0)).toBe('0m')
    })
})

describe('describePlace', () => {
    it('treats the geocoder placeholder "Unknown" as no address and shows the coordinates', () => {
        expect(describePlace({ latitude: 6.4592533, longitude: 3.3649116, address: 'Unknown' })).toBe('6.45925, 3.36491')
    })

    it('prefers the resolved address', () => {
        expect(describePlace({ latitude: 6.5, longitude: 3.3, address: 'Ikeja, Lagos' })).toBe('Ikeja, Lagos')
    })

    it('falls back to coordinates when the server could not name the place', () => {
        expect(describePlace({ latitude: 6.5244, longitude: 3.3792, address: null })).toBe('6.52440, 3.37920')
    })
})

describe('RouteHistoryPanel', () => {
    it('loads today by default and renders a row per journey', async () => {
        mockFetch.mockResolvedValue(response())
        renderPanel()

        await waitFor(() => expect(mockFetch).toHaveBeenCalled())

        const [vehicleId, startDate, endDate] = mockFetch.mock.calls[0]
        expect(vehicleId).toBe('1')
        expect(new Date(startDate).toDateString()).toBe(new Date(endDate).toDateString())

        expect(await screen.findByText('Ikeja, Lagos')).toBeInTheDocument()
        expect(screen.getByText('Victoria Island, Lagos')).toBeInTheDocument()
        expect(screen.getByText(/2h 12m/)).toBeInTheDocument()
    })

    it('renders the summary returned with the window', async () => {
        mockFetch.mockResolvedValue(response())
        renderPanel()

        expect(await screen.findByText('182 km')).toBeInTheDocument()
        expect(screen.getByText('6h 45m')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('re-queries a seven-day window when the week preset is picked', async () => {
        mockFetch.mockResolvedValue(response())
        renderPanel()

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

        fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))

        const [, startDate, endDate] = mockFetch.mock.calls[1]
        const days = Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
        )
        expect(days).toBe(7)
    })

    it('marks the active preset for assistive tech', async () => {
        mockFetch.mockResolvedValue(response())
        renderPanel()

        expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true')

        fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))

        expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows an empty state when the vehicle did not move', async () => {
        mockFetch.mockResolvedValue({
            ...response([]),
            meta: { ...response([]).meta, summary: { ...response([]).meta.summary, trips: 0 } },
        })
        renderPanel()

        expect(await screen.findByText('No journeys recorded')).toBeInTheDocument()
    })

    it('surfaces the server message when the window cannot be loaded', async () => {
        mockFetch.mockRejectedValue(new Error('boom'))
        renderPanel()

        expect(await screen.findByText('Could not load route history')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    })

    it('clears any drawn journey when the panel goes away', async () => {
        mockFetch.mockResolvedValue(response())
        const { unmount } = renderPanel()

        await screen.findByText('Ikeja, Lagos')

        act(() =>
            useTrackingUiStore.setState({
                focusedRoute: { vehicleId: '1', segmentId: 'segment-1', path: [{ lat: 1, lng: 2 }] },
            }),
        )

        unmount()

        expect(useTrackingUiStore.getState().focusedRoute).toBeNull()
    })

    it('badges the journey currently drawn on the map', async () => {
        mockFetch.mockResolvedValue(response())
        renderPanel()

        await screen.findByText('Ikeja, Lagos')
        expect(screen.queryByText('On map')).not.toBeInTheDocument()

        act(() =>
            useTrackingUiStore.setState({
                focusedRoute: { vehicleId: '1', segmentId: 'segment-1', path: [{ lat: 1, lng: 2 }] },
            }),
        )

        expect(await screen.findByText('On map')).toBeInTheDocument()
    })
})
