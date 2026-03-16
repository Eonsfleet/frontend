'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar, Legend
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'
import { Loader2, MapPin, Navigation, Map, Ruler, ChevronRight, Activity } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function GpsAnalyticsPage() {
    const [filter, setFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

    const { data: tripSummary, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['gps-trip-summary', filter],
        queryFn: () => analyticsApi.getGpsTripSummary({ filter })
    })

    const { data: tripsOverTime, isLoading: isTimeLoading } = useQuery({
        queryKey: ['gps-trips-over-time', filter],
        queryFn: () => analyticsApi.getGpsTripsOverTime({ filter })
    })

    const { data: mileageData, isLoading: isMileageLoading } = useQuery({
        queryKey: ['gps-distance-mileage', filter],
        queryFn: () => analyticsApi.getGpsDistanceMileage({ filter })
    })

    const { data: topVehicles, isLoading: isTopVehLoading } = useQuery({
        queryKey: ['gps-top-by-distance', filter],
        queryFn: () => analyticsApi.getGpsTopByDistance({ filter, limit: 5 })
    })

    const { data: geofenceData, isLoading: isGeoLoading } = useQuery({
        queryKey: ['gps-geofence-activity', filter],
        queryFn: () => analyticsApi.getGeofenceActivity({ filter })
    })

    const trendData = useMemo(() => {
        if (!tripsOverTime?.labels) return []
        return tripsOverTime.labels.map((label: string, i: number) => ({
            name: label,
            trips: tripsOverTime.data[i]
        }))
    }, [tripsOverTime])

    const distanceTrend = useMemo(() => {
        if (!mileageData?.trend) return []
        return mileageData.trend.map((item: any) => ({
            name: item.period,
            distance: item.total_km
        }))
    }, [mileageData])

    const isLoading = isSummaryLoading || isTimeLoading || isMileageLoading || isTopVehLoading || isGeoLoading

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
                        GPS & <span className="text-blue-600">Routes</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Trip Patterns • Mileage Analytics • Geofence Monitoring
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
                    title="Total Distance"
                    value={`${tripSummary?.total_distance_km?.toLocaleString()} km`}
                    icon={Ruler}
                    description="Fleet cumulative travel"
                />
                <StatCard
                    title="Trip Completion"
                    value={`${tripSummary?.completion_rate_pct || 0}%`}
                    icon={Navigation}
                    description="Success rate across routes"
                />
                <StatCard
                    title="Avg Trip Dist"
                    value={`${tripSummary?.avg_distance_km?.toFixed(1) || 0} km`}
                    icon={MapPin}
                    description="Per completed route"
                />
                <StatCard
                    title="Top Breach Zones"
                    value={geofenceData?.top_breach_zones?.length || 0}
                    icon={Map}
                    description="Zones with recorded alerts"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Trip Frequency Trend</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Daily volume of logistical movements</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="h-[350px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
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
                                    <Area name="Trips" type="monotone" dataKey="trips" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTrips)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Geofence Activity</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Zone entry/exit frequency</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                        {geofenceData?.top_breach_zones?.length > 0 ? (
                            geofenceData.top_breach_zones.slice(0, 5).map((a: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <Map className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{a.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Zone #{a.geofence_id}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-rose-100 border-none text-rose-700 text-[8px] font-black uppercase">
                                        {a.alert_count} alerts
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[250px] text-center space-y-4">
                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Activity className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase">No Breach Activity</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No geofence alerts in this period</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4 border-b border-slate-50">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Mileage Leaderboard</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Vehicles with highest operational travel</CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Distance</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Utilization</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {topVehicles?.vehicles?.length > 0 ? topVehicles.vehicles.map((v: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{v.registration}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.make} {v.model}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-[11px] text-blue-600">
                                            {v.total_km?.toLocaleString()} km
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (v.total_km / 5000) * 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Ruler className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase">No Distance Data</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No trips recorded in this period</p>
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
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Distance Trend</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Daily mileage across entire fleet</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distanceTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="distance" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
