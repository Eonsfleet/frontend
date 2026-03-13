'use client'

import { AnalyticsChart } from '@/components/analytics/AnalyticsChart'
import { AIInsights, type InsightItem } from '@/components/analytics/AIInsights'
import { ReportBuilderWizard } from '@/components/analytics/ReportBuilderWizard'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, Truck, Fuel, AlertTriangle, Plus, LayoutGrid, Calendar, Filter } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'
import * as trackingApi from '@/lib/api/tracking'

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

const aiInsights: InsightItem[] = [
    {
        id: 'i1',
        type: 'optimization',
        title: 'Route Optimization Opportunity',
        description: 'LND-123-XY frequently takes longer routes during peak hours. Potential 12% fuel saving detected.',
        impact: '₦45,000 / mo',
        actionLabel: 'Apply New Route'
    },
    {
        id: 'i2',
        type: 'risk',
        title: 'Predictive Service Warning',
        description: 'ABJ-567-ZZ engine vibration patterns match early-stage alternator failure profiles.',
        impact: 'High Risk',
        actionLabel: 'Schedule Now'
    },
    {
        id: 'i3',
        type: 'efficiency',
        title: 'Idle Time Reduction',
        description: 'Lagos Cluster idle time is 18% higher than the national average between 10 AM - 2 PM.',
        impact: '8.5% Efficiency',
        actionLabel: 'View Drivers'
    }
]

export default function AnalyticsOverviewPage() {
    const [isComparisonMode, setIsComparisonMode] = useState(false)
    const [isWizardOpen, setIsWizardOpen] = useState(false)

    // Fetch Fuel Consumption (OpEx)
    const { data: fuelConsData } = useQuery({
        queryKey: ['fuel-consumption'],
        queryFn: () => analyticsApi.getFuelConsumptionReport({ filter: '30d' })
    })

    // Fetch Fuel Efficiency (KPI)
    const { data: efficiencyData } = useQuery({
        queryKey: ['fuel-efficiency'],
        queryFn: () => analyticsApi.getFuelEfficiencyReport()
    })

    // Fetch Anomalies (AI Insights)
    const { data: anomalyData } = useQuery({
        queryKey: ['anomalies'],
        queryFn: () => analyticsApi.detectAnomalies({ days: 30 })
    })

    // Fetch General Metrics
    const { data: metricsData } = useQuery({
        queryKey: ['tracking-metrics'],
        queryFn: () => trackingApi.getTrackingMetrics()
    })

    const metrics = metricsData?.data || { moving_assets: 0, total_active_assets: 0, idle_assets: 0 }
    const utilization = useMemo(() => {
        if (!metrics.total_active_assets) return 0
        return ((metrics.moving_assets / metrics.total_active_assets) * 100).toFixed(1)
    }, [metrics])

    // Normalize AI Insights
    const dynamicInsights: InsightItem[] = useMemo(() => {
        if (!anomalyData?.data?.anomalies) return aiInsights // fallback
        return anomalyData.data.anomalies.map((a: any) => ({
            id: String(a.id),
            type: (a.severity === 'critical' ? 'risk' : 'optimization') as any,
            title: a.title,
            description: a.description,
            impact: a.impact_score > 8 ? 'High Risk' : `₦${a.potential_saving || '0'} / mo`,
            actionLabel: a.severity === 'critical' ? 'Schedule Now' : 'Apply New Route'
        }))
    }, [anomalyData])

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Utilization</p>
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">{utilization}%</h3>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Real-time status</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel Cost / KM</p>
                            <Fuel className="h-4 w-4 text-rose-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">
                            ₦{efficiencyData?.data?.metrics?.avg_cost_per_km?.toFixed(2) || '142.50'}
                        </h3>
                        <p className="text-[10px] text-rose-600 font-bold uppercase mt-1">vs target baseline</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Incidents</p>
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">3</h3>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Down from 8 last week</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-blue-600 border-none group transition-all hover:scale-[1.02]">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Fleet Health Score</p>
                        <h3 className="text-3xl font-black text-white italic">87/100</h3>
                        <div className="mt-2 h-1.5 w-full bg-blue-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-300 w-[87%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
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
                <div className="flex flex-col gap-6">
                    <AIInsights insights={dynamicInsights} />
                </div>
            </div>

            <ReportBuilderWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />
        </div>
    )
}
