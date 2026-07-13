'use client'

import { FuelIcon, DollarSign, Gauge, Tag, Leaf, CircleAlert } from 'lucide-react'
import { FuelKpiCard } from './FuelKpiCard'
import type { AnalysisKpis } from './useFuelAnalysis'

const fmtNaira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function AnalysisKpiCards({ kpis }: { kpis: AnalysisKpis }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
            <FuelKpiCard
                title="Total Fuel Consumed"
                value={`${kpis.totalFuelConsumedLiters.toLocaleString()} L`}
                icon={FuelIcon}
                accent="blue"
                trend={{ value: '8.6%', isPositive: true, label: 'vs prev.' }}
                sparkline={kpis.sparklines.consumed}
            />
            <FuelKpiCard
                title="Total Fuel Cost"
                value={fmtNaira(kpis.totalFuelCostNaira)}
                icon={DollarSign}
                accent="green"
                trend={{ value: '6.4%', isPositive: true, label: 'vs prev.' }}
                sparkline={kpis.sparklines.cost}
            />
            <FuelKpiCard
                title="Avg. Fuel Efficiency"
                value={`${kpis.avgEfficiency.toFixed(2)} km/L`}
                icon={Gauge}
                accent="purple"
                trend={{ value: '5.2%', isPositive: false, label: 'vs prev.' }}
                sparkline={kpis.sparklines.efficiency}
            />
            <FuelKpiCard
                title="Fuel Savings"
                value={fmtNaira(kpis.fuelSavingsNaira)}
                icon={Tag}
                accent="orange"
                trend={{ value: '12.8%', isPositive: true, label: 'vs prev.' }}
                sparkline={kpis.sparklines.savings}
            />
            <FuelKpiCard
                title="CO₂ Saved"
                value={`${kpis.co2SavedKg.toLocaleString()} kg`}
                icon={Leaf}
                accent="green"
                trend={{ value: '9.1%', isPositive: true, label: 'vs prev.' }}
                sparkline={kpis.sparklines.co2}
            />
            <FuelKpiCard
                title="Idle Fuel Waste"
                value={`${kpis.idleFuelWasteLiters.toFixed(2)} L`}
                icon={CircleAlert}
                accent="red"
                trend={{ value: '7.3%', isPositive: false, label: 'vs prev.' }}
                sparkline={kpis.sparklines.idle}
            />
        </div>
    )
}
