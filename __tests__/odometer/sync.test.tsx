import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.setConfig({ testTimeout: 30000 })

const get = vi.fn()
vi.mock('@/lib/api/client', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ReadingHistory } from '@/components/odometer/ReadingHistory'
import { OdometerOutcome } from '@/components/odometer/OdometerOutcome'
import { SyncNoticeBox } from '@/components/odometer/SyncNotice'
import { syncNotice } from '@/lib/odometer'

const ok = (data: unknown) => Promise.resolve({ data: { data } })
const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const reading = (id: number, over: Record<string, unknown> = {}) => ({
    id, vehicle_id: 7, value_km: 100, original_value: 100, original_unit: 'km', effective_at: '2026-11-27T08:50:00Z', recorded_at: 'x',
    kind: 'reading', source: 'customer_supplied', physically_inspected: false, status: 'pending_sync', previous_accepted_km: null, created_at: 'x', ...over,
})
const odo = (sync?: unknown) => ({ lifetime_km: 84000, today_km: null, source: 'installer_supplied', status: 'verified', unit: 'km', display: { lifetime: 84000, today: null }, ...(sync === undefined ? {} : { sync }) })

const mockApi = (odometer: unknown, readings: unknown[]) =>
    get.mockImplementation((url: string) =>
        url.endsWith('/odometer') ? ok({ odometer, segments: [] }) : ok({ readings, pagination: { current: 1, lastPage: 1, total: readings.length, perPage: 10 } }),
    )

beforeEach(() => vi.clearAllMocks())

describe('syncNotice', () => {
    it('is null with no sync, nothing pending, or an empty object', () => {
        expect(syncNotice(null)).toBeNull()
        expect(syncNotice(undefined)).toBeNull()
        expect(syncNotice({})).toBeNull()
        expect(syncNotice({ pending: 0, blocked: false, blocked_reason: null, message: null })).toBeNull()
    })
})

describe('vehicle odometer tab sync notice', () => {
    it('shows how many readings are waiting, and keeps the accepted total', async () => {
        mockApi(odo({ pending: 2, blocked: false, blocked_reason: null, message: null }), [])
        wrap(<ReadingHistory vehicleId="v-1" />)
        expect(await screen.findByTestId('sync-count')).toHaveTextContent('2 readings are waiting')
        expect(screen.getByTestId('sync-notice')).toHaveAttribute('data-tone', 'waiting')
        expect(screen.getByTestId('accepted-odometer')).toHaveTextContent('84,000 km')
    })

    it('feature disabled: a calm notice with the server message and nothing to retry', async () => {
        mockApi(odo({ pending: 1, blocked: true, blocked_reason: 'engine_feature_disabled', message: 'Odometer sync is not switched on for your organisation.' }), [])
        wrap(<ReadingHistory vehicleId="v-1" />)
        const n = await screen.findByTestId('sync-notice')
        expect(n).toHaveAttribute('data-tone', 'calm')
        expect(n).toHaveTextContent('1 reading is waiting')
        expect(n).toHaveTextContent('not switched on')
        expect(n).toHaveTextContent('Odometer sync is not switched on for your organisation.')
        expect(n).toHaveTextContent(/Nothing to retry/)
        expect(within(n).queryByRole('button')).not.toBeInTheDocument()
        expect(screen.getByTestId('accepted-odometer')).toHaveTextContent('84,000 km')
    })

    it('engine unavailable: will be retried automatically', async () => {
        mockApi(odo({ pending: 3, blocked: true, blocked_reason: 'engine_unavailable', message: 'The platform is busy.' }), [])
        wrap(<ReadingHistory vehicleId="v-1" />)
        const n = await screen.findByTestId('sync-notice')
        expect(n).toHaveAttribute('data-tone', 'retry')
        expect(n).toHaveTextContent('Will be retried automatically')
        expect(n).toHaveTextContent('The platform is busy.')
    })

    it('an older backend without sync renders exactly as before', async () => {
        mockApi(odo(), [reading(1, { status: 'accepted' })])
        wrap(<ReadingHistory vehicleId="v-1" />)
        await screen.findByTestId('reading-1')
        expect(screen.queryByTestId('sync-notice')).not.toBeInTheDocument()
        expect(screen.getByTestId('reading-1')).toHaveTextContent('Accepted')
    })

    it('sync: null is also fine', async () => {
        mockApi(odo(null), [])
        wrap(<ReadingHistory vehicleId="v-1" />)
        await screen.findByTestId('accepted-odometer')
        expect(screen.queryByTestId('sync-notice')).not.toBeInTheDocument()
    })
})

describe('reading history rows', () => {
    it('pending_sync rows get a sync badge that is neither a failure nor a success', async () => {
        mockApi(odo(), [
            reading(1, { sync: { attempts: 0, blocked: true, blocked_reason: 'engine_feature_disabled', message: 'Not switched on.' } }),
            reading(2, { sync: { attempts: 2, blocked: true, blocked_reason: 'engine_unavailable', message: null } }),
            reading(3, { sync: { attempts: 0, blocked: false, blocked_reason: null, message: null } }),
            reading(4),
        ])
        wrap(<ReadingHistory vehicleId="v-1" />)
        const b1 = within(await screen.findByTestId('reading-1')).getByTestId('sync-badge')
        expect(b1).toHaveTextContent('not switched on')
        expect(b1).toHaveAttribute('title', 'Not switched on.')
        expect(b1).toHaveAttribute('data-tone', 'calm')
        expect(within(screen.getByTestId('reading-1')).queryByText('Rejected')).not.toBeInTheDocument()
        expect(within(screen.getByTestId('reading-1')).queryByText('Accepted')).not.toBeInTheDocument()
        expect(within(screen.getByTestId('reading-2')).getByTestId('sync-badge')).toHaveTextContent('Will be retried automatically')
        expect(within(screen.getByTestId('reading-3')).getByTestId('sync-badge')).toHaveTextContent('Waiting for the telemetry platform')
        // an older backend: pending_sync without sync still shows a plain waiting badge
        expect(within(screen.getByTestId('reading-4')).getByTestId('sync-badge')).toHaveTextContent('Waiting for the telemetry platform')
    })
})

describe('after submitting', () => {
    const result = (sync: unknown) => ({ outcome: 'pending_sync' as const, reading: { id: 1, ...(sync === undefined ? {} : { sync }) } as never, odometer: {} as never })

    it('shows the blocked message when the reading is blocked', () => {
        render(<OdometerOutcome result={result({ attempts: 0, blocked: true, blocked_reason: 'engine_feature_disabled', message: 'Switched off for your organisation.' })} />)
        expect(screen.getByTestId('sync-notice')).toHaveTextContent('Switched off for your organisation.')
        expect(screen.getByTestId('odometer-outcome')).toHaveTextContent('waiting to sync')
    })

    it('shows only the ordinary pending message when not blocked or when sync is missing', () => {
        const { rerender } = render(<OdometerOutcome result={result({ attempts: 0, blocked: false, blocked_reason: null, message: null })} />)
        expect(screen.queryByTestId('sync-notice')).not.toBeInTheDocument()
        rerender(<OdometerOutcome result={result(undefined)} />)
        expect(screen.queryByTestId('sync-notice')).not.toBeInTheDocument()
        expect(screen.getByTestId('odometer-outcome')).toHaveTextContent('waiting to sync')
    })
})

describe('SyncNoticeBox', () => {
    it('renders nothing for no sync', () => {
        const { container } = render(<SyncNoticeBox sync={undefined} />)
        expect(container).toBeEmptyDOMElement()
    })
})
