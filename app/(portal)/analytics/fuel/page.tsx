'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'
import { Loader2, Fuel, Zap, AlertTriangle, TrendingDown, ChevronRight, Droplets, ShieldCheck } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function FuelAnalyticsPage() {
    const [filter, setFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

    const { data: consumptionData, isLoading: isConsLoading } = useQuery({
        queryKey: ['fuel-consumption-report', filter],
        queryFn: () => analyticsApi.getFuelConsumptionReport({ filter })
    })

    const { data: executiveKpis, isLoading: isKpiLoading } = useQuery({
        queryKey: ['fuel-executive-kpis', filter],
        queryFn: () => analyticsApi.getFuelExecutiveKpis({ filter })
    })

    const { data: anomalyData, isLoading: isAnomalyLoading } = useQuery({
        queryKey: ['fuel-anomaly-report'],
        queryFn: () => analyticsApi.getFuelAnomalyReport()
    })

    const { data: driverEffData, isLoading: isDriverEffLoading } = useQuery({
        queryKey: ['fuel-driver-efficiency', filter],
        queryFn: () => analyticsApi.getFuelDriverEfficiency({ period: filter })
    })

    const consumptionTrend = useMemo(() => {
        if (!consumptionData?.trend) return []
        return consumptionData.trend.map((item: any) => ({
            name: item.period,
            liters: item.total_fuel_liters,
        }))
    }, [consumptionData])

    const kpis = executiveKpis || {
        total_fuel_cost_naira: 0,
        theft_incidents: 0,
        match_rate_pct: 0,
        fleet_efficiency_l_per_100km: 0,
    }

    const topDrivers: any[] = driverEffData?.top_10_pct ?? []
    const anomalyTypes: any[] = anomalyData?.by_type ?? []

    const isLoading = isConsLoading || isKpiLoading || isAnomalyLoading || isDriverEffLoading

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
                        Fuel <span className="text-blue-600">Intelligence</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Expenditure Analysis • Efficiency Benchmarking • Loss Prevention
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
                    title="Total Consumption"
                    value={`${consumptionData?.total_fuel_liters?.toLocaleString() ?? 0} L`}
                    icon={Fuel}
                    description="Current period volume"
                />
                <StatCard
                    title="Total Spend"
                    value={`₦${kpis.total_fuel_cost_naira?.toLocaleString() ?? 0}`}
                    icon={Zap}
                    description="Confirmed fuel expenditure"
                />
                <StatCard
                    title="Fleet Efficiency"
                    value={`${kpis.fleet_efficiency_l_per_100km?.toFixed(1) ?? 0} L/100km`}
                    icon={TrendingDown}
                    description="Average consumption rate"
                />
                <StatCard
                    title="Theft Incidents"
                    value={kpis.theft_incidents || 0}
                    icon={AlertTriangle}
                    className={kpis.theft_incidents > 0 ? "border-l-4 border-l-rose-500 shadow-rose-100" : ""}
                    description="Suspected fuel theft events"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Consumption Trend</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Fuel volume consumed over time</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        {consumptionTrend.length > 0 ? (
                            <div className="h-[350px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={consumptionTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                                            formatter={(val: any) => [`${Number(val).toLocaleString()} L`, 'Liters']}
                                        />
                                        <Area name="Liters (L)" type="monotone" dataKey="liters" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFuel)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[350px] text-center space-y-4">
                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Fuel className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase">No Consumption Data</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No fuel data recorded for this period</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Loss Prevention</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Anomalies by type (all-time)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex flex-col gap-4">
                        {anomalyTypes.length > 0 ? (
                            anomalyTypes.map((a: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center">
                                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                                        </div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                            {String(a.type).replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                    <Badge className="bg-rose-600 text-white border-none text-[9px] font-black uppercase px-2 py-0.5">
                                        {a.count} cases
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">No Anomalies Detected</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fuel levels within expected parameters</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Efficient Drivers</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Best consumption rates across fleet drivers</CardDescription>
                        </div>
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                            View Full Analysis <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Driver</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Efficiency (L/100km)</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fleet Avg Savings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {topDrivers.length > 0 ? topDrivers.map((d: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                <Droplets className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{d.driver_name || 'Unknown'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{d.driver_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-[11px] text-emerald-600">
                                        {d.efficiency != null ? `${Number(d.efficiency).toFixed(2)} L/100km` : '—'}
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-[11px] text-slate-500 uppercase text-[10px]">
                                        {driverEffData?.savings_potential_naira != null
                                            ? `₦${Number(driverEffData.savings_potential_naira).toLocaleString()} (fleet)`
                                            : '—'
                                        }
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Droplets className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase">No Efficiency Data</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No driver efficiency records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
