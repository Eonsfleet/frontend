'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'
import { Loader2, Wrench, Clock, DollarSign, ShieldCheck, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, string> = {
    'overdue': '#ef4444',
    'upcoming': '#f59e0b',
    'current': '#10b981',
    'closed': '#64748b',
    'in_progress': '#3b82f6'
}

export default function MaintenanceAnalyticsPage() {
    const [filter, setFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

    const { data: complianceData, isLoading: isCompLoading } = useQuery({
        queryKey: ['maintenance-compliance'],
        queryFn: () => analyticsApi.getMaintenanceScheduleCompliance()
    })

    const { data: costData, isLoading: isCostLoading } = useQuery({
        queryKey: ['maintenance-cost-report', filter],
        queryFn: () => analyticsApi.getMaintenanceCostReport({ filter })
    })

    const { data: workflowData, isLoading: isWorkLoading } = useQuery({
        queryKey: ['maintenance-workflow-report'],
        queryFn: () => analyticsApi.getMaintenanceWorkflowReport()
    })

    const { data: workshopSummary, isLoading: isWorkshopLoading } = useQuery({
        queryKey: ['maintenance-workshop-summary'],
        queryFn: () => analyticsApi.getMaintenanceWorkshopSummary()
    })

    const costTrend = useMemo(() => {
        if (!costData?.trend) return []
        return costData.trend.map((item: any) => ({
            name: item.period,
            cost: item.cost_kobo / 100
        }))
    }, [costData])

    const workflowChart = useMemo(() => {
        if (!workflowData?.by_status) return []
        return Object.entries(workflowData.by_status).map(([status, count]) => ({
            name: status.replace('_', ' ').toUpperCase(),
            value: count,
            color: STATUS_COLORS[status] || '#94a3b8'
        }))
    }, [workflowData])

    const isLoading = isCompLoading || isCostLoading || isWorkLoading || isWorkshopLoading

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    const summary = complianceData?.summary || { total: 0, overdue: 0, upcoming_14d: 0, compliance_rate: 0 }

    return (
        <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        Maintenance <span className="text-blue-600">Analytics</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Predictive Maintenance • Cost Control • Workflow Efficiency
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
                    title="Compliance Rate"
                    value={`${summary.compliance_rate}%`}
                    icon={ShieldCheck}
                    description="On-time services vs scheduled"
                />
                <StatCard
                    title="Total Maintenance Cost"
                    value={`₦${(costData?.total_cost_kobo / 100 || 0).toLocaleString()}`}
                    icon={DollarSign}
                    description="Cumulative spend in period"
                />
                <StatCard
                    title="Avg Turnaround"
                    value={`${workflowData?.avg_turnaround_days || 0} Days`}
                    icon={Clock}
                    description="From submission to completion"
                />
                <StatCard
                    title="Workshop Rating"
                    value={`${workshopSummary?.avg_rating || 0}/5`}
                    icon={CheckCircle2}
                    description="Service satisfaction score"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Maintenance Spend Trend</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Cost distribution over the selected period</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="h-[350px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={costTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                                        formatter={(val: number) => [`₦${val.toLocaleString()}`, 'Cost']}
                                    />
                                    <Bar dataKey="cost" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Workflow Status</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Distribution of active & closed jobs</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={workflowChart}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {workflowChart.map((entry: any, index: number) => (
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
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Compliance Alerts</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Immediate attention required</CardDescription>
                            </div>
                            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                                View All <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </CardHeader>
                    <div className="p-8 pt-4 space-y-4">
                        {complianceData?.schedules?.slice(0, 4).map((s: any, i: number) => (
                            <div key={i} className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border",
                                s.status === 'overdue' ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center",
                                        s.status === 'overdue' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                    )}>
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{s.vehicle_registration}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.service_type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        s.status === 'overdue' ? "text-rose-600" : "text-amber-600"
                                    )}>{s.status}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Due {s.due_date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardHeader className="p-8 pb-4 border-b border-slate-50">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Vehicle Costs</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Assets with highest maintenance expenditure</CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Cost</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Service</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {costData?.by_vehicle?.slice(0, 5).map((v: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{v.registration}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vehicle ID: {v.vehicle_id}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-[11px] text-rose-600">
                                            ₦{(v.total_cost_kobo / 100).toLocaleString()}
                                        </td>
                                        <td className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase">
                                            {v.last_service || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}
