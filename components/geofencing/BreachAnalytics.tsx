'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import { AlertTriangle, TrendingDown, Clock, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const BREACH_DATA = [
    { day: 'Mon', count: 12 },
    { day: 'Tue', count: 18 },
    { day: 'Wed', count: 8 },
    { day: 'Thu', count: 5 },
    { day: 'Fri', count: 14 },
    { day: 'Sat', count: 22 },
    { day: 'Sun', count: 10 },
]

const TOP_OFFENDERS = [
    { plate: 'LND-123-XY', breaches: 8, last: '2h ago' },
    { plate: 'ABJ-456-ZZ', breaches: 5, last: '5h ago' },
    { plate: 'PH-789-BC', breaches: 3, last: '1d ago' },
]

export function BreachAnalytics({
    isOpen,
    onClose,
    geofenceName = 'WAREHOUSE ALPHA'
}: {
    isOpen: boolean
    onClose: () => void
    geofenceName?: string
}) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                            Zone <span className="text-rose-600">Breach</span> Intelligence
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Geofence: {geofenceName} • Last 7 Days
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-colors shadow-sm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* KPI Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 group">
                            <div className="flex items-center justify-between mb-4">
                                <AlertTriangle className="h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Total Breaches</span>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 italic">89</h3>
                            <p className="text-[10px] text-rose-600 font-bold uppercase mt-2">+12% vs prev. week</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <Clock className="h-5 w-5 text-blue-500" />
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Avg. Stay Duration</span>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 italic">42m</h3>
                            <p className="text-[10px] text-blue-600 font-bold uppercase mt-2">Optimal efficiency</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center justify-between mb-4">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Compliance Rate</span>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 italic">94%</h3>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">Target reached</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Breach Trend Chart */}
                        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Violation Intensity</CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Daily Breach distribution</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={BREACH_DATA}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="day"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                                {BREACH_DATA.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.count > 15 ? '#f43f5e' : '#4f46e5'} opacity={0.8} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Offenders List */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-rose-500" />
                                Top Offending Vehicles
                            </h3>
                            <div className="space-y-3">
                                {TOP_OFFENDERS.map((v) => (
                                    <div key={v.plate} className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-rose-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-rose-500 transition-colors shadow-sm">
                                                <TrendingDown className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 uppercase italic">{v.plate}</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last violation: {v.last}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-rose-600">{v.breaches}</div>
                                            <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Breaches</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full py-3 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                                Download Compliance Report
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-900 border-t border-slate-800 flex items-center justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest transition-all"
                    >
                        CLOSE ANALYSIS
                    </button>
                </div>
            </div>
        </div>
    )
}
