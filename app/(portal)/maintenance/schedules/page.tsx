'use client'

import React from 'react'
import { MaintenanceScheduleTable } from '@/components/maintenance/MaintenanceScheduleTable'
import { useQuery } from '@tanstack/react-query'
import { getMaintenances } from '@/lib/api/maintenance'
import { Button } from '@/components/ui/button'
import { Plus, Search, Download, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CreateMaintenanceScheduleModal } from '@/components/maintenance/CreateScheduleModal'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: { label: string; value: string | undefined }[] = [
    { label: 'All Cycles', value: undefined },
    { label: 'Upcoming',   value: 'upcoming' },
    { label: 'Overdue',    value: 'overdue' },
    { label: 'Completed',  value: 'completed' },
    { label: 'Cancelled',  value: 'cancelled' },
]

export default function MaintenanceSchedulesPage() {
    const [page, setPage] = React.useState(1)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [statusFilter, setStatusFilter] = React.useState<string | undefined>(undefined)
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)

    const { data: scheduleData, isLoading } = useQuery({
        queryKey: ['maintenance-schedules-full', page, searchQuery, statusFilter],
        queryFn: () => getMaintenances({
            page,
            per_page: 20,
            q: searchQuery || undefined,
            status: statusFilter,
        }),
    })

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/maintenance" className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                            Maintenance Command
                        </Link>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Schedules</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
                        The <span className="text-blue-600">Blueprint</span>
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-sm">Static and dynamic service definitions for every asset in your fleet.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-slate-200 bg-white shadow-sm font-bold text-xs uppercase tracking-widest px-6 h-12">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button
                        className="bg-slate-950 hover:bg-slate-900 shadow-xl px-6 font-bold text-xs uppercase tracking-widest group h-12"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> New Cycle
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Filter by Registration, Asset ID or Service Type..."
                        className="pl-11 h-12 rounded-xl border-slate-200 bg-white shadow-sm font-medium text-sm focus:ring-slate-900 transition-all"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setPage(1)
                        }}
                    />
                </div>
            </div>

            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner w-fit overflow-x-auto max-w-full">
                {STATUS_FILTERS.map((opt) => (
                    <button
                        key={opt.label}
                        onClick={() => {
                            setStatusFilter(opt.value)
                            setPage(1)
                        }}
                        className={cn(
                            'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                            statusFilter === opt.value
                                ? 'bg-white text-slate-900 shadow-lg'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-0">
                    <MaintenanceScheduleTable
                        data={scheduleData?.data?.schedules || []}
                        isLoading={isLoading}
                        pagination={scheduleData?.data?.pagination}
                        onPageChange={setPage}
                    />
                </CardContent>
            </Card>

            <CreateMaintenanceScheduleModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />
        </div>
    )
}
