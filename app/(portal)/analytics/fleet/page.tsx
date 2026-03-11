'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getFleetUtilizationSummary, getFleetAvailabilitySnapshot, getFleetAvailabilityTrend, getFleetVehicleList } from '@/lib/api/analytics'
import { Loader2, Truck, Activity, CheckCircle2, AlertCircle, Calendar, ChevronRight } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

const COLORS = ['#10b981', '#4f46e5', '#f59e0b', '#ef4444']

export default function FleetAnalyticsPage() {
    const [filter, setFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

    const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['fleet-utilization-summary', filter],
        queryFn: () => getFleetUtilizationSummary() // Endpoint currently doesn't take filter but doc says it might
    })

    const { data: snapshotData, isLoading: isSnapshotLoading } = useQuery({
        queryKey: ['fleet-availability-snapshot'],
        queryFn: () => getFleetAvailabilitySnapshot()
    })

    const { data: trendData, isLoading: isTrendLoading } = useQuery({
        queryKey: ['fleet-availability-trend', filter],
        queryFn: () => getFleetAvailabilityTrend({ filter })
    })

    const { data: vehicleListData, isLoading: isListLoading } = useQuery({
        queryKey: ['fleet-vehicle-list', filter],
        queryFn: () => getFleetVehicleList({ filter, per_page: 5 })
    })

    const summary = summaryData || { total_vehicles: 0, active_vehicles: 0, utilization_rate_pct: 0, total_trips: 0, completed_trips: 0, completion_rate_pct: 0 }

    const availabilityData = useMemo(() => {
        if (!snapshotData?.by_status) return []
        return Object.entries(snapshotData.by_status).map(([name, value], i) => ({
            name: name.toUpperCase().replace('_', ' '),
            value: Number(value),
            color: COLORS[i % COLORS.length]
        }))
    }, [snapshotData])

    const trend = useMemo(() => {
        if (!trendData?.labels) return []
        return trendData.labels.map((label: string, i: number) => ({
            name: label,
            rate: trendData.data[i]
        }))
    }, [trendData])

    const isLoading = isSummaryLoading || isSnapshotLoading || isTrendLoading || isListLoading

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
                        Fleet <span className="text-blue-600">Utilization</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Deployment Ratios • Fleet Performance Analytics
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
                    title="Utilization Rate"
                    value={`${summary.utilization_rate_pct}%`}
                    icon={Activity}
                    description="Fleet deployment efficiency"
                />
                <StatCard
                    title="Total Distance"
                    value={`${summary.total_distance_km?.toLocaleString()} KM`}
                    icon={Truck}
                    description={`Over ${filter} window`}
                />
                <StatCard
                    title="Completion Rate"
                    value={`${summary.completion_rate_pct}%`}
                    icon={CheckCircle2}
                    description="Trip reliability index"
                />
                <StatCard
                    title="Active Fleet"
                    value={`${summary.active_vehicles} / ${summary.total_vehicles}`}
                    icon={Truck}
                    description="Assigned vs Total assets"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-slate-200 shadow-sm overflow-hidden bg-white rounded-[32px]">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Availability Trend</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Historical fleet readiness levels</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                                    <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Fleet Status</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Real-time asset distribution</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex flex-col items-center">
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={availabilityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {availabilityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full mt-4">
                            {availabilityData.map(status => (
                                <div key={status.name} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{status.name}</span>
                                    </div>
                                    <p className="text-xs font-black text-slate-900 ml-4">{status.value} Assets</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Vehicles Performance</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Top utilization by individual assets</CardDescription>
                        </div>
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                            View Full List <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trips</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Distance</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Utilization %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {vehicleListData?.data?.map((v: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                                                <Truck className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{v.registration}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.make} {v.model}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-[11px] font-black text-slate-700">{v.trips_count}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-[11px] font-black text-slate-700">{v.total_distance_km?.toLocaleString()} KM</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className="text-[11px] font-black text-blue-600">{v.utilization_pct}%</span>
                                            <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${v.utilization_pct}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
