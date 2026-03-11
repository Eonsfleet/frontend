'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, Legend, Cell
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'
import { Loader2, Fuel, Zap, AlertTriangle, TrendingDown, ChevronRight, Droplets } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function FuelAnalyticsPage() {
    const [filter, setFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

    const { data: consumptionData, isLoading: isConsLoading } = useQuery({
        queryKey: ['fuel-consumption-report', filter],
        queryFn: () => analyticsApi.getFuelConsumptionReport({ period: filter === '7d' ? 'daily' : 'weekly' })
    })

    const { data: executiveKpis, isLoading: isKpiLoading } = useQuery({
        queryKey: ['fuel-executive-kpis'],
        queryFn: () => analyticsApi.getFuelExecutiveKpis()
    })

    const { data: efficiencyData, isLoading: isEffLoading } = useQuery({
        queryKey: ['fuel-efficiency-report', filter],
        queryFn: () => analyticsApi.getFuelEfficiencyReport({ per_page: 5 })
    })

    const { data: anomalyData, isLoading: isAnomalyLoading } = useQuery({
        queryKey: ['fuel-anomaly-report', filter],
        queryFn: () => analyticsApi.getFuelAnomalyReport({ filter })
    })

    const { data: driverEffData, isLoading: isDriverEffLoading } = useQuery({
        queryKey: ['fuel-driver-efficiency', filter],
        queryFn: () => analyticsApi.getFuelDriverEfficiency({ filter })
    })

    const consumptionTrend = useMemo(() => {
        if (!consumptionData?.data?.report) return []
        return consumptionData.data.report.map((item: any) => ({
            name: item.period_label,
            liters: item.total_fuel_liters,
            cost: item.total_cost
        }))
    }, [consumptionData])

    const kpis = executiveKpis?.data || { total_consumption: 0, total_spend: 0, avg_efficiency: 0, anomaly_count: 0 }

    const isLoading = isConsLoading || isKpiLoading || isEffLoading || isAnomalyLoading || isDriverEffLoading

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
                    value={`${kpis.total_consumption?.toLocaleString()} L`}
                    icon={Fuel}
                    description="Current period volume"
                />
                <StatCard
                    title="Total Spend"
                    value={`₦${kpis.total_spend?.toLocaleString()}`}
                    icon={Zap}
                    description="Confirmed fuel expenditure"
                />
                <StatCard
                    title="Fleet Efficiency"
                    value={`${kpis.avg_efficiency?.toFixed(1)} L/100km`}
                    icon={TrendingDown}
                    description="Average consumption rate"
                />
                <StatCard
                    title="Risk Indicators"
                    value={kpis.anomaly_count || 0}
                    icon={AlertTriangle}
                    className={kpis.anomaly_count > 0 ? "border-l-4 border-l-rose-500 shadow-rose-100" : ""}
                    description="Unusual patterns detected"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Expenditure Flow</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Liters consumed vs Operational cost</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="h-[350px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={consumptionTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
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
                                    <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                    <Area name="Cost (₦)" type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                                    <Area name="Liters (L)" type="monotone" dataKey="liters" stroke="#10b981" strokeWidth={3} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Loss Prevention</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Anomalies & suspected misuse</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex flex-col gap-4">
                        {anomalyData?.data?.anomalies?.length > 0 ? (
                            anomalyData.data.anomalies.map((a: any, i: number) => (
                                <div key={i} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Badge className="bg-rose-600 text-white border-none text-[8px] font-black uppercase">{a.type}</Badge>
                                        <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">{a.date}</span>
                                    </div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{a.vehicle_registration}</p>
                                    <p className="text-[10px] font-bold text-rose-700 leading-relaxed uppercase">{a.description}</p>
                                    <div className="flex items-center gap-2 text-[9px] font-black text-rose-600 uppercase pt-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Impact: {a.variance_liters}L Variance
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <Droplets className="h-8 w-8 text-emerald-500" />
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
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Driver Efficiency Rankings</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Best performing drivers by consumption rate</CardDescription>
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
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fuel Strategy</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Consumption</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Savings Impact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {driverEffData?.data?.rankings?.map((d: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                <Droplets className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{d.driver_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{d.driver_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <Badge className={cn(
                                            "text-[8px] font-black uppercase border-none px-2 py-0.5",
                                            d.status === 'optimal' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {d.status || 'Efficient'}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-[11px] text-slate-700">
                                        {d.avg_consumption_l100km} L/100KM
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-[11px] text-emerald-600">
                                        + ₦{d.savings_potential?.toLocaleString()} saved
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
