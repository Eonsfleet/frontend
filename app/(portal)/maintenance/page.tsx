'use client'

import React from 'react'
import { MaintenanceScheduleTable } from '@/components/maintenance/MaintenanceScheduleTable'
import { MaintenanceAlertList } from '@/components/maintenance/MaintenanceAlertList'
import { useQuery } from '@tanstack/react-query'
import { getMaintenances, getMaintenanceAlerts, getMaintenanceStats, getUpcomingMaintenance } from '@/lib/api/maintenance'
import { Button } from '@/components/ui/button'
import { Plus, BellRing, Wrench, Clock, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useSubscription } from '@/hooks/useSubscription'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CreateMaintenanceScheduleModal } from '@/components/maintenance/CreateScheduleModal'

export default function MaintenanceDashboardPage() {
    const { hasModule } = useSubscription()
    const canUseWorkflows = hasModule('maintenance')

    const [schedulePage, setSchedulePage] = React.useState(1)
    const [statusFilter, setStatusFilter] = React.useState<string | undefined>(undefined)
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)

    const { data: scheduleData, isLoading: isLoadingSchedules } = useQuery({
        queryKey: ['maintenance-schedules', schedulePage, statusFilter],
        queryFn: () => getMaintenances({ page: schedulePage, status: statusFilter }),
    })

    const { data: alertData, isLoading: isLoadingAlerts } = useQuery({
        queryKey: ['maintenance-alerts'],
        queryFn: () => getMaintenanceAlerts(),
    })

    const { data: statsData, isLoading: isLoadingStats } = useQuery({
        queryKey: ['maintenance-stats'],
        queryFn: () => getMaintenanceStats(),
    })

    const { data: upcomingData, isLoading: isLoadingUpcoming } = useQuery({
        queryKey: ['maintenance-upcoming'],
        queryFn: () => getUpcomingMaintenance(),
    })

    const stats = statsData?.data || {}
    const upcomingCount = upcomingData?.data?.forecast?.reduce((acc: number, f: any) => acc + f.count, 0) || 0

    const kpiCards = [
        {
            title: 'Upcoming Service',
            value: upcomingCount,
            label: 'Next 7 Days',
            icon: Clock,
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            title: 'Active Alerts',
            value: alertData?.data?.pagination?.total || 0,
            label: 'Requires Action',
            icon: BellRing,
            color: 'text-amber-500',
            bg: 'bg-amber-50'
        },
        {
            title: 'Jobs in Progress',
            value: stats.in_progress_jobs || 0,
            label: 'Current Operations',
            icon: Wrench,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50'
        },
        {
            title: 'Compliance Rate',
            value: `${stats.compliance_rate || 0}%`,
            label: 'On-time Performance',
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50'
        }
    ]

    const filterOptions = [
        { label: 'All Cycles', value: undefined },
        { label: 'Pending', value: 'pending' },
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Completed', value: 'completed' },
    ]

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
                        Maintenance <span className="text-blue-600">Command</span>
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-sm">Orchestrate fleet health, service schedules, and critical repair workflows.</p>
                </div>
                <div className="flex items-center gap-3">
                    {canUseWorkflows && (
                        <Button variant="outline" className="border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-bold text-xs uppercase tracking-widest px-6" asChild>
                            <Link href="/maintenance/jobs">
                                View Job Board
                            </Link>
                        </Button>
                    )}
                    <Button
                        className="bg-slate-950 hover:bg-slate-900 shadow-xl px-6 font-bold text-xs uppercase tracking-widest group"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> New Schedule
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, idx) => (
                    <Card key={idx} className="border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className={card.bg + " p-3 rounded-2xl transition-transform group-hover:scale-110"}>
                                    <card.icon className={card.color + " h-6 w-6"} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.title}</p>
                                    {isLoadingStats || isLoadingAlerts ? (
                                        <Skeleton className="h-8 w-16 ml-auto mt-1" />
                                    ) : (
                                        <p className="text-2xl font-black text-slate-900 mt-0.5">{card.value}</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{card.label}</span>
                                <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${card.color.replace('text', 'bg')} w-2/3`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Col - Schedules */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 gap-4">
                            <div className="space-y-1">
                                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 italic">
                                    <div className="h-6 w-1.5 bg-blue-600 rounded-full" />
                                    Fleet Service Schedule
                                </CardTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-4 ml-0.5">Time & Odometer based monitoring</p>
                            </div>

                            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
                                {filterOptions.map((opt) => (
                                    <button
                                        key={opt.label}
                                        onClick={() => {
                                            setStatusFilter(opt.value)
                                            setSchedulePage(1)
                                        }}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            statusFilter === opt.value
                                                ? "bg-slate-900 text-white shadow-lg"
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <MaintenanceScheduleTable
                                data={scheduleData?.data?.schedules || []}
                                isLoading={isLoadingSchedules}
                                pagination={scheduleData?.data?.pagination}
                                onPageChange={setSchedulePage}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Col - Alerts */}
                <div className="space-y-6">
                    <Card className="border-slate-200/60 shadow-sm sticky top-6 overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 italic">
                                    <div className="h-6 w-1.5 bg-amber-500 rounded-full" />
                                    Critical Alerts
                                </CardTitle>
                                <Link href="/maintenance/alerts" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                                    Inbox
                                </Link>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-4 ml-0.5">Immediate intervention required</p>
                        </CardHeader>
                        <CardContent className="p-6 bg-slate-50/30">
                            <MaintenanceAlertList
                                alerts={alertData?.data?.alerts || []}
                                isLoading={isLoadingAlerts}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <CreateMaintenanceScheduleModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />
        </div>
    )
}
