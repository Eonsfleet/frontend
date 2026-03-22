'use client'

import { AnalyticsChart } from '@/components/analytics/AnalyticsChart'
import { ReportBuilderWizard } from '@/components/analytics/ReportBuilderWizard'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Truck, Fuel, Plus, LayoutGrid, Calendar, Filter, Activity, ShieldCheck } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'

const fleetTrendData = [
    { name: 'Mon', active: 65, idle: 20, comparison: 72 },
    { name: 'Tue', active: 70, idle: 18, comparison: 68 },
    { name: 'Wed', active: 85, idle: 10, comparison: 75 },
    { name: 'Thu', active: 88, idle: 8, comparison: 82 },
    { name: 'Fri', active: 90, idle: 5, comparison: 85 },
    { name: 'Sat', active: 45, idle: 45, comparison: 50 },
    { name: 'Sun', active: 30, idle: 60, comparison: 40 },
]

const costData = [
    { name: 'Jan', fuel: 4000, maintenance: 2400 },
    { name: 'Feb', fuel: 3000, maintenance: 1398 },
    { name: 'Mar', fuel: 2000, maintenance: 9800 },
    { name: 'Apr', fuel: 2780, maintenance: 3908 },
    { name: 'May', fuel: 1890, maintenance: 4800 },
    { name: 'Jun', fuel: 2390, maintenance: 3800 },
]


export default function AnalyticsOverviewPage() {
    const [isComparisonMode, setIsComparisonMode] = useState(false)
    const [isWizardOpen, setIsWizardOpen] = useState(false)

    // Fetch Fuel Consumption (OpEx)
    const { data: fuelConsData } = useQuery({
        queryKey: ['fuel-consumption'],
        queryFn: () => analyticsApi.getFuelConsumptionReport({ filter: '30d' })
    })

    const { data: utilizationSummary } = useQuery({
        queryKey: ['analytics-utilization-summary'],
        queryFn: () => analyticsApi.getFleetUtilizationSummary(),
    })

    const { data: fleetHealthScore } = useQuery({
        queryKey: ['analytics-fleet-health-score'],
        queryFn: () => analyticsApi.getFleetHealthScore(),
    })

    const { data: fuelKpis } = useQuery({
        queryKey: ['analytics-fuel-kpis'],
        queryFn: () => analyticsApi.getFuelExecutiveKpis(),
    })

    const utilizationRate = utilizationSummary?.utilization_rate_pct ?? null
    const completionRate = utilizationSummary?.completion_rate_pct ?? null
    const healthScore = fleetHealthScore?.score ?? null
    const healthRating = fleetHealthScore?.rating ?? null
    const fuelCostThisMonth = fuelKpis?.total_fuel_cost_this_month ?? null
    const fuelCostChange = fuelKpis?.cost_vs_last_month_percent ?? null
    const fuelMatchRate = fuelKpis?.reconciliation_match_rate_percent ?? null
    const fuelTheftCount = fuelKpis?.theft_incidents_this_month ?? null

    // Normalize OpEx Data (Fuel vs Maintenance)
    // Note: Maintenance data might need another endpoint, using consumption for now
    const dynamicCostData = useMemo(() => {
        if (!fuelConsData?.data?.report) return costData
        return fuelConsData.data.report.map((item: any) => ({
            name: item.period_label,
            fuel: item.total_cost,
            maintenance: item.total_cost * 0.3 // estimated ratio for demo
        }))
    }, [fuelConsData])


    return (
        <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        Analytics <span className="text-blue-600">Overview</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Self-Service Insights • Predictive Intelligence
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Create Report
                    </button>
                    <button
                        onClick={() => setIsComparisonMode(!isComparisonMode)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md",
                            isComparisonMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-400"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Comparison Mode: {isComparisonMode ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Global Filters Bar */}
            <div className="p-4 bg-white border border-slate-200 rounded-3xl flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Last 30 Days</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Truck className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Fleet: All Regions</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
                <button className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest ml-auto">
                    <Filter className="h-3 w-3" />
                    More Filters
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fleet Utilization */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet Utilization</p>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">
                            {utilizationRate != null ? `${Number(utilizationRate).toFixed(1)}%` : '—'}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                            {completionRate != null ? `${Number(completionRate).toFixed(1)}% trip completion` : 'Deployment efficiency'}
                        </p>
                        {utilizationSummary?.total_distance_km != null && (
                            <p className="text-[10px] text-blue-600 font-bold uppercase mt-0.5">
                                {Number(utilizationSummary.total_distance_km).toLocaleString()} km driven
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Fleet Health Score */}
                <Card className="border-none shadow-sm bg-blue-600 overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Fleet Health Score</p>
                            <ShieldCheck className="h-4 w-4 text-blue-200" />
                        </div>
                        <h3 className="text-3xl font-black text-white italic">
                            {healthScore != null ? `${healthScore} / 100` : '—'}
                        </h3>
                        {healthScore != null && (
                            <div className="mt-2 h-1.5 w-full bg-blue-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-300 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    style={{ width: `${healthScore}%` }}
                                />
                            </div>
                        )}
                        {healthRating && (
                            <p className="text-[10px] text-blue-200 font-bold uppercase mt-1.5 capitalize">{healthRating}</p>
                        )}
                        {fleetHealthScore?.components && (
                            <p className="text-[10px] text-blue-300 font-bold uppercase mt-0.5">
                                {fleetHealthScore.components.maintenance_compliance ?? 0}% maintenance compliance
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Fuel Cost This Month */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel Cost (Month)</p>
                            <Fuel className="h-4 w-4 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">
                            {fuelCostThisMonth != null ? `₦${Number(fuelCostThisMonth).toLocaleString()}` : '—'}
                        </h3>
                        {fuelCostChange != null && (
                            <div className={cn(
                                'flex items-center gap-1 mt-1',
                                fuelCostChange <= 0 ? 'text-emerald-600' : 'text-rose-600'
                            )}>
                                {fuelCostChange <= 0
                                    ? <TrendingDown className="h-3 w-3" />
                                    : <TrendingUp className="h-3 w-3" />}
                                <span className="text-[10px] font-bold uppercase">
                                    {Math.abs(fuelCostChange).toFixed(1)}% vs last month
                                </span>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                            {fuelMatchRate != null ? `${fuelMatchRate}% reconciled` : ''}
                            {fuelTheftCount != null ? ` · ${fuelTheftCount} theft incidents` : ''}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <AnalyticsChart
                    title="Fleet Activity & Utilization"
                    description="Real-time occupancy and motion dynamics"
                    data={fleetTrendData}
                    dataKeys={[
                        { key: 'active', color: '#4f46e5', label: 'Active Fleet' },
                        { key: 'idle', color: '#f59e0b', label: 'Idle Fleet' },
                        ...(isComparisonMode ? [{ key: 'comparison', color: '#10b981', label: 'LND-123-XY' }] : [])
                    ]}
                    allowComparison
                />
                <AnalyticsChart
                    title="OpEx Expenditure Overview"
                    description="Maintenance vs Fuel cost distribution"
                    data={dynamicCostData}
                    height={300}
                    dataKeys={[
                        { key: 'fuel', color: '#0ea5e9', label: 'Fuel Spend' },
                        { key: 'maintenance', color: '#f59e0b', label: 'Maintenance' }
                    ]}
                />
            </div>

            <ReportBuilderWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />
        </div>
    )
}
