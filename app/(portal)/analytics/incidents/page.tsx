'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'
import { Loader2, ShieldAlert, AlertTriangle, Clock, TrendingUp, ChevronRight, Activity, Zap } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const SEVERITY_COLORS: Record<string, string> = {
    'critical': '#ef4444',
    'high': '#f97316',
    'medium': '#f59e0b',
    'low': '#3b82f6'
}

export default function IncidentsAnalyticsPage() {
    const [filter, setFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

    const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['incident-summary'],
        queryFn: () => analyticsApi.getIncidentSummary()
    })

    const { data: typeData, isLoading: isTypeLoading } = useQuery({
        queryKey: ['incident-type-distribution'],
        queryFn: () => analyticsApi.getIncidentTypeDistribution()
    })

    const { data: priorityData, isLoading: isPriorityLoading } = useQuery({
        queryKey: ['incident-priority-distribution'],
        queryFn: () => analyticsApi.getIncidentPriorityDistribution()
    })

    const { data: overTimeData, isLoading: isTimeLoading } = useQuery({
        queryKey: ['incidents-over-time', filter],
        queryFn: () => analyticsApi.getIncidentsOverTime({ filter })
    })

    const { data: resolutionData, isLoading: isResLoading } = useQuery({
        queryKey: ['incident-resolution-time'],
        queryFn: () => analyticsApi.getIncidentResolutionTime()
    })

    const { data: vehicleIncidents, isLoading: isVehLoading } = useQuery({
        queryKey: ['incidents-by-vehicle'],
        queryFn: () => analyticsApi.getIncidentsByVehicle({ limit: 5 })
    })

    const trendData = useMemo(() => {
        if (!overTimeData?.labels) return []
        return overTimeData.labels.map((label: string, i: number) => ({
            name: label,
            count: overTimeData.data[i]
        }))
    }, [overTimeData])

    const typeChart = useMemo(() => {
        if (!typeData?.detail) return []
        return typeData.detail.map((item: any) => ({
            name: item.type.replace('_', ' ').toUpperCase(),
            value: item.count
        }))
    }, [typeData])

    const priorityChart = useMemo(() => {
        if (!priorityData?.labels) return []
        return priorityData.labels.map((label: string, i: number) => ({
            name: label.toUpperCase(),
            value: priorityData.data[i],
            color: SEVERITY_COLORS[label.toLowerCase()] || '#94a3b8'
        }))
    }, [priorityData])

    const isLoading = isSummaryLoading || isTypeLoading || isPriorityLoading || isTimeLoading || isResLoading || isVehLoading

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        Incident <span className="text-blue-600">Analytics</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Safety Events • Risk Distribution • Resolution Performance
                    </p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                    {(['7d', '30d', '90d', '1y'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setFilter(p)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === p ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Incidents"
                    value={summaryData?.total || 0}
                    icon={ShieldAlert}
                    description="Reported in current period"
                />
                <StatCard
                    title="Open Tickets"
                    value={summaryData?.open || 0}
                    icon={Activity}
                    description="Active investigations"
                />
                <StatCard
                    title="Avg Resolution"
                    value={`${resolutionData?.overall_avg_days || 0} Days`}
                    icon={Clock}
                    description="Average closure time"
                />
                <StatCard
                    title="Risk Level"
                    value={summaryData?.escalated > 0 ? 'CRITICAL' : 'MODERATE'}
                    icon={AlertTriangle}
                    className={summaryData?.escalated > 0 ? "border-l-4 border-l-rose-500 shadow-rose-100" : ""}
                    description="Fleet-wide safety index"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Incidents Over Time</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Frequency of safety events and breakdowns</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="h-[350px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area name="Incidents" type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Priority Distribution</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Classification by operational impact</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={priorityChart}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {priorityChart.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4 border-b border-slate-50">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Resolution Efficiency</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Average days to resolve by incident type</CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Volume</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Days</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {resolutionData?.by_type?.length > 0 ? resolutionData.by_type.map((t: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{t.type.replace('_', ' ')}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center font-bold text-[11px] text-slate-700">
                                            {t.count}
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-[11px] text-blue-600">
                                            {t.avg_days} Days
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Clock className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase">No Resolution Data</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No resolved incidents found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4 border-b border-slate-50">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">High Risk Assets</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Vehicles with highest incident frequency</CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Incidents</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Risk Index</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {vehicleIncidents?.vehicles?.length > 0 ? vehicleIncidents.vehicles.map((v: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{v.registration}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.make} {v.model}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-[11px] text-rose-600">
                                            {v.incident_count}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Badge className={cn(
                                                "text-[8px] font-black uppercase border-none px-2 py-0.5",
                                                v.incident_count > 5 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {v.incident_count > 5 ? 'High Risk' : 'Elevated'}
                                            </Badge>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <ShieldAlert className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase">No High Risk Vehicles</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All assets within acceptable range</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}
