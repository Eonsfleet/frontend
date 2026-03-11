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

const BRAND_BLUE = "text-[#0055FF]"
const BRAND_BLUE_BG = "bg-[#0055FF]"

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
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
                        Maintenance <span className="text-[#0055FF]">Command</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-bold italic text-[11px] uppercase tracking-widest flex items-center gap-2">
                        <span className="h-1 w-8 bg-[#0055FF] rounded-full" />
                        Fleet Health & Service Orchestration
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {canUseWorkflows && (
                        <Button variant="outline" className="border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-black text-[10px] uppercase tracking-[0.2em] px-6 h-11 rounded-xl" asChild>
                            <Link href="/maintenance/jobs">
                                View Job Board
                            </Link>
                        </Button>
                    )}
                    <Button
                        className="bg-slate-950 hover:bg-slate-900 shadow-2xl px-6 h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] group border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> New Schedule
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, idx) => (
                    <Card key={idx} className="border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group bg-white relative">
                        <div className={cn("absolute top-0 left-0 w-1 h-full", card.color.replace('text', 'bg'))} />
                        <CardContent className="p-7">
                            <div className="flex items-center justify-between">
                                <div className={cn(card.bg, "p-4 rounded-[24px] transition-all duration-500 group-hover:rounded-[12px] group-hover:rotate-6")}>
                                    <card.icon className={cn(card.color, "h-6 w-6")} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{card.title}</p>
                                    {isLoadingStats || isLoadingAlerts ? (
                                        <Skeleton className="h-8 w-16 ml-auto mt-2" />
                                    ) : (
                                        <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter">{card.value}</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
                                    <span className="text-[9px] font-black text-slate-900 underline decoration-[#0055FF]/20 underline-offset-4">LIVE DATA</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full transition-all duration-1000 ease-out w-2/3", card.color.replace('text', 'bg'))} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Col - Schedules */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[32px]">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 bg-white px-8 py-6 gap-4">
                            <div className="space-y-1">
                                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-4 italic">
                                    <div className="h-6 w-2 bg-[#0055FF] rounded-full" />
                                    Fleet Service Schedule
                                </CardTitle>
                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest px-6">Predictive maintenance & Lifecycle Intelligence</p>
                            </div>

                            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner overflow-x-auto max-w-full">
                                {filterOptions.map((opt) => (
                                    <button
                                        key={opt.label}
                                        onClick={() => {
                                            setStatusFilter(opt.value)
                                            setSchedulePage(1)
                                        }}
                                        className={cn(
                                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            statusFilter === opt.value
                                                ? "bg-white text-slate-900 shadow-lg"
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
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
