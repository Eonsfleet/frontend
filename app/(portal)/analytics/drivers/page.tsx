'use client'

import React, { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getTopDriversByTrips, getDriverWorkloadDistribution, getDriverCompliance, getDriverIncidentHistory, getDriverTripSummary, getDriverRiskRanking } from '@/lib/api/analytics'
import { Loader2, User, Award, ShieldAlert, FileCheck, ChevronRight, FileWarning, CheckCircle2, AlertCircle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar'

const COMPLIANCE_COLORS = ['#10b981', '#f59e0b', '#ef4444']

export default function DriverAnalyticsPage() {
    const searchParams = useSearchParams()
    const filter = (searchParams.get('filter') ?? '30d') as '7d' | '30d' | '90d' | '1y'

    const { data: tripSummaryData, isLoading: isTripSummaryLoading } = useQuery({
        queryKey: ['driver-trip-summary', filter],
        queryFn: () => getDriverTripSummary({ filter })
    })

    const { data: topDriversData, isLoading: isTopDriversLoading } = useQuery({
        queryKey: ['top-drivers-by-trips', filter],
        queryFn: () => getTopDriversByTrips({ limit: 10, filter })
    })

    const { data: workloadData, isLoading: isWorkloadLoading } = useQuery({
        queryKey: ['driver-workload-distribution', filter],
        queryFn: () => getDriverWorkloadDistribution({ filter })
    })

    const { data: complianceData, isLoading: isComplianceLoading } = useQuery({
        queryKey: ['driver-compliance'],
        queryFn: () => getDriverCompliance()
    })

    const { data: incidentHistoryData, isLoading: isIncidentsLoading } = useQuery({
        queryKey: ['driver-incident-history'],
        queryFn: () => getDriverIncidentHistory({ limit: 20 })
    })

    const { data: riskRankingData } = useQuery({
        queryKey: ['driver-risk-ranking'],
        queryFn: () => getDriverRiskRanking({ limit: 10 })
    })

    const complianceChart = useMemo(() => {
        if (!complianceData) return []
        return [
            { name: 'Current', value: complianceData.current || 0, color: '#10b981' },
            { name: 'Expiring Soon', value: complianceData.expiring_soon || 0, color: '#f59e0b' },
            { name: 'Expired', value: complianceData.expired || 0, color: '#ef4444' },
        ].filter(d => d.value > 0)
    }, [complianceData])

    const workloadChart = useMemo(() => {
        if (!workloadData?.buckets) return []
        return Object.entries(workloadData.buckets).map(([range, val]: [string, any]) => ({
            range,
            count: Number(val?.count ?? val)
        }))
    }, [workloadData])

    const totalCompliance = (complianceData?.current || 0) + (complianceData?.expiring_soon || 0) + (complianceData?.expired || 0)
    const compliancePct = totalCompliance > 0
        ? Math.round((complianceData?.current || 0) / totalCompliance * 100)
        : 0

    const totalIncidents = useMemo(() =>
        incidentHistoryData?.data?.reduce((sum: number, d: any) => sum + (d.incident_count || 0), 0) ?? 0,
        [incidentHistoryData]
    )

    const drivers: any[] = topDriversData?.drivers ?? []

    const isLoading = isTripSummaryLoading || isTopDriversLoading || isWorkloadLoading || isComplianceLoading || isIncidentsLoading

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
                        Driver <span className="text-blue-600">Performance</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Operational Safety • Behavior Analytics • Compliance
                    </p>
                </div>
            </div>

            <AnalyticsFilterBar reportType="drivers.trip-summary" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Active Drivers"
                    value={tripSummaryData?.data?.length || 0}
                    icon={User}
                    description="Drivers with trips in period"
                />
                <StatCard
                    title="Total Incidents"
                    value={totalIncidents}
                    icon={ShieldAlert}
                    description="Logged driver incidents"
                />
                <StatCard
                    title="Docs Expiring Soon"
                    value={complianceData?.expiring_soon || 0}
                    icon={FileWarning}
                    description="Require immediate renewal"
                />
                <StatCard
                    title="Compliance Depth"
                    value={`${compliancePct}%`}
                    icon={FileCheck}
                    description="Document readiness score"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-1 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Compliance Status</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Driver document validity breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex flex-col items-center">
                        {complianceChart.length > 0 ? (
                            <>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={complianceChart}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {complianceChart.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-1 gap-3 w-full mt-4">
                                    {complianceChart.map(item => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-slate-900">{item.value} drivers</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase">No Compliance Data</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No driver documents found</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Workload Distribution</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Total trips completed per driver bracket</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        {workloadChart.length > 0 ? (
                            <div className="h-[350px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={workloadChart} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[350px] text-center space-y-4">
                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <User className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase">No Workload Data</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No trip data available for this period</p>
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
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Performing Drivers</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Ranked by trip volume in selected period</CardDescription>
                        </div>
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                            Export Rankings <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Driver</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trips</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Distance</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {drivers.length > 0 ? drivers.map((d: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm text-[10px] font-black text-slate-400 uppercase italic">
                                                {d.driver_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{d.driver_name || 'Unknown'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{d.driver_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-[11px] font-black text-slate-700">{d.trips_count ?? '—'}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-[11px] font-black text-blue-600">
                                            {d.total_distance_km != null ? `${d.total_distance_km.toLocaleString()} km` : '—'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-[11px] font-black text-slate-700">
                                            {d.avg_duration_hours != null ? `${Number(d.avg_duration_hours).toFixed(1)} hrs` : '—'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Award className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase">No Driver Data</p>
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
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Driver Risk Rankings</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Drivers ranked by operational risk score</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Driver</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Risk Score</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Risk Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {riskRankingData?.drivers?.length > 0 ? riskRankingData.drivers.map((d: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm text-[10px] font-black text-slate-400 uppercase italic">
                                                {d.driver_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{d.driver_name || 'Unknown'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{d.driver_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-[11px] font-black text-slate-700">{d.risk_score ?? '—'}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                                            d.risk_level === 'high' || d.risk_level === 'critical' ? 'bg-rose-100 text-rose-700'
                                            : d.risk_level === 'medium' ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                        }`}>{d.risk_level ?? 'low'}</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <AlertCircle className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase">No Risk Data</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No driver risk profiles available</p>
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
