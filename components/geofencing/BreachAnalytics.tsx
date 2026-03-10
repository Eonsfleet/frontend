'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { AlertTriangle, TrendingDown, Clock, ShieldCheck, X, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as geofencingApi from '@/lib/api/geofencing'
import { format, parseISO } from 'date-fns'

export function BreachAnalytics({
    isOpen,
    onClose,
    geofenceId,
    geofenceName = 'WAREHOUSE ALPHA'
}: {
    isOpen: boolean
    onClose: () => void
    geofenceId?: string | number
    geofenceName?: string
}) {
    const { data: analyticsData, isLoading } = useQuery({
        queryKey: ['geofence-analytics', geofenceId],
        queryFn: () => geofencingApi.getGeofenceAnalytics(geofenceId!, {
            days: 30,
            include_timeline: true,
            include_ranking: true,
        }),
        enabled: isOpen && !!geofenceId
    })

    if (!isOpen) return null

    const analytics = analyticsData?.data
    const summary = analytics?.summary
    const timeline: { date: string; breach_count: number }[] = analytics?.timeline || []
    const vehicleRanking: { rank: number; registration: string; breach_count: number; last_breach: string | null }[] = analytics?.vehicle_ranking || []

    // Format timeline for the chart — show last 7 days of the 30-day window
    const chartData = timeline.slice(-7).map(point => ({
        day: (() => {
            try { return format(parseISO(point.date), 'EEE') } catch { return point.date }
        })(),
        count: point.breach_count,
    }))

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                            Zone <span className="text-rose-600">Breach</span> Intelligence
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Geofence: {geofenceName} • Last 30 Days
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
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Loading breach data...</p>
                        </div>
                    ) : (
                        <>
                            {/* KPI Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 group">
                                    <div className="flex items-center justify-between mb-4">
                                        <AlertTriangle className="h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Total Breaches</span>
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 italic">{summary?.total_breaches ?? '—'}</h3>
                                    <p className="text-[10px] text-rose-600 font-bold uppercase mt-2">
                                        {summary?.breach_rate_per_day != null
                                            ? `${summary.breach_rate_per_day.toFixed(1)} per day avg`
                                            : 'Historical total'}
                                    </p>
                                </div>
                                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <Clock className="h-5 w-5 text-blue-500" />
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Avg. Dwell Time</span>
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 italic">
                                        {summary?.average_dwell_time_minutes != null
                                            ? `${summary.average_dwell_time_minutes}m`
                                            : '—'}
                                    </h3>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase mt-2">Per breach event</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Peak Breach Time</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 italic mt-2">
                                        {summary?.peak_breach_time ?? '—'}
                                    </h3>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">Highest activity window</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Breach Trend Chart */}
                                <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Violation Intensity</CardTitle>
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Daily breach distribution (last 7 days)</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {chartData.length === 0 ? (
                                            <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm font-medium">
                                                No breach data available
                                            </div>
                                        ) : (
                                            <div className="h-[250px] w-full mt-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={chartData}>
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
                                                            allowDecimals={false}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: '#f8fafc' }}
                                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                                                        />
                                                        <Bar
                                                            dataKey="count"
                                                            radius={[6, 6, 0, 0]}
                                                            fill="#4f46e5"
                                                            opacity={0.85}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Top Offenders List */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4 text-rose-500" />
                                        Top Offending Vehicles
                                    </h3>
                                    <div className="space-y-3">
                                        {vehicleRanking.length === 0 ? (
                                            <p className="text-sm text-slate-400 font-medium py-4 text-center">No offender data available</p>
                                        ) : vehicleRanking.map((v) => {
                                            const lastBreachLabel = v.last_breach
                                                ? (() => {
                                                    try { return format(parseISO(v.last_breach), 'dd MMM, HH:mm') } catch { return v.last_breach }
                                                })()
                                                : 'N/A'
                                            return (
                                                <div key={v.registration} className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-rose-200 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-rose-500 transition-colors shadow-sm">
                                                            <TrendingDown className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-slate-900 uppercase italic">{v.registration}</h4>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last: {lastBreachLabel}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-black text-rose-600">{v.breach_count}</div>
                                                        <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Breaches</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
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
