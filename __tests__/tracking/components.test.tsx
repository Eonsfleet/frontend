import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock next/dynamic (leaflet/maps) ──────────────────────────────────────────
vi.mock('next/dynamic', () => ({
    default: (_loader: () => Promise<any>, opts?: { loading?: () => React.ReactNode }) =>
        function DynamicComponent(_props: any) {
            return opts?.loading ? opts.loading() : null
        },
}))

// ── Mock tracking API ─────────────────────────────────────────────────────────
vi.mock('@/lib/api/tracking', () => ({
    getVehicleSensorHealth: vi.fn().mockResolvedValue({
        data: { battery_voltage: '14.2', signal_strength: '8 Sats', engine_temp: 90, obd_status: 'normal' },
    }),
}))

// ── Mock lib/gps (reverseGeocode) ─────────────────────────────────────────────
vi.mock('@/lib/gps', () => ({
    reverseGeocode: vi.fn().mockResolvedValue('123 Test Street, Lagos'),
}))

// ── Mock hooks ────────────────────────────────────────────────────────────────
vi.mock('@/hooks/useVehicleTelemetry', () => ({
    useVehicleTelemetry: () => ({ telemetry: null, deviceStatus: null }),
}))

vi.mock('@/hooks/useEcho', () => ({
    useEcho: () => ({ echo: null, subscribe: vi.fn(), subscribePrivate: vi.fn() }),
}))

vi.mock('@/store/authStore', () => ({
    useAuthStore: () => ({ organization: { id: 1 }, token: 'test-token' }),
}))

// ── Components under test ─────────────────────────────────────────────────────
import { TripPlaybackTimeline } from '@/components/live/TripPlaybackTimeline'
import { TelemetryDrawer } from '@/components/live/TelemetryDrawer'

const makeQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
)

// ── GPS point fixture ─────────────────────────────────────────────────────────
const GPS_POINTS = [
    { lat: 6.1, lng: 3.3, speed: 60, heading: 90, timestamp: '2024-01-01T08:00:00Z' },
    { lat: 6.2, lng: 3.4, speed: 65, heading: 95, timestamp: '2024-01-01T08:01:00Z' },
    { lat: 6.3, lng: 3.5, speed: 55, heading: 100, timestamp: '2024-01-01T08:02:00Z' },
]

// ─────────────────────────────────────────────────────────────────────────────
// TripPlaybackTimeline
// ─────────────────────────────────────────────────────────────────────────────
describe('TripPlaybackTimeline', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <TripPlaybackTimeline isOpen={false} onClose={() => {}} />,
            { wrapper: Wrapper }
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('renders timeline when isOpen is true', () => {
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                currentIndex={0}
                title="TRIP REPLAY"
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText(/TRIP REPLAY/i)).toBeInTheDocument()
    })

    it('shows loading spinner when isLoading is true', () => {
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={[]}
                isLoading={true}
            />,
            { wrapper: Wrapper }
        )
        // Loading state shows Loader2 spinner — check for animation class via SVG
        const svgs = document.querySelectorAll('svg.animate-spin')
        expect(svgs.length).toBeGreaterThan(0)
    })

    it('shows speed multiplier buttons', () => {
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                currentIndex={0}
                speed={1}
                setSpeed={() => {}}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('1X')).toBeInTheDocument()
        expect(screen.getByText('5X')).toBeInTheDocument()
        expect(screen.getByText('10X')).toBeInTheDocument()
        expect(screen.getByText('30X')).toBeInTheDocument()
    })

    it('calls setSpeed when speed button clicked', () => {
        const setSpeed = vi.fn()
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                currentIndex={0}
                speed={1}
                setSpeed={setSpeed}
            />,
            { wrapper: Wrapper }
        )
        fireEvent.click(screen.getByText('5X'))
        expect(setSpeed).toHaveBeenCalledWith(5)
    })

    it('calls setIsPlaying when play/pause button clicked', () => {
        const setIsPlaying = vi.fn()
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                currentIndex={0}
                isPlaying={false}
                setIsPlaying={setIsPlaying}
            />,
            { wrapper: Wrapper }
        )
        // Play/Pause button — the large center button
        const playBtn = screen.getAllByRole('button').find(btn =>
            btn.querySelector('svg') !== null && btn.className.includes('rounded-full')
        )
        if (playBtn) fireEvent.click(playBtn)
        expect(setIsPlaying).toHaveBeenCalledWith(true)
    })

    it('calls onClose when EXIT REPLAY is clicked', () => {
        const onClose = vi.fn()
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={onClose}
                data={GPS_POINTS}
                currentIndex={0}
            />,
            { wrapper: Wrapper }
        )
        fireEvent.click(screen.getByText('EXIT REPLAY'))
        expect(onClose).toHaveBeenCalled()
    })

    it('displays current point speed and heading', () => {
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                currentIndex={0}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('60')).toBeInTheDocument() // speed from GPS_POINTS[0]
        expect(screen.getByText('90')).toBeInTheDocument() // heading from GPS_POINTS[0]
    })

    it('calls onIndexChange when rewind button clicked', () => {
        const onIndexChange = vi.fn()
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                currentIndex={1}
                onIndexChange={onIndexChange}
            />,
            { wrapper: Wrapper }
        )
        // RotateCcw (reset to 0) button
        const resetBtn = screen.getAllByRole('button').find(btn =>
            btn.querySelector('svg') !== null && btn.className.includes('p-3')
        )
        if (resetBtn) fireEvent.click(resetBtn)
        expect(onIndexChange).toHaveBeenCalledWith(0)
    })

    it('shows date range picker only for HISTORY mode', () => {
        const { rerender } = render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                title="TRIP REPLAY"
            />,
            { wrapper: Wrapper }
        )
        expect(screen.queryByText(/Pick a date/i)).not.toBeInTheDocument()

        rerender(
            <Wrapper>
                <TripPlaybackTimeline
                    isOpen={true}
                    onClose={() => {}}
                    data={GPS_POINTS}
                    title="HISTORY REPLAY"
                />
            </Wrapper>
        )
        expect(screen.getByText(/Pick a date/i)).toBeInTheDocument()
    })

    it('collapses panel when toggle button is clicked', () => {
        render(
            <TripPlaybackTimeline
                isOpen={true}
                onClose={() => {}}
                data={GPS_POINTS}
                currentIndex={0}
            />,
            { wrapper: Wrapper }
        )
        // The collapse toggle is the first button (chevron at top)
        const toggleBtn = screen.getAllByRole('button')[0]
        expect(screen.getByText('EXIT REPLAY')).toBeVisible()
        fireEvent.click(toggleBtn)
        // After collapse, controls are hidden (class "hidden")
        const controls = document.querySelector('.hidden')
        expect(controls).toBeInTheDocument()
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// TelemetryDrawer
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TELEMETRY = {
    plate: 'LND-001-XY',
    speed: 72,
    fuel: 65,
    temp: 91,
    status: 'in_transit',
    voltage: '14.2V',
    signal: '8 Sats',
    ignition: true,
    odometer: 12450,
    lat: 6.5244,
    lng: 3.3792,
    lastUpdate: '2024-01-01T10:00:00Z',
}

describe('TelemetryDrawer', () => {
    it('renders nothing when vehicle is null', () => {
        const { container } = render(
            <TelemetryDrawer isOpen={true} onClose={() => {}} vehicleId={null} vehicle={null} />,
            { wrapper: Wrapper }
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('renders drawer with vehicle plate', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={VEHICLE_TELEMETRY}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText(/LND-001-XY/)).toBeInTheDocument()
    })

    it('shows speed value', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={VEHICLE_TELEMETRY}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('72')).toBeInTheDocument()
    })

    it('shows fuel level value', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={VEHICLE_TELEMETRY}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('65')).toBeInTheDocument()
    })

    it('shows odometer value', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={VEHICLE_TELEMETRY}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText(/12,450/)).toBeInTheDocument()
    })

    it('shows ignition ON when ignition is true', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={VEHICLE_TELEMETRY}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('ON')).toBeInTheDocument()
    })

    it('shows ignition OFF when ignition is false', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={{ ...VEHICLE_TELEMETRY, ignition: false }}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('OFF')).toBeInTheDocument()
    })

    it('calls onClose when X button is clicked', () => {
        const onClose = vi.fn()
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={onClose}
                vehicleId="1"
                vehicle={VEHICLE_TELEMETRY}
            />,
            { wrapper: Wrapper }
        )
        fireEvent.click(screen.getAllByRole('button')[0])
        expect(onClose).toHaveBeenCalled()
    })

    it('shows Mission En-route when vehicle is in transit', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={{ ...VEHICLE_TELEMETRY, status: 'in_transit' }}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('Mission En-route')).toBeInTheDocument()
    })

    it('shows Awaiting Deployment for non-transit vehicles', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={{ ...VEHICLE_TELEMETRY, status: 'idle' }}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText('Awaiting Deployment')).toBeInTheDocument()
    })

    it('shows coordinates for the vehicle location', () => {
        render(
            <TelemetryDrawer
                isOpen={true}
                onClose={() => {}}
                vehicleId="1"
                vehicle={VEHICLE_TELEMETRY}
            />,
            { wrapper: Wrapper }
        )
        expect(screen.getByText(/6\.5244/)).toBeInTheDocument()
    })
})
