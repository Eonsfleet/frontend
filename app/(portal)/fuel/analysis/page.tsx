'use client'

import { Upload, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/shared/QueryError'
import { FuelTabs } from '../components/FuelTabs'
import { AnalysisKpiCards } from '../components/AnalysisKpiCards'
import { AnalysisToolbar } from '../components/AnalysisToolbar'
import { ConsumptionTrendCard } from '../components/ConsumptionTrendCard'
import { DonutBreakdownCard } from '../components/DonutBreakdownCard'
import { EfficiencyBarsCard } from '../components/EfficiencyBarsCard'
import { TrendChartCard } from '../components/TrendChartCard'
import { CostBreakdownCard } from '../components/CostBreakdownCard'
import { TopWastersCard } from '../components/TopWastersCard'
import { VehiclePerformanceTable } from '../components/VehiclePerformanceTable'
import { useFuelAnalysis } from '../components/useFuelAnalysis'

export default function FuelAnalysisPage() {
    const {
        kpis,
        consumptionTrend,
        costTrend,
        fuelByVehicle,
        efficiencyBars,
        fuelTypeDonut,
        costBreakdown,
        wasters,
        performance,
        isError,
    } = useFuelAnalysis()

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Analysis</h1>
                    <p className="mt-1 text-sm text-slate-500">Deep insights into fuel consumption, efficiency and cost performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none">
                        <Upload className="h-4 w-4" /> Export
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none">
                        <SlidersHorizontal className="h-4 w-4" /> Filters
                    </Button>
                </div>
            </div>

            <FuelTabs active="Fuel Analysis" />

            {isError ? (
                <QueryError message="Failed to load fuel analysis." />
            ) : (
                <>
                    <AnalysisKpiCards kpis={kpis} />
                    <AnalysisToolbar />

                    {/* Row 1: consumption trend | fuel by vehicle | efficiency */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <ConsumptionTrendCard data={consumptionTrend} />
                        <DonutBreakdownCard
                            title="Fuel by Vehicle"
                            total={fuelByVehicle.total}
                            slices={fuelByVehicle.slices}
                            formatValue={(s) => `${s.value.toLocaleString()} L (${s.percent}%)`}
                        />
                        <EfficiencyBarsCard bars={efficiencyBars.bars} fleetAvg={efficiencyBars.fleetAvg} />
                    </div>

                    {/* Row 2: fuel type | cost trend | cost breakdown | wasters */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                        <DonutBreakdownCard
                            title="Consumption by Fuel Type"
                            total={fuelTypeDonut.total}
                            slices={fuelTypeDonut.slices}
                            formatValue={(s) => `${s.value.toLocaleString()} L (${s.percent}%)`}
                        />
                        <TrendChartCard
                            title="Fuel Cost Trend"
                            data={costTrend.map((p) => ({ date: p.label, value: p.value }))}
                            color="#3b82f6"
                            formatValue={(v) => `$${v.toLocaleString()}`}
                            granularity="Daily"
                        />
                        <CostBreakdownCard rows={costBreakdown} />
                        <TopWastersCard rows={wasters} />
                    </div>

                    {/* Vehicle performance table */}
                    <VehiclePerformanceTable rows={performance} />
                </>
            )}
        </div>
    )
}
