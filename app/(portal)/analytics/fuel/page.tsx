'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, Legend, AreaChart, Area 
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'
import { Loader2, Fuel, Zap, AlertTriangle, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function FuelAnalyticsPage() {
    const { data: consumptionData, isLoading: isConsLoading } = useQuery({
        queryKey: ['fuel-consumption-report'],
        queryFn: () => analyticsApi.getFuelConsumptionReport({ period: 'weekly' })
    })

    const { data: efficiencyData, isLoading: isEffLoading } = useQuery({
        queryKey: ['fuel-efficiency-report'],
        queryFn: () => analyticsApi.getFuelEfficiencyReport()
    })

    const { data: transactionsData, isLoading: isTxLoading } = useQuery({
        queryKey: ['fuel-card-transactions'],
        queryFn: () => analyticsApi.getFuelCardTransactions({ per_page: 5 })
    })

    const consumptionTrend = useMemo(() => {
        return consumptionData?.data?.report_data?.map((r: any) => ({
            name: r.date,
            liters: r.fuel_used_liters,
            cost: r.fuel_cost_kobo / 100
        })) || []
    }, [consumptionData])

    const efficiencyMetrics = useMemo(() => {
        return efficiencyData?.data?.report_data?.slice(0, 6).map((r: any) => ({
            name: r.vehicle_registration,
            actual: r.actual_efficiency,
            baseline: r.baseline_efficiency
        })) || []
    }, [efficiencyData])

    const totalStats = consumptionData?.data?.summary || { total_fuel_used_liters: 0, total_fuel_cost_kobo: 0, average_fuel_efficiency: 0 }

    if (isConsLoading || isEffLoading || isTxLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-full">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                    Fuel <span className="text-blue-600">Intelligence</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Expenditure Analysis • Efficiency Benchmarking
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Consumption</p>
                            <Fuel className="h-4 w-4 text-blue-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">{totalStats.total_fuel_used_liters.toLocaleString()} L</h3>
                        <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">Across all assets</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spend</p>
                            <Zap className="h-4 w-4 text-amber-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">₦{(totalStats.total_fuel_cost_kobo / 100).toLocaleString()}</h3>
                        <p className="text-[10px] text-amber-600 font-bold uppercase mt-1">Confirmed transactions</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Efficiency</p>
                            <TrendingDown className="h-4 w-4 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">{totalStats.average_fuel_efficiency.toFixed(2)} L/100km</h3>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Fleet average</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm border-l-4 border-l-rose-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anomalies Detected</p>
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 italic">2</h3>
                        <p className="text-[10px] text-rose-600 font-bold uppercase mt-1">Require investigation</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Consumption Trend</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Weekly Fuel Usage and Expenditure</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={consumptionTrend}>
                                    <defs>
                                        <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="liters" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLiters)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Efficiency Benchmarking</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Actual vs Baseline (L/100KM)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={efficiencyMetrics} layout="vertical" margin={{ left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip 
                                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingBottom: '20px' }} />
                                    <Bar dataKey="actual" fill="#ef4444" radius={[0, 4, 4, 0]} name="Actual" barSize={12} />
                                    <Bar dataKey="baseline" fill="#94a3b8" radius={[0, 4, 4, 0]} name="Baseline" barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Recent Card Transactions</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Real-time expenditure audit log</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[10px] text-left uppercase font-bold tracking-widest">
                            <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Timestamp</th>
                                    <th className="px-4 py-3">Vehicle</th>
                                    <th className="px-4 py-3">Merchant</th>
                                    <th className="px-4 py-3">Liters</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactionsData?.data?.transactions?.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{new Date(tx.transaction_date).toLocaleString()}</td>
                                        <td className="px-4 py-4 text-slate-900">{tx.vehicle_registration}</td>
                                        <td className="px-4 py-4 text-slate-700">{tx.merchant}</td>
                                        <td className="px-4 py-4 text-slate-900">{tx.liters_dispensed} L</td>
                                        <td className="px-4 py-4 text-blue-600">₦{(tx.amount_kobo / 100).toLocaleString()}</td>
                                        <td className="px-4 py-4">
                                            <Badge className={tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                                                {tx.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
