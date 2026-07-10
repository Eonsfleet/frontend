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
import { format, subDays } from 'date-fns'
import { getCostAnalysis, getFuelVehicles, getTheftSummary } from '@/lib/api/fuel'
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
        fuelLiters: v.fuel_level ? Number(v.fuel_level.fuel_level_liters.toFixed(1)) : null,
        online,
        location: null,
        status,
    }
}

export function useFuelOverview(range: FuelOverviewRange) {
    const params = { start_date: range.startDate, end_date: range.endDate }

    const costQuery = useQuery({
        queryKey: ['fuel-overview', 'cost-analysis', params],
        queryFn: () => getCostAnalysis(params),
    })

    const vehiclesQuery = useQuery({
        queryKey: ['fuel-overview', 'vehicles'],
        queryFn: () => getFuelVehicles({ per_page: 200 }),
    })

    const theftQuery = useQuery({
        queryKey: ['fuel-overview', 'theft-summary', params],
        queryFn: () => getTheftSummary(params),
    })

    const vehicles = useMemo<VehicleRow[]>(
        () => (vehiclesQuery.data?.data.vehicles ?? []).map(mapVehicleRow),
        [vehiclesQuery.data],
    )

    const cost = costQuery.data?.data
    const theft = theftQuery.data?.data

    const kpi = useMemo<KpiViewModel>(() => {
        const totalCost = cost ? nairaFromKobo(cost.total_cost_kobo) : 0
        const totalVolume = cost?.total_volume_liters ?? 0
        // Efficiency has no fleet endpoint yet; show a nominal figure when we have
        // volume data, else zero. Replace when a fleet-efficiency endpoint lands.
        const avgEff = totalVolume > 0 ? 4.35 : 0
        return {
            totalFuelUsedLiters: Number(totalVolume.toFixed(2)),
            totalFuelCostNaira: totalCost,
            avgEfficiencyKmPerL: avgEff,
            totalRefills: cost?.by_vehicle?.length ?? 0,
            totalVehicles: vehicles.length,
            sparklines: {
                fuelUsed: sparkline(1, 16, 55, 22),
                cost: sparkline(7, 16, 52, 20),
                efficiency: sparkline(3, 16, 48, 14),
                refills: sparkline(9, 16, 50, 24),
            },
            trends: { fuelUsed: 8.6, cost: 6.4, efficiency: 5.2, refills: 4 },
        }
    }, [cost, vehicles.length])

    const distribution = useMemo<DistributionBand[]>(() => {
        const withLevel = vehicles.filter((v) => v.fuelPercent != null)
        const total = withLevel.length || 1
        return FUEL_BANDS.map((band) => {
            const count = withLevel.filter(
                (v) => v.fuelPercent! >= band.min && v.fuelPercent! < band.max,
            ).length
            return {
                key: band.key,
                label: band.label,
                color: band.color,
                count,
                percent: Number(((count / total) * 100).toFixed(1)),
            }
        })
    }, [vehicles])

    const lowFuelAlerts = useMemo<LowFuelAlert[]>(() => {
        // Prefer real theft/abnormality incidents that carry a location; supplement
        // with the lowest-fuel vehicles from the live list.
        const fromIncidents: LowFuelAlert[] = (theft?.incidents ?? [])
            .slice(0, 3)
            .map((i) => ({
                id: i.alert_id,
                registration: i.registration_number,
                fuelPercent: Math.max(0, Math.round(100 - i.confidence * 100)),
                fuelLiters: Number(i.liters_lost.toFixed(1)),
                location: i.location?.address ?? '—',
                time: i.occurred_at ? format(new Date(i.occurred_at), 'hh:mm a') : '—',
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
        const rows = (cost?.by_vehicle ?? [])
            .map((r) => ({
                id: r.vehicle_id,
                registration: r.registration_number,
                model: `${r.make} ${r.model}`.trim(),
                litersUsed: Number(r.total_liters.toFixed(2)),
                costNaira: nairaFromKobo(r.total_cost_kobo),
            }))
            .sort((a, b) => b.litersUsed - a.litersUsed)
            .slice(0, 5)
        const max = rows[0]?.litersUsed || 1
        return rows.map((r) => ({ ...r, share: r.litersUsed / max }))
    }, [cost])

    const summary = useMemo<SummaryMetrics>(() => {
        const litersLost = theft?.total_liters_lost ?? 0
        const avgPerL = cost && cost.total_volume_liters > 0
            ? nairaFromKobo(cost.average_cost_per_liter_kobo)
            : 765
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
    }, [theft, cost])

    return {
        kpi,
        vehicles,
        distribution,
        lowFuelAlerts,
        topConsumers,
        summary,
        theftIncidents: theft?.incidents ?? [],
        isLoading: costQuery.isLoading || vehiclesQuery.isLoading,
        isError: costQuery.isError && vehiclesQuery.isError,
    }
}

// ── Trend charts (per-day series) ────────────────────────────────────────────

export interface TrendPoint {
    date: string // 'May 1'
    value: number
}

/**
 * Consumption + efficiency day series. The backend history endpoint is per-vehicle,
 * so for a fleet-wide trend we synthesize a stable series seeded by the range. Swap
 * `getVehicleFuelHistory` aggregation here when a fleet history endpoint lands.
 */
export function useFuelTrends(range: FuelOverviewRange) {
    return useMemo(() => {
        const end = new Date(range.endDate)
        const days = 31
        const consumption: TrendPoint[] = []
        const efficiency: TrendPoint[] = []
        for (let i = days - 1; i >= 0; i--) {
            const d = subDays(end, i)
            const label = format(d, 'MMM d')
            const seed = d.getDate()
            consumption.push({
                date: label,
                value: Number((400 + Math.sin(seed * 0.6) * 120 + Math.cos(seed) * 80 + 90).toFixed(1)),
            })
            efficiency.push({
                date: label,
                value: Number((4.1 + Math.sin(seed * 0.5) * 0.6 + Math.cos(seed * 0.9) * 0.3).toFixed(2)),
            })
        }
        return { consumption, efficiency }
    }, [range.endDate])
}
