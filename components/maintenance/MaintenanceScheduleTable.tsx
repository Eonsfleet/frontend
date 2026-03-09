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
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface MaintenanceScheduleTableProps {
    data: MaintenanceSchedule[]
    isLoading?: boolean
    pagination?: {
        current: number
        lastPage: number
        total: number
    }
    onPageChange?: (page: number) => void
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'upcoming': return 'bg-blue-100 text-blue-800'
        case 'overdue': return 'bg-rose-100 text-rose-800'
        case 'completed': return 'bg-green-100 text-green-800'
        default: return 'bg-slate-100 text-slate-800'
    }
}

export function MaintenanceScheduleTable({
    data,
    isLoading,
    pagination,
    onPageChange
}: MaintenanceScheduleTableProps) {
    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading schedules...</div>
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Vehicle Ref</TableHead>
                            <TableHead>Service Type</TableHead>
                            <TableHead>Last Service</TableHead>
                            <TableHead>Next Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.length ? (
                            data.map((row) => {
                                const attrs = row.attributes || {}
                                return (
                                    <TableRow key={row.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-900">
                                            {attrs.vehicle_id || 'N/A'}
                                        </TableCell>
                                        <TableCell className="capitalize">
                                            {(attrs.service_type || 'Maintenance').replace(/_/g, ' ')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-700">
                                                    {attrs.last_scheduled_at ? format(new Date(attrs.last_scheduled_at), 'MMM dd, yyyy') :
                                                        attrs.last_service_date ? format(new Date(attrs.last_service_date), 'MMM dd, yyyy') : 'N/A'}
                                                </span>
                                                {(attrs.last_service_odometer || attrs.expected_odometer) && (
                                                    <span className="text-[10px] text-slate-400">
                                                        {(attrs.last_service_odometer || attrs.expected_odometer).toLocaleString()} km
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {attrs.due_date ? format(new Date(attrs.due_date), 'MMM dd, yyyy') :
                                                        attrs.next_service_date ? format(new Date(attrs.next_service_date), 'MMM dd, yyyy') : 'N/A'}
                                                </span>
                                                {attrs.next_service_odometer && (
                                                    <span className="text-[10px] text-slate-500">
                                                        {attrs.next_service_odometer.toLocaleString()} km
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`${getStatusColor(attrs.status)} border-transparent hover:bg-opacity-80`}>
                                                {attrs.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                                            {attrs.description || attrs.notes || '-'}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No maintenance schedules found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium text-slate-900">{data.length}</span> of <span className="font-medium text-slate-900">{pagination.total}</span> schedules
                    </p>
                    <Pagination className="mx-0 w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (pagination.current > 1) onPageChange?.(pagination.current - 1);
                                    }}
                                    className={pagination.current === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>

                            {Array.from({ length: Math.min(5, pagination.lastPage) }, (_, i) => {
                                let pageNum = i + 1;
                                if (pagination.lastPage > 5) {
                                    if (pagination.current > 3) {
                                        pageNum = pagination.current - 2 + i;
                                        if (pageNum > pagination.lastPage) pageNum = pagination.lastPage - 4 + i;
                                    }
                                }
                                if (pageNum <= 0 || pageNum > pagination.lastPage) return null;

                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href="#"
                                            isActive={pagination.current === pageNum}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onPageChange?.(pageNum);
                                            }}
                                            className="cursor-pointer"
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
                                        if (pagination.current < pagination.lastPage) onPageChange?.(pagination.current + 1);
                                    }}
                                    className={pagination.current === pagination.lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    )
}
