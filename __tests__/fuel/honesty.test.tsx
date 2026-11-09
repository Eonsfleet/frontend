import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { FuelVehicle } from '@/types/fuel'

const api = vi.hoisted(() => ({ getFuelVehiclesRealtime: vi.fn(), getFuelEvents: vi.fn(), getFuelLevelTrend: vi.fn(), getFuelRateTrend: vi.fn() }))
vi.mock('@/lib/api/fuel', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/fuel')>()), ...api }))
vi.mock('@/app/(portal)/fuel/components/useFuelLiveSync', () => ({ useFuelLiveSync: () => ({}) }))
vi.mock('@/app/(portal)/fuel/components/FuelTrackingMap', () => ({ FuelTrackingMap: () => null }))

import { formatLastSeen, lowFuelVehicles, mapVehicleRow, type VehicleRow } from '@/app/(portal)/fuel/components/useFuelOverview'
import { levelFigure, useFuelRealtime } from '@/app/(portal)/fuel/components/useFuelRealtime'
import { RealtimeTrackingCard } from '@/app/(portal)/fuel/components/RealtimeTrackingCard'
import { LowFuelAlertsCard } from '@/app/(portal)/fuel/components/LowFuelAlertsCard'

/** A /vehicles?has_fuel=true row, with only what the fuel pages read. */
const vehicle = (id: number, level: Record<string, unknown> | null, attributes: Record<string, unknown> = {}): FuelVehicle => ({
    id: String(id),
    attributes: { registration_number: `LAG-${id}-XY`, make: 'toyota', model: 'hilux', device_online: true, device_imei: `35000000000000${id}`, ...attributes },
    fuel_level: level,
} as unknown as FuelVehicle)

const row = (over: Partial<VehicleRow>): VehicleRow => ({
    id: 1, registration: 'LAG-1-XY', model: 'Toyota Hilux', chassis: '1', fuelPercent: 50, fuelLiters: 40, online: true, location: null, lat: null, lng: null, status: 'parked', lastSeen: null, ...over,
})

describe('a level or litre figure is a real number or nothing', () => {
    it('keeps unknown litres unknown instead of showing 0.0 L', () => {
        const percentOnly = mapVehicleRow(vehicle(1, { fuel_level_percent: 12.4, fuel_level_liters: null, last_updated: '2026-11-10T09:00:00Z' }))
        expect(percentOnly.fuelPercent).toBe(12)
        expect(percentOnly.fuelLiters).toBeNull()
    })

    it('reads real figures, rounded as before, and a missing reading as null', () => {
        expect(mapVehicleRow(vehicle(2, { fuel_level_percent: 61.6, fuel_level_liters: 49.25 }))).toMatchObject({ fuelPercent: 62, fuelLiters: 49.3 })
        expect(mapVehicleRow(vehicle(3, null))).toMatchObject({ fuelPercent: null, fuelLiters: null })
        expect(levelFigure('', 1)).toBeNull()
        expect(levelFigure('abc', 1)).toBeNull()
        expect(levelFigure(0, 1)).toBe(0) // a real zero is a reading
    })

    it('carries when the level was reported, from whichever field the API fills', () => {
        expect(mapVehicleRow(vehicle(4, { fuel_level_percent: 40, last_updated: '2026-11-10T08:30:00Z' })).lastSeen).toBe('2026-11-10T08:30:00Z')
        expect(mapVehicleRow(vehicle(5, null)).lastSeen).toBeNull()
    })

    it('shows no time rather than the current one', () => {
        expect(formatLastSeen(null)).toBe('—')
        expect(formatLastSeen('')).toBe('—')
        expect(formatLastSeen('not a date')).toBe('—')
    })
})

describe('the low-fuel list is real readings only', () => {
    it('lists vehicles at or below 20%, lowest first, at most five', () => {
        const vehicles = [18, 5, 20, 21, 10, 3, 19, 8].map((p, i) => row({ id: i + 1, registration: `R${i + 1}`, fuelPercent: p }))

        const low = lowFuelVehicles(vehicles)

        expect(low.map((v) => v.fuelPercent)).toEqual([3, 5, 8, 10, 18])
    })

    it('invents nothing: no reading, no row, and no filler when nothing is low', () => {
        expect(lowFuelVehicles([row({ fuelPercent: null }), row({ id: 2, fuelPercent: 55 })])).toEqual([])
        expect(lowFuelVehicles([])).toEqual([])
    })

    it('shows the time the level was reported, not now, and unknown litres as a dash', () => {
        const [low] = lowFuelVehicles([row({ fuelPercent: 12, fuelLiters: null, lastSeen: null })])

        expect(low).toMatchObject({ fuelLiters: null, time: '—' })
    })

    it('renders the model, the report time and an empty state that says what it means', () => {
        const { rerender } = render(<LowFuelAlertsCard alerts={[{ id: 1, registration: 'LAG-1-XY', model: 'Toyota Hilux', fuelPercent: 12, fuelLiters: null, time: '09:00 AM' }]} />)
        expect(screen.getByText(/12%/)).toBeInTheDocument()
        expect(screen.getByText(/Toyota Hilux · reported 09:00 AM/)).toBeInTheDocument()
        expect(screen.getByText(/\(— L\)/)).toBeInTheDocument()

        rerender(<LowFuelAlertsCard alerts={[]} />)
        expect(screen.getByText('No vehicle is reporting a low fuel level.')).toBeInTheDocument()
    })
})

describe('the fleet map card does not pretend to be live', () => {
    it('says when the list was fetched, with no Live badge and no clock time', () => {
        render(<RealtimeTrackingCard markers={[]} vehicles={[]} updatedAt={new Date('2026-11-10T09:15:30').getTime()} />)

        expect(screen.getByText(/Refreshed 09:15:30 AM/)).toBeInTheDocument()
        expect(screen.queryByText('Live')).not.toBeInTheDocument()
        expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument()
    })

    it('says it is loading before the first fetch', () => {
        render(<RealtimeTrackingCard markers={[]} vehicles={[]} />)

        expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
})

describe('the Real-time tab’s data is real or absent', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>{children}</QueryClientProvider>
    )
    const pagination = { current: 1, lastPage: 1, total: 1, perPage: 15 }

    beforeEach(() => {
        vi.clearAllMocks()
        api.getFuelLevelTrend.mockResolvedValue({ data: { trend: [] } })
        api.getFuelRateTrend.mockResolvedValue({ data: { trend: [] } })
        api.getFuelEvents.mockResolvedValue({ data: { fuel_transactions: [], pagination } })
        api.getFuelVehiclesRealtime.mockResolvedValue({
            data: { vehicles: [vehicle(1, { fuel_level_percent: 12.4, fuel_level_liters: null, last_updated: '2026-11-10T09:00:00Z' }), vehicle(2, { fuel_level_percent: 60, fuel_level_liters: 48, tank_capacity: 80 })], pagination },
        })
    })

    it('does not crash on a percent-only vehicle, keeps its litres unknown, and does not call a vehicle with no speed idle', async () => {
        const { result } = renderHook(() => useFuelRealtime(null), { wrapper })

        await waitFor(() => expect(result.current.vehicles).toHaveLength(2))
        const [percentOnly, withLitres] = result.current.vehicles
        expect(percentOnly).toMatchObject({ fuelPercent: 12, fuelLiters: null, status: 'parked' })
        expect(withLitres).toMatchObject({ fuelPercent: 60, fuelLiters: 48 })
    })

    it('has no hard-coded KPIs', async () => {
        const { result } = renderHook(() => useFuelRealtime(null), { wrapper })

        await waitFor(() => expect(result.current.vehicles).toHaveLength(2))
        expect(Object.keys(result.current.kpis).sort()).toEqual(['lowFuelCount', 'online', 'onlinePercent', 'total', 'totalFuelLiters'])
        expect(result.current.kpis).toMatchObject({ total: 2, online: 2, lowFuelCount: 1, totalFuelLiters: 48 })
    })

    it('shows no events when there are none, instead of invented ones', async () => {
        const { result } = renderHook(() => useFuelRealtime(null), { wrapper })

        await waitFor(() => expect(result.current.isEventsLoading).toBe(false))
        expect(result.current.events).toEqual([])
    })

    it('does not call an unknown event type an idle alert', async () => {
        api.getFuelEvents.mockResolvedValue({ data: { fuel_transactions: [{ id: 9, attributes: { type: 'sensor_malfunction', occurred_at: '2026-11-09T10:00:00Z' } }], pagination } })
        const { result } = renderHook(() => useFuelRealtime(null), { wrapper })

        await waitFor(() => expect(result.current.events).toHaveLength(1))
        expect(result.current.events[0].kind).toBe('other')
    })
})
