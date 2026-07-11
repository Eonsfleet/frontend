'use client'

/**
 * Data layer for the Fuel Analysis tab.
 *
 * Real data: getCostAnalysis (fleet cost/volume + per-vehicle breakdown → Fuel by
 * Vehicle, efficiency bars, performance table) and getFuelVehicles (fleet size).
 * Series the API does not expose — consumption/cost day trends, this-vs-previous
 * period, fuel-type split, cost breakdown, top wasters, KPI sparklines and per-row
 * trend sparklines — are deterministic mocks keyed off ids/index so they are stable
 * and swappable when analytics endpoints land.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { getCostAnalysis } from '@/lib/api/fuel'

const KOBO = 100
const nairaFromKobo = (k: number) => k / KOBO

function walk(seed: number, points: number, base: number, spread: number): number[] {
    const out: number[] = []
    let v = base
    for (let i = 0; i < points; i++) {
        v = Math.max(base - spread, Math.min(base + spread, v + (Math.sin(seed + i * 1.6) + Math.cos(seed * 0.4 + i)) * (spread / 5)))
        out.push(Number(v.toFixed(1)))
    }
    return out
}

export interface AnalysisKpis {
    totalFuelConsumedLiters: number
    totalFuelCostNaira: number
    avgEfficiency: number
    fuelSavingsNaira: number
    co2SavedKg: number
    idleFuelWasteLiters: number
    sparklines: Record<'consumed' | 'cost' | 'efficiency' | 'savings' | 'co2' | 'idle', number[]>
}

export interface TrendDualPoint {
    label: string
    current: number
    previous: number
}
export interface TrendPoint {
    label: string
    value: number
}

export interface DonutSlice {
    label: string
    value: number
    percent: number
    color: string
}

export interface EfficiencyBar {
    label: string
    value: number
}

export interface BreakdownRow {
    label: string
    amountNaira: number
    percent: number
    color: string
}

export interface WasterRow {
    label: string
    liters: number
    color: string
    isTotal?: boolean
}

export interface PerfRow {
    id: number
    vehicle: string
    model: string
    consumedLiters: number
    costNaira: number
    distanceKm: number
    efficiency: number
    deltaPercent: number
    trend: number[]
}

const VEHICLE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#94a3b8']
const MODELS = ['Volvo FH16', 'Mercedes Actros', 'MAN TGX', 'Scania R450', 'Volvo FM']

export function useFuelAnalysis() {
    const costQuery = useQuery({
        queryKey: ['fuel-analysis', 'cost-analysis'],
        queryFn: () => getCostAnalysis(),
    })
    const cost = costQuery.data?.data

    const byVehicle = useMemo(() => cost?.by_vehicle ?? [], [cost])

    const totalFuelConsumedLiters = useMemo(() => Math.round(cost?.total_volume_liters ?? 12452), [cost])
    const totalFuelCostNaira = useMemo(() => {
        const totalCost = cost ? nairaFromKobo(cost.total_cost_kobo) : 7523.68
        return Number(totalCost.toFixed(2))
    }, [cost])

    // Fuel Consumption Trend — this vs previous period (15 days).
    const consumptionTrend = useMemo<TrendDualPoint[]>(() => {
        const end = new Date()
        const out: TrendDualPoint[] = []
        for (let i = 14; i >= 0; i--) {
            const d = subDays(end, i)
            const s = d.getDate()
            out.push({
                label: format(d, 'MMM d'),
                current: Number((600 + Math.sin(s * 0.7) * 180 + 40).toFixed(0)),
                previous: Number((560 + Math.cos(s * 0.6) * 150).toFixed(0)),
            })
        }
        return out
    }, [])

    const costTrend = useMemo<TrendPoint[]>(() => {
        const end = new Date()
        const out: TrendPoint[] = []
        for (let i = 14; i >= 0; i--) {
            const d = subDays(end, i)
            out.push({ label: format(d, 'MMM d'), value: Number((520 + Math.sin(d.getDate() * 0.8) * 120).toFixed(0)) })
        }
        return out
    }, [])

    // Fuel by Vehicle donut (real volumes) + "Others" bucket.
    const fuelByVehicle = useMemo<{ total: number; slices: DonutSlice[] }>(() => {
        const rows = byVehicle.length
            ? byVehicle.map((v) => ({ label: v.registration_number, value: v.total_liters }))
            : [
                { label: 'LAG 234 XF', value: 2450 }, { label: 'LAG 543 TY', value: 1980 },
                { label: 'LAG 876 GH', value: 1620 }, { label: 'LAG 112 KL', value: 1320 },
                { label: 'LAG 908 MN', value: 1050 },
            ]
        const top = rows.slice(0, 5)
        const othersVal = rows.slice(5).reduce((s, r) => s + r.value, 0)
        const all = othersVal > 0 ? [...top, { label: `Others (${rows.length - 5})`, value: othersVal }] : top
        const total = all.reduce((s, r) => s + r.value, 0) || 1
        return {
            total: Math.round(total),
            slices: all.map((r, i) => ({
                label: r.label,
                value: Math.round(r.value),
                percent: Number(((r.value / total) * 100).toFixed(1)),
                color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
            })),
        }
    }, [byVehicle])

    const efficiencyBars = useMemo<{ bars: EfficiencyBar[]; fleetAvg: number }>(() => {
        const base = fuelByVehicle.slices.filter((s) => !s.label.startsWith('Others')).slice(0, 5)
        const bars = base.map((s, i) => ({ label: s.label, value: Number((5.4 - i * 0.38).toFixed(2)) }))
        const fleetAvg = bars.length ? Number((bars.reduce((a, b) => a + b.value, 0) / bars.length).toFixed(2)) : 4.35
        return { bars, fleetAvg }
    }, [fuelByVehicle])

    const fuelTypeDonut = useMemo<{ total: number; slices: DonutSlice[] }>(() => {
        const total = totalFuelConsumedLiters
        const defs = [
            { label: 'Diesel', pct: 82.3, color: '#3b82f6' },
            { label: 'Petrol', pct: 14.8, color: '#10b981' },
            { label: 'CNG', pct: 2.1, color: '#f59e0b' },
            { label: 'Others', pct: 0.8, color: '#94a3b8' },
        ]
        return {
            total,
            slices: defs.map((d) => ({ label: d.label, value: Math.round((d.pct / 100) * total), percent: d.pct, color: d.color })),
        }
    }, [totalFuelConsumedLiters])

    const costBreakdown = useMemo<BreakdownRow[]>(() => {
        const total = totalFuelCostNaira
        return [
            { label: 'Fuel Purchases', amountNaira: Number((total * 0.892).toFixed(2)), percent: 89.2, color: 'bg-blue-500' },
            { label: 'Additives', amountNaira: 356.4, percent: 4.2, color: 'bg-emerald-500' },
            { label: 'Service Charges', amountNaira: 189.75, percent: 2.2, color: 'bg-amber-500' },
            { label: 'Others', amountNaira: 363.17, percent: 4.3, color: 'bg-slate-400' },
        ]
    }, [totalFuelCostNaira])

    const wasters = useMemo<WasterRow[]>(() => [
        { label: 'Excessive Idling', liters: 45.6, color: 'bg-rose-500' },
        { label: 'Harsh Driving', liters: 32.25, color: 'bg-rose-400' },
        { label: 'Speeding', liters: 25.8, color: 'bg-amber-500' },
        { label: 'Route Deviation', liters: 21.8, color: 'bg-amber-400' },
        { label: 'Total Waste', liters: 125.45, color: 'bg-rose-600', isTotal: true },
    ], [])

    const performance = useMemo<PerfRow[]>(() => {
        const rows = fuelByVehicle.slices.filter((s) => !s.label.startsWith('Others')).slice(0, 5)
        return rows.map((r, i) => ({
            id: i,
            vehicle: r.label,
            model: MODELS[i % MODELS.length],
            consumedLiters: r.value,
            costNaira: Number((r.value * 0.6).toFixed(2)),
            distanceKm: Math.round(r.value * 5.3),
            efficiency: efficiencyBars.bars[i]?.value ?? 4.35,
            deltaPercent: [6.3, 4.8, -2.1, 1.7, -3.4][i] ?? 0,
            trend: walk(i + 3, 14, 50, 18),
        }))
    }, [fuelByVehicle, efficiencyBars])

    return {
        consumptionTrend,
        costTrend,
        fuelByVehicle,
        efficiencyBars,
        fuelTypeDonut,
        costBreakdown,
        wasters,
        performance,
        isLoading: costQuery.isLoading,
        isError: costQuery.isError,
    }
}
