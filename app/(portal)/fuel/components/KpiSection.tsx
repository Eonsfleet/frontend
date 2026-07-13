'use client'

import { Fuel, DollarSign, Gauge, FuelIcon, Truck } from 'lucide-react'
import { FuelKpiCard } from './FuelKpiCard'
import type { KpiViewModel } from './useFuelOverview'

interface KpiSectionProps {
    kpi: KpiViewModel
    isLoading?: boolean
}

const fmtNumber = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtNaira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function KpiSkeleton() {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-none">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="mt-4 h-10 w-full animate-pulse rounded bg-slate-50" />
        </div>
    )
}

export function KpiSection({ kpi, isLoading }: KpiSectionProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <FuelKpiCard
                title="Total Fuel Used"
                value={`${fmtNumber(kpi.totalFuelUsedLiters)} L`}
                icon={Fuel}
                accent="green"
                trend={{ value: `${kpi.trends.fuelUsed}%`, isPositive: true, label: 'vs prev. period' }}
                sparkline={kpi.sparklines.fuelUsed}
            />
            <FuelKpiCard
                title="Total Fuel Cost"
                value={fmtNaira(kpi.totalFuelCostNaira)}
                icon={DollarSign}
                accent="blue"
                trend={{ value: `${kpi.trends.cost}%`, isPositive: true, label: 'vs prev. period' }}
                sparkline={kpi.sparklines.cost}
            />
            <FuelKpiCard
                title="Avg. Fuel Efficiency"
                value={`${kpi.avgEfficiencyKmPerL.toFixed(2)} km/L`}
                icon={Gauge}
                accent="purple"
                trend={{ value: `${kpi.trends.efficiency}%`, isPositive: true, label: 'vs prev. period' }}
                sparkline={kpi.sparklines.efficiency}
            />
            <FuelKpiCard
                title="Total Refills"
                value={`${kpi.totalRefills}`}
                icon={FuelIcon}
                accent="orange"
                trend={{ value: `${kpi.trends.refills}`, isPositive: true, label: 'vs prev. period' }}
                sparkline={kpi.sparklines.refills}
            />
            <FuelKpiCard
                title="Total Vehicles"
                value={`${kpi.totalVehicles}`}
                icon={Truck}
                accent="blue"
                subtitle="Active Vehicles"
            />
        </div>
    )
}
