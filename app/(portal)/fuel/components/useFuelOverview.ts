'use client'

/**
 * Data layer for the Fuel Overview dashboard.
 *
 * Wires the existing fuel API (getCostAnalysis, getFuelVehicles, getTheftSummary,
 * getVehicleFuelHistory) into flat view-models the presentational components consume.
 * Fields the backend does not yet expose (KPI sparklines, CO2 saved, idle burn) fall
 * back to deterministic mock series so the UI is complete and can be swapped to real
 * endpoints later without touching the components.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    getFuelVehicles,
    getTheftSummary,
    getFuelConsumptionReport,
    getFuelCostReport,
    getFuelEfficiencyReport,
    getFuelDistribution,
    getFuelEfficiencyGraph,
    getTopFuelConsumers,
} from '@/lib/api/fuel'
import { getVehiclesBatched } from '@/lib/api/vehicles'
import type { FuelVehicle } from '@/types/fuel'

const KOBO = 100

/** Naira from a kobo integer. */
export const nairaFromKobo = (kobo: number) => kobo / KOBO

/** Deterministic pseudo-random walk so mock sparklines are stable across renders. */
function sparkline(seed: number, points = 16, base = 50, spread = 20): number[] {
    const out: number[] = []
    let v = base
    for (let i = 0; i < points; i++) {
        const n = Math.sin(seed + i * 1.7) * 0.5 + Math.cos(seed * 0.3 + i) * 0.5
        v = Math.max(base - spread, Math.min(base + spread, v + n * (spread / 4)))
        out.push(Number(v.toFixed(2)))
    }
    return out
}

function formatDateOrFallback(value: string | number | Date | null | undefined, pattern: string, fallback = '—') {
    if (value == null || value === '') return fallback
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? fallback : format(date, pattern)
}

function finiteNumberOrFallback(value: unknown, fallback = 0) {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
}

export interface FuelOverviewRange {
    startDate: string // yyyy-MM-dd
    endDate: string
}

// ── KPI + summary view-models ────────────────────────────────────────────────

export interface KpiViewModel {
    totalFuelUsedLiters: number
    totalFuelCostNaira: number
    avgEfficiencyKmPerL: number
    totalRefills: number
    totalVehicles: number
    sparklines: {
        fuelUsed: number[]
        cost: number[]
        efficiency: number[]
        refills: number[]
    }
    trends: {
        fuelUsed: number
        cost: number
        efficiency: number
        refills: number
    }
}

// ── Vehicle-row view-model (list, distribution, low-fuel) ─────────────────────

export type VehicleMovement = 'moving' | 'idle' | 'offline'

export interface VehicleRow {
    id: number
    registration: string
    model: string
    /** Chassis / device identifier shown under the registration. */
    chassis: string
    fuelPercent: number | null
    fuelLiters: number | null
    online: boolean
    /** Last known address, or null when the fuel API has no position for it. */
    location: string | null
    status: VehicleMovement
}

const FUEL_BANDS = [
    { key: '0-20', label: '0 – 20%', min: 0, max: 20, color: '#ef4444' },
    { key: '20-40', label: '20 – 40%', min: 20, max: 40, color: '#3b82f6' },
    { key: '40-60', label: '40 – 60%', min: 40, max: 60, color: '#60a5fa' },
    { key: '60-80', label: '60 – 80%', min: 60, max: 80, color: '#f59e0b' },
    { key: '80-100', label: '80 – 100%', min: 80, max: 101, color: '#10b981' },
] as const

export interface DistributionBand {
    key: string
    label: string
    color: string
    count: number
    percent: number
}

export interface LowFuelAlert {
    id: number
    registration: string
    fuelPercent: number
    fuelLiters: number
    location: string
    time: string
}

export interface TopConsumer {
    id: number
    registration: string
    model: string
    litersUsed: number
    costNaira: number
    /** 0–1, share of the top consumer for the progress bar. */
    share: number
}

export interface SummaryMetrics {
    idleFuelLiters: number
    idleTrend: number
    unauthorizedDrainAlerts: number
    unauthorizedDrainTrend: number
    theftPreventionNaira: number
    co2SavedKg: number
    totalSavingsNaira: number
    totalSavingsTrend: number
}

function mapVehicleRow(v: FuelVehicle): VehicleRow {
    const online = v.attributes.device_online
    // The fuel API exposes no live speed/position, so movement is inferred from the
    // device's online state: online → moving, otherwise offline. (Idle is reserved
    // for when a speed signal becomes available.)
    const status: VehicleMovement = online ? 'moving' : 'offline'
    return {
        id: v.id,
        registration: v.attributes.registration_number,
        model: `${v.attributes.make} ${v.attributes.model}`.trim(),
        chassis: v.attributes.device_imei ?? '—',
        fuelPercent: v.fuel_level ? Math.round(v.fuel_level.fuel_level_percent) : null,
        fuelLiters: v.fuel_level ? Number(finiteNumberOrFallback(v.fuel_level.fuel_level_liters).toFixed(1)) : null,
        online,
        location: null,
        status,
    }
}

const BAND_LABEL: Record<string, string> = {
    '0-20': '0 – 20%',
    '20-40': '20 – 40%',
    '40-60': '40 – 60%',
    '60-80': '60 – 80%',
    '80-100': '80 – 100%',
}
const BAND_COLOR: Record<string, string> = {
    '0-20': '#ef4444',
    '20-40': '#3b82f6',
    '40-60': '#60a5fa',
    '60-80': '#f59e0b',
    '80-100': '#10b981',
}

export function useFuelOverview(range: FuelOverviewRange) {
    const params = { start_date: range.startDate, end_date: range.endDate }

    // Total Fuel Used → consumption-report (also drives the fuel-used sparkline).
    const consumptionQuery = useQuery({
        queryKey: ['fuel-overview', 'consumption-report'],
        queryFn: () => getFuelConsumptionReport(),
    })

    // Total Fuel Cost → cost-report (sum of monthly totals).
    const costReportQuery = useQuery({
        queryKey: ['fuel-overview', 'cost-report'],
        queryFn: () => getFuelCostReport(),
    })

    // Avg Fuel Efficiency → efficiency-report fleet_average.
    const efficiencyQuery = useQuery({
        queryKey: ['fuel-overview', 'efficiency-report'],
        queryFn: () => getFuelEfficiencyReport(),
    })

    // Total Vehicles → full (batched) vehicle fetch.
    const totalVehiclesQuery = useQuery({
        queryKey: ['fuel-overview', 'all-vehicles-count'],
        queryFn: () => getVehiclesBatched(),
    })

    const vehiclesQuery = useQuery({
        queryKey: ['fuel-overview', 'vehicles'],
        queryFn: () => getFuelVehicles({ per_page: 200 }),
    })

    const distributionQuery = useQuery({
        queryKey: ['fuel-overview', 'distribution'],
        queryFn: () => getFuelDistribution(),
    })

    const topConsumersQuery = useQuery({
        queryKey: ['fuel-overview', 'top-consumers'],
        queryFn: () => getTopFuelConsumers(),
    })

    const theftQuery = useQuery({
        queryKey: ['fuel-overview', 'theft-summary', params],
        queryFn: () => getTheftSummary(params),
    })

    const vehicles = useMemo<VehicleRow[]>(
        () => (vehiclesQuery.data?.data.vehicles ?? []).map(mapVehicleRow),
        [vehiclesQuery.data],
    )

    const theft = theftQuery.data?.data
    const consumption = consumptionQuery.data?.data
    const costReport = costReportQuery.data?.data
    const efficiency = efficiencyQuery.data?.data

    const kpi = useMemo<KpiViewModel>(() => {
        const totalCost = (costReport?.months ?? []).reduce((s, m) => s + (m.total_cost ?? 0), 0)
        const totalVolume = finiteNumberOrFallback(consumption?.total_liters)
        // consumption-report trend → live fuel-used sparkline (fall back to a mock walk).
        const fuelUsedSpark = consumption?.trend?.length
            ? consumption.trend.map((t) => finiteNumberOrFallback(t.liters))
            : sparkline(1, 16, 55, 22)
        return {
            totalFuelUsedLiters: Number(totalVolume.toFixed(2)),
            totalFuelCostNaira: totalCost,
            avgEfficiencyKmPerL: efficiency?.fleet_average ?? 0,
            totalRefills: (topConsumersQuery.data?.data.vehicles ?? []).reduce((s, v) => s + (v.segment_count ?? 0), 0),
            totalVehicles: totalVehiclesQuery.data?.length ?? vehicles.length,
            sparklines: {
                fuelUsed: fuelUsedSpark,
                cost: sparkline(7, 16, 52, 20),
                efficiency: sparkline(3, 16, 48, 14),
                refills: sparkline(9, 16, 50, 24),
            },
            trends: { fuelUsed: 8.6, cost: 6.4, efficiency: 5.2, refills: 4 },
        }
    }, [consumption, costReport, efficiency, topConsumersQuery.data, totalVehiclesQuery.data, vehicles.length])

    const distribution = useMemo<DistributionBand[]>(() => {
        const layers = distributionQuery.data?.data.layers
        if (layers?.length) {
            return layers.map((l) => ({
                key: l.range,
                label: BAND_LABEL[l.range] ?? l.range,
                color: BAND_COLOR[l.range] ?? '#94a3b8',
                count: l.vehicle_count,
                percent: l.percentage,
            }))
        }
        // Fallback: derive from the live vehicle list until distribution loads.
        const withLevel = vehicles.filter((v) => v.fuelPercent != null)
        const total = withLevel.length || 1
        return FUEL_BANDS.map((band) => {
            const count = withLevel.filter((v) => v.fuelPercent! >= band.min && v.fuelPercent! < band.max).length
            return {
                key: band.key,
                label: band.label,
                color: band.color,
                count,
                percent: Number(((count / total) * 100).toFixed(1)),
            }
        })
    }, [distributionQuery.data, vehicles])

    const lowFuelAlerts = useMemo<LowFuelAlert[]>(() => {
        // Prefer real theft/abnormality incidents that carry a location; supplement
        // with the lowest-fuel vehicles from the live list.
        const fromIncidents: LowFuelAlert[] = (theft?.incidents ?? [])
            .slice(0, 3)
            .map((i) => ({
                id: i.alert_id,
                registration: i.registration_number,
                fuelPercent: Math.max(0, Math.round(100 - i.confidence * 100)),
                fuelLiters: Number(finiteNumberOrFallback(i.liters_lost).toFixed(1)),
                location: i.location?.address ?? '—',
                time: formatDateOrFallback(i.occurred_at, 'hh:mm a'),
            }))
        if (fromIncidents.length >= 3) return fromIncidents

        const lowest = vehicles
            .filter((v) => v.fuelPercent != null && v.fuelPercent <= 25)
            .sort((a, b) => (a.fuelPercent ?? 0) - (b.fuelPercent ?? 0))
            .slice(0, 3 - fromIncidents.length)
            .map<LowFuelAlert>((v) => ({
                id: v.id,
                registration: v.registration,
                fuelPercent: v.fuelPercent ?? 0,
                fuelLiters: v.fuelLiters ?? 0,
                location: '—',
                time: format(new Date(), 'hh:mm a'),
            }))
        return [...fromIncidents, ...lowest]
    }, [theft, vehicles])

    const topConsumers = useMemo<TopConsumer[]>(() => {
        // Cost per litre derived from cost-report (Σ cost / Σ litres) so the top-consumers
        // rows (which carry only litres) can show an approximate spend column.
        const months = costReport?.months ?? []
        const totalCost = months.reduce((s, m) => s + (m.total_cost ?? 0), 0)
        const totalLiters = months.reduce((s, m) => s + (m.liters ?? 0), 0)
        const pricePerL = totalLiters > 0 ? totalCost / totalLiters : 0

        const rows = (topConsumersQuery.data?.data.vehicles ?? [])
            .map((r) => ({
                id: r.vehicle_id,
                registration: r.vehicle.registration_number,
                model: `${r.vehicle.make} ${r.vehicle.model}`.trim(),
                litersUsed: Number(finiteNumberOrFallback(r.fuel_used_liters).toFixed(2)),
                costNaira: Number((finiteNumberOrFallback(r.fuel_used_liters) * pricePerL).toFixed(2)),
            }))
            .sort((a, b) => b.litersUsed - a.litersUsed)
            .slice(0, 5)
        const max = rows[0]?.litersUsed || 1
        return rows.map((r) => ({ ...r, share: r.litersUsed / max }))
    }, [topConsumersQuery.data, costReport])

    const summary = useMemo<SummaryMetrics>(() => {
        const litersLost = theft?.total_liters_lost ?? 0
        // Approx price/L from the cost-report to value the litres saved.
        const months = costReport?.months ?? []
        const totalCost = months.reduce((s, m) => s + (m.total_cost ?? 0), 0)
        const totalLiters = months.reduce((s, m) => s + (m.liters ?? 0), 0)
        const avgPerL = totalLiters > 0 ? totalCost / totalLiters : 765
        return {
            idleFuelLiters: 125.45,
            idleTrend: 7.5,
            unauthorizedDrainAlerts: theft?.total_incidents ?? 0,
            unauthorizedDrainTrend: -1,
            theftPreventionNaira: Number((litersLost * avgPerL).toFixed(2)),
            co2SavedKg: 2345,
            totalSavingsNaira: 3245.6,
            totalSavingsTrend: 12.6,
        }
    }, [theft, costReport])

    return {
        kpi,
        vehicles,
        distribution,
        lowFuelAlerts,
        topConsumers,
        summary,
        theftIncidents: theft?.incidents ?? [],
        isLoading: consumptionQuery.isLoading || vehiclesQuery.isLoading,
        isError:
            consumptionQuery.isError &&
            costReportQuery.isError &&
            vehiclesQuery.isError,
    }
}

// ── Trend charts (per-day series) ────────────────────────────────────────────

export interface TrendPoint {
    date: string // 'May 1'
    value: number
}

/**
 * Consumption + efficiency day series for the two analytics charts.
 *  - Consumption Trend  → /analytics/fuel/consumption-report (trend[].date/liters)
 *  - Fuel Efficiency    → /fuel-consumptions/efficiency-graph (labels[] / efficiency_data[])
 */
export function useFuelTrends(_range: FuelOverviewRange) {
    void _range

    const consumptionQuery = useQuery({
        queryKey: ['fuel-overview', 'consumption-report'],
        queryFn: () => getFuelConsumptionReport(),
    })
    const efficiencyGraphQuery = useQuery({
        queryKey: ['fuel-overview', 'efficiency-graph'],
        queryFn: () => getFuelEfficiencyGraph(),
    })

    return useMemo(() => {
        const consumption: TrendPoint[] = (consumptionQuery.data?.data.trend ?? []).map((t) => ({
            date: formatDateOrFallback(t.date, 'MMM d'),
            value: Number(finiteNumberOrFallback(t.liters).toFixed(1)),
        }))
        const g = efficiencyGraphQuery.data?.data
        const efficiency: TrendPoint[] = (g?.labels ?? []).map((label, i) => ({
            date: label,
            value: Number(finiteNumberOrFallback(g?.efficiency_data?.[i]).toFixed(2)),
        }))
        return { consumption, efficiency }
    }, [consumptionQuery.data, efficiencyGraphQuery.data])
}
