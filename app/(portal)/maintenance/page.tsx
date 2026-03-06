'use client'

import React from 'react'
import { MaintenanceScheduleTable } from '@/components/maintenance/MaintenanceScheduleTable'
import { MaintenanceAlertList } from '@/components/maintenance/MaintenanceAlertList'
import { useQuery } from '@tanstack/react-query'
import { getMaintenances, getMaintenanceAlerts } from '@/lib/api/maintenance'
import { Button } from '@/components/ui/button'
import { Plus, BellRing, CalendarRange, Filter } from 'lucide-react'
import Link from 'next/link'
import { useSubscription } from '@/hooks/useSubscription'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function MaintenanceDashboardPage() {
    const { hasModule } = useSubscription()
    const canUseWorkflows = hasModule('maintenance')

    const [schedulePage, setSchedulePage] = React.useState(1)

    // In a real app we might fetch these based on active tabs or have pagination for alerts too
    const { data: scheduleData, isLoading: isLoadingSchedules } = useQuery({
        queryKey: ['maintenance-schedules', schedulePage],
        queryFn: () => getMaintenances({ page: schedulePage }),
    })

    const { data: alertData, isLoading: isLoadingAlerts } = useQuery({
        queryKey: ['maintenance-alerts'],
        queryFn: () => getMaintenanceAlerts(),
    })

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Maintenance Dashboard</h1>
                    <p className="text-slate-500 mt-1">Manage service schedules, active alerts, and vehicle health.</p>
                </div>
                <div className="flex items-center gap-3">
                    {canUseWorkflows && (
                        <Button variant="outline" className="border-slate-200 bg-white shadow-sm" asChild>
                            <Link href="/maintenance/jobs">
                                View Job Board
                            </Link>
                        </Button>
                    )}
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> New Schedule
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Col - Schedules */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 pb-4">
                            <div className="space-y-1 mt-0">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CalendarRange className="h-5 w-5 text-blue-500" />
                                    Upcoming & Overdue Schedules
                                </CardTitle>
                                <CardDescription>Track service intervals based on time and odometer readings.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 text-slate-500 hidden sm:flex">
                                <Filter className="h-4 w-4 mr-2" /> Filter
                            </Button>
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

                {/* Right Col - Alerts & Quick Stats */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm sticky top-6">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BellRing className="h-5 w-5 text-amber-500" />
                                    Action Required
                                </CardTitle>
                                {(alertData?.data?.alerts?.length || 0) > 0 && (
                                    <Badge variant="destructive" className="bg-rose-500">
                                        {alertData?.data?.alerts?.length}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>Automated alerts from telematics & schedules.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 bg-slate-50/30">
                            <MaintenanceAlertList
                                alerts={alertData?.data?.alerts || []}
                                isLoading={isLoadingAlerts}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
