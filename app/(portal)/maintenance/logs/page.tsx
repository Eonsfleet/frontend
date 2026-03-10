'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMaintenanceLogs } from '@/lib/api/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    History,
    Wrench,
    ShieldCheck,
    AlertCircle,
    FileText,
    Car,
    User,
    Calendar,
    Search,
    Filter,
    ArrowUpRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function MaintenanceLogsPage() {
    const [searchQuery, setSearchQuery] = React.useState('')
    const { data: logData, isLoading } = useQuery({
        queryKey: ['maintenance-logs'],
        queryFn: () => getMaintenanceLogs({ per_page: 50 }),
    })

    const logs = logData?.data?.logs || []

    const filteredLogs = logs.filter((log: any) => {
        const query = searchQuery.toLowerCase()
        return (
            log.attributes.service_type?.toLowerCase().includes(query) ||
            log.relationships?.vehicle?.registration_number?.toLowerCase().includes(query) ||
            log.relationships?.technician?.name?.toLowerCase().includes(query)
        )
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
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Technician Logs</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
                        The <span className="text-blue-600">Archive</span>
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-sm">Comprehensive audit trail of every asset intervention and inspection.</p>
                </div>
                <Button className="bg-slate-950 hover:bg-slate-900 shadow-xl px-6 font-bold text-xs uppercase tracking-widest group">
                    <FileText className="mr-2 h-4 w-4" /> Export Report
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by Asset ID, Service Type, or Technician..."
                        className="pl-11 h-12 rounded-xl border-slate-200 bg-white shadow-sm font-medium text-sm focus:ring-slate-900 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-12 border-slate-200 bg-white font-black text-[10px] uppercase tracking-widest px-6 shadow-sm">
                    <Filter className="h-3.5 w-3.5 mr-2" /> Filter Archive
                </Button>
            </div>

            <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-8 py-6">
                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <History className="h-4 w-4 text-slate-400" /> Interaction History
                    </CardTitle>
                </CardHeader>
                <div className="divide-y divide-slate-100">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-8">
                                <Skeleton className="h-12 w-full rounded-xl bg-slate-50" />
                            </div>
                        ))
                    ) : filteredLogs.length ? (
                        filteredLogs.map((log: any) => (
                            <LogEntry key={log.id} log={log} />
                        ))
                    ) : (
                        <div className="py-20 text-center uppercase tracking-widest">
                            <History className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-slate-400">No matching logs found</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}

function LogEntry({ log }: { log: any }) {
    const attrs = log.attributes
    const vehicle = log.relationships?.vehicle
    const technician = log.relationships?.technician

    return (
        <div className="p-8 group hover:bg-slate-50/30 transition-all flex flex-col lg:flex-row gap-6 lg:items-center">
            <div className="flex items-center gap-4 min-w-[250px]">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <Car className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        {vehicle?.registration_number || attrs.vehicle_id}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {vehicle?.make} {vehicle?.model}
                    </p>
                </div>
            </div>

            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-md">
                        {attrs.service_type?.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Verified by</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight italic">{technician?.name || 'External Vendor'}</span>
                </div>
                <p className="text-xs font-bold text-slate-500 line-clamp-2 max-w-2xl leading-relaxed">
                    {attrs.notes || 'Routine maintenance cycle completed with no major issues reported.'}
                </p>
            </div>

            <div className="flex items-center gap-8 min-w-[300px] justify-between lg:justify-end">
                <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed At</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3 w-3 text-slate-300" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                            {attrs.completed_at ? format(new Date(attrs.completed_at), 'dd MMM yyyy') : 'Recently'}
                        </span>
                    </div>
                </div>

                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-xl" asChild>
                    <Link href={`/maintenance/logs/${log.id}`}>
                        <ArrowUpRight className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </div>
    )
}

function ChevronRight({ className }: { className?: string }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" /></svg>
}
