'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getTopDriversByTrips, getDriverWorkloadDistribution, getDriverCompliance, getDriverIncidentHistory, getDriverTripSummary } from '@/lib/api/analytics'
import { Loader2, User, Award, ShieldAlert, FileCheck, Calendar, ChevronRight } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'

const COLORS = ['#10b981', '#4f46e5', '#f59e0b', '#ef4444']

export default function DriverAnalyticsPage() {
    const [filter, setFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

    const { data: tripSummaryData, isLoading: isTripSummaryLoading } = useQuery({
        queryKey: ['driver-trip-summary', filter],
        queryFn: () => getDriverTripSummary({ filter })
    })

    const { data: topDriversData, isLoading: isTopDriversLoading } = useQuery({
        queryKey: ['top-drivers-by-trips', filter],
        queryFn: () => getTopDriversByTrips({ limit: 10, period: filter })
    })

    const { data: workloadData, isLoading: isWorkloadLoading } = useQuery({
        queryKey: ['driver-workload-distribution'],
        queryFn: () => getDriverWorkloadDistribution()
    })

    const { data: complianceData, isLoading: isComplianceLoading } = useQuery({
        queryKey: ['driver-compliance'],
        queryFn: () => getDriverCompliance()
    })

    const { data: incidentHistoryData, isLoading: isIncidentsLoading } = useQuery({
        queryKey: ['driver-incident-history', filter],
        queryFn: () => getDriverIncidentHistory({ filter })
    })

    const performanceRadar = useMemo(() => {
        if (!complianceData) return []
        return [
            { subject: 'License', score: complianceData.licensed_pct || 0, fullMark: 100 },
            { subject: 'Medicals', score: complianceData.medical_clearance_pct || 0, fullMark: 100 },
            { subject: 'Training', score: complianceData.training_pct || 0, fullMark: 100 },
            { subject: 'Background', score: complianceData.background_check_pct || 0, fullMark: 100 },
            { subject: 'Safety', score: 85, fullMark: 100 }, // Mock until available
        ]
    }, [complianceData])

    const workloadChart = useMemo(() => {
        if (!workloadData?.distribution) return []
        return Object.entries(workloadData.distribution).map(([range, count]) => ({
            range,
            count: Number(count)
        }))
    }, [workloadData])

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
                    title="Active Drivers"
                    value={tripSummaryData?.active_drivers || 0}
                    icon={User}
                    description="Assigned to active vehicles"
                />
                <StatCard
                    title="Avg Safety Score"
                    value="4.8/5"
                    icon={Award}
                    description="Safety rating across fleet"
                />
                <StatCard
                    title="Incident Rate"
                    value={`${tripSummaryData?.incident_rate_pct || 0}%`}
                    icon={ShieldAlert}
                    description="Vs target of <2%"
                />
                <StatCard
                    title="Compliance Depth"
                    value={`${complianceData?.total_compliance_pct || 0}%`}
                    icon={FileCheck}
                    description="Document readiness score"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-1 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Compliance DNA</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Operational readiness footprint</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex justify-center h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={performanceRadar}>
                                <PolarGrid stroke="#f1f5f9" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Compliance" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} strokeWidth={3} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Workload Distribution</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Total trips completed per driver bracket</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
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
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Performing Drivers</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Ranked by trip volume & safety index</CardDescription>
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
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fuel Efficiency</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Safety Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {topDriversData?.data?.drivers?.map((d: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-[10px] font-black text-slate-400 uppercase italic">
                                                {d.driver_name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{d.driver_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{d.driver_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-[11px] font-black text-slate-700">{d.total_trips}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-[11px] font-black text-emerald-600">{d.fuel_efficiency} L/100km</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Award className="h-3 w-3 text-amber-500" />
                                            <span className="text-[11px] font-black text-slate-900">{d.safety_rating || 0}</span>
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
