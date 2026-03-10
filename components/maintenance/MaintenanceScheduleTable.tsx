'use client'

import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import { MaintenanceSchedule } from '@/types'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Car, AlertTriangle, CheckCircle2, Clock, MoreHorizontal, Calendar, Wrench } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSchedule } from '@/lib/api/maintenance'
import { toast } from 'sonner'

interface MaintenanceScheduleTableProps {
    data: MaintenanceSchedule[]
    isLoading?: boolean
    pagination?: {
        current_page: number
        last_page: number
        total: number
        per_page?: number
    }
    onPageChange?: (page: number) => void
}

const getStatusStyles = (status: string, dueDate?: string) => {
    const isOverdue = dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate))

    if (isOverdue && status !== 'completed') {
        return {
            label: 'Overdue',
            className: 'bg-rose-50 text-rose-600 border-rose-100 font-black flex items-center gap-1',
            icon: AlertTriangle
        }
    }

    switch (status.toLowerCase()) {
        case 'upcoming':
        case 'pending':
            return {
                label: 'Pending',
                className: 'bg-blue-50 text-blue-600 border-blue-100 font-black flex items-center gap-1',
                icon: Clock
            }
        case 'completed':
            return {
                label: 'Completed',
                className: 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black flex items-center gap-1',
                icon: CheckCircle2
            }
        default:
            return {
                label: status,
                className: 'bg-slate-50 text-slate-600 border-slate-100 font-black flex items-center gap-1',
                icon: Calendar
            }
    }
}

const getDueDateDisplay = (dueDate?: string) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    const daysDiff = differenceInDays(date, new Date())

    if (isPast(date) && !isToday(date)) {
        return <span className="text-rose-600 font-black uppercase text-[9px] tracking-tight">Overdue by {Math.abs(daysDiff)} days</span>
    }
    if (isToday(date)) {
        return <span className="text-amber-600 font-black uppercase text-[9px] tracking-tight text-glow">Due Today</span>
    }
    if (daysDiff <= 7) {
        return <span className="text-blue-600 font-black uppercase text-[9px] tracking-tight">Due in {daysDiff} days</span>
    }
    return <span className="text-slate-400 font-bold uppercase text-[9px] tracking-tight">In {daysDiff} days</span>
}

export function MaintenanceScheduleTable({
    data,
    isLoading,
    pagination,
    onPageChange
}: MaintenanceScheduleTableProps) {
    const queryClient = useQueryClient()

    const { mutate: cancelSchedule, variables: cancellingId } = useMutation({
        mutationFn: (id: string) => deleteSchedule(id),
        onSuccess: () => {
            toast.success('Schedule cancelled.')
            queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-schedules-full'] })
        },
        onError: () => toast.error('Failed to cancel schedule.'),
    })

    if (isLoading) {
        return (
            <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-50" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[200px] text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Asset / Vehicle</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Service Type</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 text-center">Interval</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Schedule Target</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Compliance</TableHead>
                            <TableHead className="w-[100px] text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.length ? (
                            data.map((row) => {
                                const attrs = row.attributes || {}
                                const statusInfo = getStatusStyles(attrs.status, attrs.due_date)
                                const vehicle = row.relationships?.vehicle

                                return (
                                    <TableRow key={row.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                                                    <Car className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                                        {vehicle?.registration_number ?? attrs.vehicle_id ?? 'N/A'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                                                        {vehicle?.make} {vehicle?.model}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                                    {(attrs.service_type || 'Maintenance').replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[200px]">
                                                    {attrs.description || attrs.notes || 'Routine checkup'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-center">
                                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-500 rounded-lg">
                                                {attrs.schedule_type === 'mileage' ?
                                                    `${(attrs.interval_value || 0).toLocaleString()} KM` :
                                                    `${attrs.interval_value || 0} ${attrs.interval_unit || 'months'}`
                                                }
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 text-slate-300" />
                                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                                        {attrs.due_date ? format(new Date(attrs.due_date), 'dd MMM yyyy') : 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                                                    <span className="text-[10px] font-bold text-slate-400 tracking-tight">
                                                        Target: {attrs.expected_odometer ? `${attrs.expected_odometer.toLocaleString()} KM` : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <Badge variant="outline" className={cn("text-[9px] uppercase px-2 py-0.5 rounded-full border shadow-sm w-fit", statusInfo.className)}>
                                                    <statusInfo.icon className="h-2.5 w-2.5" />
                                                    {statusInfo.label}
                                                </Badge>
                                                {getDueDateDisplay(attrs.due_date)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-2xl border-slate-100">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Schedule Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="rounded-lg text-xs font-bold uppercase tracking-tight gap-2 py-2 cursor-pointer">
                                                        <Wrench className="h-3.5 w-3.5" /> Create Work Order
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-lg text-xs font-bold uppercase tracking-tight gap-2 py-2 cursor-pointer">
                                                        <Clock className="h-3.5 w-3.5" /> Reschedule
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="rounded-lg text-xs font-bold uppercase tracking-tight gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                                                        disabled={cancellingId === row.id}
                                                        onClick={() => cancelSchedule(String(row.id))}
                                                    >
                                                        <AlertTriangle className="h-3.5 w-3.5" /> Cancel Schedule
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Calendar className="h-8 w-8 text-slate-200" />
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No active schedules found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50 bg-slate-50/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing <span className="text-slate-900">{data.length}</span> of <span className="text-slate-900">{pagination.total}</span> Asset Cycles
                    </p>
                    <Pagination className="mx-0 w-auto">
                        <PaginationContent className="gap-1">
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.current_page > 1) onPageChange?.(pagination.current_page - 1);
                                    }}
                                    className={cn(
                                        "h-8 px-3 text-[10px] font-black uppercase tracking-widest border-slate-100 rounded-lg",
                                        pagination.current_page === 1 ? "pointer-events-none opacity-30" : "cursor-pointer hover:bg-slate-100"
                                    )}
                                />
                            </PaginationItem>

                            {/* Simple pagination numbers */}
                            {Array.from({ length: Math.min(3, pagination.last_page) }, (_, i) => {
                                let pageNum = i + 1;
                                if (pagination.last_page > 3 && pagination.current_page > 2) {
                                    pageNum = pagination.current_page - 1 + i;
                                    if (pageNum > pagination.last_page) pageNum = pagination.last_page - 2 + i;
                                }

                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href="#"
                                            isActive={pagination.current_page === pageNum}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onPageChange?.(pageNum);
                                            }}
                                            className={cn(
                                                "h-8 w-8 p-0 text-[10px] font-black rounded-lg border-slate-100 transition-all",
                                                pagination.current_page === pageNum ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-110" : "cursor-pointer hover:bg-slate-100"
                                            )}
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                )
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.current_page < pagination.last_page) onPageChange?.(pagination.current_page + 1);
                                    }}
                                    className={cn(
                                        "h-8 px-3 text-[10px] font-black uppercase tracking-widest border-slate-100 rounded-lg",
                                        pagination.current_page === pagination.last_page ? "pointer-events-none opacity-30" : "cursor-pointer hover:bg-slate-100"
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    )
}
