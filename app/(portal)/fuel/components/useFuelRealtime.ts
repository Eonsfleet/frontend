'use client'

/**
 * Data layer for the Real-time Tracking tab.
 *
 * Real data: getFuelVehicles (the rail + fleet KPIs), getFuelLevelTrend/
 * getFuelRateTrend (Fuel Level Trend / Fuel Flow Rate charts — fleet-wide
 * when no vehicle is selected, scoped to the selected vehicle otherwise;
 * vehicle_id is simply omitted from the request rather than skipping the
 * fetch, same convention as getFuelEvents). Fields the fuel API does not
 * expose — driver, group, engine status, speed, odometer, fuel-flow rate,
 * engine hours, recent events, GSM signal — are filled with deterministic,
 * clearly-flagged mock values keyed off the vehicle id so they are stable
 * and swappable later.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subHours } from 'date-fns'
import { getFuelEvents, getFuelLevelTrend, getFuelRateTrend, getFuelVehicles, type FuelEventApiItem, type FuelLevelTrendFilter, type FuelLevelTrendPoint, type FuelRateTrendFilter } from '@/lib/api/fuel'
import type { FuelVehicle } from '@/types/fuel'
import type { VehicleMovement } from './useFuelOverview'
import { useFuelLiveSync, type FuelLiveOverride } from './useFuelLiveSync'

// ── Rail row ─────────────────────────────────────────────────────────────────

export interface RealtimeVehicle {
    id: number
    registration: string
    model: string
    fuelPercent: number | null
    fuelLiters: number | null
    status: VehicleMovement
    speedKmh: number
    odometerKm: number | null
    position: [number, number] | null
    /** 0–4 bars — mock GSM signal strength. */
    signal: number
}

function toNumber(value: unknown): number | null {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

// The /fuel/vehicles payload has no speed/odometer/device_status field and no
// `relationships` block — those only ever arrive live, via the WS overlay
// (see useFuelLiveSync) — so the REST-only baseline is honestly just
// coordinates + device_online, not a defensive read of fields that never exist.
function vehiclePosition(v: RealtimeVehicleSource): [number, number] | null {
    const lat = toNumber(v.attributes.coordinates?.latitude)
    const lng = toNumber(v.attributes.coordinates?.longitude)
    return lat != null && lng != null ? [lat, lng] : null
}

function isVehicleOnline(v: RealtimeVehicleSource): boolean {
    return v.attributes.device_online === true
}

function deriveStatus(online: boolean, speedKmh: number): VehicleMovement {
    if (!online) return 'offline'
    return speedKmh > 0 ? 'moving' : 'idle'
}

function mapRealtimeVehicle(v: RealtimeVehicleSource, index: number, live?: FuelLiveOverride): RealtimeVehicle {
    const id = toNumber(v.id) ?? index
    const online = live?.isOnline ?? isVehicleOnline(v)
    const speedKmh = live?.speedKmh ?? 0
    const fuelLevel = fuelLevelFor(v)
    const position: [number, number] | null =
        live?.lat != null && live?.lng != null ? [live.lat, live.lng] : vehiclePosition(v)
    return {
        id,
        registration: v.attributes.registration_number,
        model: `${v.attributes.make} ${v.attributes.model}`.trim(),
        fuelPercent: live?.fuelPercent ?? (fuelLevel ? Math.round(fuelLevel.fuel_level_percent) : null),
        fuelLiters: live?.fuelLiters ?? (fuelLevel ? Number(fuelLevel.fuel_level_liters.toFixed(1)) : null),
        status: deriveStatus(online, speedKmh),
        speedKmh,
        odometerKm: null,
        position,
        signal: online ? 2 + ((id + index) % 3) : 0,
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
    value: number | null
}

export interface FuelEvent {
    id: string
    kind: 'refill_started' | 'refill_completed' | 'low' | 'drain' | 'idle'
    title: string
    time: string
    detail: string
}

export interface FuelEventsPagination {
    current: number
    lastPage: number
    total: number
    perPage: number
}

const DRIVERS = ['John Okeke', 'Amaka Nwosu', 'Musa Bello', 'Grace Eze', 'Tunde Bakare']
const GROUPS = ['Heavy Trucks', 'Distribution', 'Long Haul', 'Regional']
const LOCATIONS = ['Lekki-Epe Expressway, Lagos', 'Ikeja, Lagos', 'Ojota, Lagos', 'Apapa, Lagos', 'Victoria Island, Lagos']
type RealtimeVehicleSource = FuelVehicle

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function fuelLevelFor(v: RealtimeVehicleSource) {
    return 'fuel_level' in v ? v.fuel_level : null
}

function capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value
}

function buildDetail(v: RealtimeVehicle, raw: RealtimeVehicleSource | undefined, capacity: number): VehicleDetail {
    const s = v.id
    const pct = v.fuelPercent ?? 0
    const liters = v.fuelLiters ?? 0
    const fuelLevel = raw ? fuelLevelFor(raw) : null
    const lastUpdatedDate = fuelLevel?.last_updated ? new Date(fuelLevel.last_updated) : null
    const lastUpdated =
        lastUpdatedDate && !Number.isNaN(lastUpdatedDate.getTime())
            ? format(lastUpdatedDate, 'hh:mm:ss a')
            : format(new Date(), 'hh:mm:ss a')

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
        lastUpdated,
        fuelStatus: pct <= 20 ? 'Low' : 'Normal',
        engineOn: v.status !== 'offline',
        speedKmh: Math.round(v.speedKmh),
        odometerKm: Math.round(v.odometerKm ?? 20000 + s * 137),
        liveFuel: [
            { label: 'Fuel Level', value: `${liters} L` },
            { label: 'Fuel Type', value: raw?.attributes.fuel_type ? capitalize(raw.attributes.fuel_type) : 'Unknown' },
            {
                label: 'Data Quality',
                value: fuelLevel?.data_quality_score != null ? `${Math.round(fuelLevel.data_quality_score * 100)}%` : '—',
            },
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

function eventRows(payload: Awaited<ReturnType<typeof getFuelEvents>> | undefined): FuelEventApiItem[] {
    const data = payload?.data
    if (Array.isArray(data)) return data
    return data?.fuel_transactions ?? data?.events ?? []
}

function eventPagination(payload: Awaited<ReturnType<typeof getFuelEvents>> | undefined): FuelEventsPagination | null {
    const data = payload?.data
    if (!data || Array.isArray(data) || !data.pagination) return null

    const pagination = data.pagination as Record<string, unknown>
    return {
        current: Number(pagination.current ?? pagination.current_page ?? 1),
        lastPage: Number(pagination.lastPage ?? pagination.last_page ?? 1),
        total: Number(pagination.total ?? 0),
        perPage: Number(pagination.perPage ?? pagination.per_page ?? 15),
    }
}

function eventAttribute(item: FuelEventApiItem, key: string) {
    return item[key] ?? item.attributes?.[key]
}

function eventKind(value: unknown): FuelEvent['kind'] {
    const type = String(value ?? '').toLowerCase()
    if (type.includes('refill')) return 'refill_started'
    if (type.includes('low')) return 'low'
    if (type.includes('drain') || type.includes('theft') || type.includes('leak')) return 'drain'
    return 'idle'
}

function mapFuelEvent(item: FuelEventApiItem, index: number): FuelEvent {
    const attributes = asRecord(item.attributes)
    const vehicle = asRecord(asRecord(item.relationships).vehicle)
    const type = String(eventAttribute(item, 'type') ?? 'event').toLowerCase()
    const kind = eventKind(type)
    const timestamp = String(eventAttribute(item, 'occurred_at') ?? eventAttribute(item, 'detected_at') ?? eventAttribute(item, 'timestamp') ?? eventAttribute(item, 'created_at') ?? '')
    const date = new Date(timestamp)
    const amount = Number(eventAttribute(item, 'amount_liters') ?? eventAttribute(item, 'volume_liters') ?? eventAttribute(item, 'liters'))
    const registration = String(vehicle.registration_number ?? attributes.registration_number ?? '')
    const title =
        type === 'refill'
            ? 'Fuel Refill'
            : type === 'leakage'
                ? 'Fuel Leakage'
                : type === 'theft'
                    ? 'Suspected Fuel Theft'
                    : String(eventAttribute(item, 'title') ?? 'Fuel Event')

    return {
        id: String(item.id ?? eventAttribute(item, 'id') ?? index),
        kind,
        title,
        time: timestamp && !Number.isNaN(date.getTime()) ? format(date, 'MMM d, yyyy hh:mm a') : '—',
        detail: [
            Number.isFinite(amount) ? `${amount.toFixed(1)} L` : null,
            registration || null,
        ].filter(Boolean).join(' • ') || '—',
    }
}

type TrendPayload = Awaited<ReturnType<typeof getFuelLevelTrend>> | Awaited<ReturnType<typeof getFuelRateTrend>>

function trendRows(payload: TrendPayload | undefined): FuelLevelTrendPoint[] {
    const data = payload?.data
    if (Array.isArray(data)) return data
    if (data?.labels?.length) {
        const values = data.fuel_data ?? data.rate_data ?? data.flow_data ?? data.values ?? []
        return data.labels.map((label, index) => ({
            label,
            value: values[index] ?? null,
        }))
    }
    return data?.trend ?? data?.history ?? []
}

function formatTrendLabel(value: FuelLevelTrendPoint, fallbackIndex: number) {
    if (value.label) return value.label
    const raw = value.timestamp ?? value.date
    if (!raw) return `#${fallbackIndex + 1}`
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? raw : format(date, 'HH:mm')
}

function trendValue(value: FuelLevelTrendPoint) {
    const raw = value.fuel_level_liters ?? value.liters ?? value.rate ?? value.flow_rate ?? value.fuel_rate ?? value.value ?? value.fuel_level_percent
    if (raw == null) return null
    const number = Number(raw)
    return Number.isFinite(number) ? Number(number.toFixed(1)) : null
}

function trendUnit(payload: TrendPayload | undefined, fallback = 'L') {
    const data = payload?.data
    if (!data || Array.isArray(data)) return fallback
    const unit = String(data.unit ?? '').toLowerCase()
    if (unit.includes('percent')) return '%'
    if (unit.includes('liter') || unit.includes('litre')) return 'L'
    return data.unit ?? fallback
}

function vehicleRows(payload: unknown): RealtimeVehicleSource[] {
    if (Array.isArray(payload)) return payload
    const data = payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data?: unknown }).data
        : null
    if (data && typeof data === 'object' && 'vehicles' in data) {
        const vehicles = (data as { vehicles?: unknown }).vehicles
        return Array.isArray(vehicles) ? vehicles : []
    }
    return []
}

function vehiclePagination(payload: Awaited<ReturnType<typeof getFuelVehicles>>) {
    const pagination = payload.data.pagination as unknown as Record<string, unknown>
    return {
        current: Number(pagination.current ?? pagination.current_page ?? 1),
        lastPage: Number(pagination.lastPage ?? pagination.last_page ?? 1),
    }
}

async function getAllFuelRealtimeVehicles(): Promise<FuelVehicle[]> {
    const perPage = 100
    const firstPage = await getFuelVehicles({ page: 1, per_page: perPage })
    const vehicles = [...vehicleRows(firstPage)]
    const { lastPage } = vehiclePagination(firstPage)

    for (let page = 2; page <= lastPage; page += 1) {
        const response = await getFuelVehicles({ page, per_page: perPage })
        vehicles.push(...vehicleRows(response))
    }

    return vehicles
}

export function useFuelRealtime(selectedId: number | null, levelTrendFilter: FuelLevelTrendFilter = 'daily', eventsPage = 1, rateTrendFilter: FuelRateTrendFilter = 'daily') {
    const vehiclesQuery = useQuery({
        queryKey: ['fuel-realtime', 'vehicles', 'fuel-all-pages'],
        queryFn: getAllFuelRealtimeVehicles,
        refetchInterval: 10_000,
    })

    const raw = useMemo(() => vehicleRows(vehiclesQuery.data), [vehiclesQuery.data])

    // Live overlay from the same WS channels tracking uses — fills in
    // coordinates/online-status/fuel-level/speed between the 10s REST polls.
    const live = useFuelLiveSync()
    const vehicles = useMemo<RealtimeVehicle[]>(
        () => raw.map((v, index) => mapRealtimeVehicle(v, index, live[toNumber(v.id) ?? -1])),
        [raw, live],
    )

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

    const selectedRaw = raw.find((v) => toNumber(v.id) === activeId)
    const detail = useMemo<VehicleDetail | null>(() => {
        const row = vehicles.find((v) => v.id === activeId)
        if (!row) return null
        const capacity = (selectedRaw ? fuelLevelFor(selectedRaw)?.tank_capacity : null) ?? selectedRaw?.attributes.fuel_capacity ?? 100
        return buildDetail(row, selectedRaw, Math.round(capacity))
    }, [vehicles, activeId, selectedRaw])

    // Real fuel-level trend → Fuel Level Trend chart. Always runs, whether or
    // not a vehicle is selected — vehicle_id omitted means "fleet-wide",
    // mirroring the eventsQuery convention below.
    const levelTrendQuery = useQuery({
        queryKey: ['fuel-realtime', 'level-trend', activeId, levelTrendFilter],
        queryFn: () => getFuelLevelTrend({ vehicle_id: activeId ?? undefined, filter: levelTrendFilter }),
    })

    const fuelLevelTrend = useMemo<TrendPoint[]>(() => {
        return trendRows(levelTrendQuery.data).map((row, index) => ({
            label: formatTrendLabel(row, index),
            value: trendValue(row),
        }))
    }, [levelTrendQuery.data])

    const fuelLevelTrendUnit = useMemo(() => trendUnit(levelTrendQuery.data), [levelTrendQuery.data])

    const rateTrendQuery = useQuery({
        queryKey: ['fuel-realtime', 'rate-trend', activeId, rateTrendFilter],
        queryFn: () => getFuelRateTrend({ vehicle_id: activeId ?? undefined, filter: rateTrendFilter }),
    })

    const fuelFlowTrend = useMemo<TrendPoint[]>(() => {
        return trendRows(rateTrendQuery.data).map((row, index) => ({
            label: formatTrendLabel(row, index),
            value: trendValue(row),
        }))
    }, [rateTrendQuery.data])

    const fuelFlowTrendUnit = useMemo(() => trendUnit(rateTrendQuery.data, 'L/h'), [rateTrendQuery.data])

    const eventsQuery = useQuery({
        queryKey: ['fuel-realtime', 'events', activeId, eventsPage],
        queryFn: () => getFuelEvents({ vehicle_id: activeId ?? undefined, page: eventsPage, per_page: 15 }),
        placeholderData: (previousData) => previousData,
        refetchInterval: 60_000,
    })

    const events = useMemo<FuelEvent[]>(() => {
        const rows = eventRows(eventsQuery.data)
        if (rows.length > 0) return rows.map(mapFuelEvent)
        return mockEvents(activeId ?? 0)
    }, [activeId, eventsQuery.data])

    const eventsPagination = useMemo(() => eventPagination(eventsQuery.data), [eventsQuery.data])

    return {
        vehicles,
        activeId,
        kpis,
        detail,
        fuelLevelTrend,
        fuelLevelTrendUnit,
        fuelFlowTrend,
        fuelFlowTrendUnit,
        events,
        eventsPagination,
        isFuelLevelTrendLoading: levelTrendQuery.isFetching,
        isFuelFlowTrendLoading: rateTrendQuery.isFetching,
        isEventsLoading: eventsQuery.isLoading && !eventsQuery.data,
        isEventsRefreshing: eventsQuery.isFetching && !!eventsQuery.data,
        isLoading: vehiclesQuery.isLoading,
        isError: vehiclesQuery.isError,
    }
}
