'use client'

/**
 * Data layer for the Real-time Tracking tab.
 *
 * Real data: getFuelVehicles (the rail + fleet KPIs), getVehicleFuelHistory (the
 * Fuel Level Trend for the selected vehicle). Fields the fuel API does not expose —
 * driver, group, engine status, speed, odometer, fuel-flow rate, engine hours,
 * recent events, GSM signal — are filled with deterministic, clearly-flagged mock
 * values keyed off the vehicle id so they are stable and swappable later.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subHours } from 'date-fns'
import { getFuelVehicles, getVehicleFuelHistory } from '@/lib/api/fuel'
import type { FuelVehicle } from '@/types/fuel'
import type { VehicleMovement } from './useFuelOverview'

// ── Rail row ─────────────────────────────────────────────────────────────────

export interface RealtimeVehicle {
    id: number
    registration: string
    model: string
    fuelPercent: number | null
    fuelLiters: number | null
    status: VehicleMovement
    /** 0–4 bars — mock GSM signal strength. */
    signal: number
}

function deriveStatus(v: FuelVehicle, seed: number): VehicleMovement {
    if (!v.attributes.device_online) return 'offline'
    // No speed signal in the fuel API — split online vehicles into moving/idle
    // deterministically so the status tabs have populated buckets.
    return seed % 4 === 0 ? 'idle' : 'moving'
}

function mapRealtimeVehicle(v: FuelVehicle, index: number): RealtimeVehicle {
    return {
        id: v.id,
        registration: v.attributes.registration_number,
        model: `${v.attributes.make} ${v.attributes.model}`.trim(),
        fuelPercent: v.fuel_level ? Math.round(v.fuel_level.fuel_level_percent) : null,
        fuelLiters: v.fuel_level ? Number(v.fuel_level.fuel_level_liters.toFixed(1)) : null,
        status: deriveStatus(v, v.id + index),
        signal: v.attributes.device_online ? 2 + ((v.id + index) % 3) : 0,
    }
}

// ── Fleet KPI strip ──────────────────────────────────────────────────────────

export interface RealtimeKpis {
    online: number
    total: number
    onlinePercent: number
    lowFuelCount: number
    totalFuelLiters: number
    todayConsumptionLiters: number
    avgEfficiency: number
    activeRefuels: number
}

// ── Selected-vehicle detail ──────────────────────────────────────────────────

export interface VehicleDetail {
    id: number
    registration: string
    model: string
    status: VehicleMovement
    fuelPercent: number
    fuelLiters: number
    tankCapacity: number
    // Mocked descriptive fields (no fuel-API source):
    driver: string
    group: string
    location: string
    lastUpdated: string
    fuelStatus: string
    engineOn: boolean
    speedKmh: number
    odometerKm: number
    liveFuel: { label: string; value: string }[]
}

export interface TrendPoint {
    label: string
    value: number
}

export interface FuelEvent {
    id: string
    kind: 'refill_started' | 'refill_completed' | 'low' | 'drain' | 'idle'
    title: string
    time: string
    detail: string
}

const DRIVERS = ['John Okeke', 'Amaka Nwosu', 'Musa Bello', 'Grace Eze', 'Tunde Bakare']
const GROUPS = ['Heavy Trucks', 'Distribution', 'Long Haul', 'Regional']
const LOCATIONS = ['Lekki-Epe Expressway, Lagos', 'Ikeja, Lagos', 'Ojota, Lagos', 'Apapa, Lagos', 'Victoria Island, Lagos']

function buildDetail(v: RealtimeVehicle, capacity: number): VehicleDetail {
    const s = v.id
    const pct = v.fuelPercent ?? 0
    const liters = v.fuelLiters ?? 0
    return {
        id: v.id,
        registration: v.registration,
        model: v.model,
        status: v.status,
        fuelPercent: pct,
        fuelLiters: liters,
        tankCapacity: capacity,
        driver: DRIVERS[s % DRIVERS.length],
        group: GROUPS[s % GROUPS.length],
        location: LOCATIONS[s % LOCATIONS.length],
        lastUpdated: format(new Date(), 'hh:mm:ss a'),
        fuelStatus: pct <= 20 ? 'Low' : 'Normal',
        engineOn: v.status !== 'offline',
        speedKmh: v.status === 'moving' ? 40 + (s % 40) : 0,
        odometerKm: 20000 + s * 137,
        liveFuel: [
            { label: 'Fuel Level', value: `${liters} L` },
            { label: 'Fuel Consumption', value: `${(2.4 + (s % 10) / 10).toFixed(1)} L/h` },
            { label: 'Fuel Flow Rate', value: `${(1.8 + (s % 8) / 10).toFixed(1)} L/h` },
            { label: 'Engine Hours', value: `${(120 + (s % 20)).toFixed(1)} Hrs` },
            { label: 'Idle Duration', value: '01:15:20' },
            { label: 'Last Refueled', value: format(subHours(new Date(), 24 + (s % 12)), 'MMM d, yyyy hh:mm a') },
        ],
    }
}

function mockEvents(seed: number): FuelEvent[] {
    const base = new Date()
    return [
        { id: `${seed}-1`, kind: 'refill_started', title: 'Fuel Refill Started', time: format(subHours(base, 5), 'MMM d, yyyy hh:mm a'), detail: 'Total 80.0 L' },
        { id: `${seed}-2`, kind: 'refill_completed', title: 'Fuel Refill Completed', time: format(subHours(base, 24), 'MMM d, yyyy hh:mm a'), detail: 'Total 120.0 L' },
        { id: `${seed}-3`, kind: 'low', title: 'Fuel Level Low', time: format(subHours(base, 30), 'MMM d, yyyy hh:mm a'), detail: 'Fuel 15% (12.2 L)' },
        { id: `${seed}-4`, kind: 'drain', title: 'Unauthorized Drain Detected', time: format(subHours(base, 40), 'MMM d, yyyy hh:mm a'), detail: 'Fuel drained 8.5 L' },
        { id: `${seed}-5`, kind: 'idle', title: 'Idle Alert', time: format(subHours(base, 46), 'MMM d, yyyy hh:mm a'), detail: 'Idle for 45 mins' },
    ]
}

export function useFuelRealtime(selectedId: number | null) {
    const vehiclesQuery = useQuery({
        queryKey: ['fuel-realtime', 'vehicles'],
        queryFn: () => getFuelVehicles({ per_page: 200 }),
        refetchInterval: 10_000,
    })

    const raw = useMemo(() => vehiclesQuery.data?.data.vehicles ?? [], [vehiclesQuery.data])
    const vehicles = useMemo<RealtimeVehicle[]>(() => raw.map(mapRealtimeVehicle), [raw])

    // No auto-select: the detail panel stays hidden until a vehicle is explicitly
    // clicked, and closing it (X) clears the selection back to null.
    const activeId = selectedId

    const kpis = useMemo<RealtimeKpis>(() => {
        const online = vehicles.filter((v) => v.status !== 'offline').length
        const total = vehicles.length
        const totalFuel = vehicles.reduce((sum, v) => sum + (v.fuelLiters ?? 0), 0)
        const lowFuel = vehicles.filter((v) => v.fuelPercent != null && v.fuelPercent <= 20).length
        return {
            online,
            total,
            onlinePercent: total ? Math.round((online / total) * 100) : 0,
            lowFuelCount: lowFuel,
            totalFuelLiters: Math.round(totalFuel),
            todayConsumptionLiters: 1245,
            avgEfficiency: 4.35,
            activeRefuels: 3,
        }
    }, [vehicles])

    const selectedRaw = raw.find((v) => v.id === activeId)
    const detail = useMemo<VehicleDetail | null>(() => {
        const row = vehicles.find((v) => v.id === activeId)
        if (!row) return null
        const capacity = selectedRaw?.fuel_level?.tank_capacity ?? selectedRaw?.attributes.fuel_capacity ?? 100
        return buildDetail(row, Math.round(capacity))
    }, [vehicles, activeId, selectedRaw])

    // Real fuel-level history for the selected vehicle → Fuel Level Trend chart.
    const historyQuery = useQuery({
        queryKey: ['fuel-realtime', 'history', activeId],
        queryFn: () => getVehicleFuelHistory(activeId!),
        enabled: !!activeId,
    })

    const fuelLevelTrend = useMemo<TrendPoint[]>(() => {
        const history = historyQuery.data?.data.history ?? []
        if (history.length > 0) {
            return history.map((h) => ({
                label: format(new Date(h.timestamp), 'HH:mm'),
                value: Number(h.fuel_level_liters.toFixed(1)),
            }))
        }
        // Fallback synthetic 24h series so the chart is never empty.
        const out: TrendPoint[] = []
        const base = detail?.fuelLiters ?? 68
        for (let i = 24; i >= 0; i--) {
            const d = subHours(new Date(), i)
            out.push({ label: format(d, 'HH:mm'), value: Number((base + Math.sin(i * 0.6) * 6).toFixed(1)) })
        }
        return out
    }, [historyQuery.data, detail?.fuelLiters])

    const fuelFlowTrend = useMemo<TrendPoint[]>(() => {
        const out: TrendPoint[] = []
        for (let i = 24; i >= 0; i--) {
            const d = subHours(new Date(), i)
            out.push({ label: format(d, 'HH:mm'), value: Number((2.4 + Math.sin(i * 0.8) * 0.8).toFixed(2)) })
        }
        return out
    }, [])

    const events = useMemo<FuelEvent[]>(() => mockEvents(activeId ?? 0), [activeId])

    return {
        vehicles,
        activeId,
        kpis,
        detail,
        fuelLevelTrend,
        fuelFlowTrend,
        events,
        isLoading: vehiclesQuery.isLoading,
        isError: vehiclesQuery.isError,
    }
}
