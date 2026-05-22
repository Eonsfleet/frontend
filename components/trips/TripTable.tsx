'use client'

import React from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Trip } from '@/types'
import { MoreHorizontal, Eye, Edit, MapPin, Route, XCircle, Loader2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { TripStatusBadge } from './TripStatusBadge'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTripStatus } from '@/lib/api/trips'
import { toast } from 'sonner'

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'

interface TripTableProps {
    data: Trip[]
    isLoading?: boolean
    pagination?: {
        current: number
        lastPage: number
        total: number
    }
    onPageChange?: (page: number) => void
    onEdit?: (trip: Trip) => void
    onChangeStatus?: (trip: Trip) => void
}

export function TripTable({
    data,
    isLoading,
    pagination,
    onPageChange,
    onEdit,
    onChangeStatus
}: TripTableProps) {
    const [cancelTarget, setCancelTarget] = React.useState<Trip | null>(null)
    const queryClient = useQueryClient()

    const { mutate: doCancel, isPending: isCancelling } = useMutation({
        mutationFn: (trip: Trip) => updateTripStatus(trip.id, 'cancelled'),
        onSuccess: () => {
            toast.success('Trip cancelled successfully.')
            queryClient.invalidateQueries({ queryKey: ['trips'] })
            setCancelTarget(null)
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to cancel trip.')
        },
    })
    const columns: ColumnDef<Trip>[] = React.useMemo(() => [
        {
            accessorKey: 'attributes.trip_number',
            header: 'Ref / ID',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {row.original.attributes.trip_number}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                        ID: {row.original.id}
                    </span>
                </div>
            ),
        },
        {
            header: 'Route',
            cell: ({ row }) => {
                const startLoc = row.original.attributes.start_location
                const endLoc = row.original.attributes.end_location
                const startName = typeof startLoc === 'string' ? startLoc : startLoc?.name || 'Unknown'
                const endName = typeof endLoc === 'string' ? endLoc : endLoc?.name || 'Unknown'

                return (
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-700 truncate">{startName}</span>
                        </div>
                        <div className="h-2 w-px bg-slate-200 ml-1.5" />
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="text-xs font-medium text-slate-700 truncate">{endName}</span>
                        </div>
                    </div>
                )
            },
        },
        {
            header: 'Vehicle / Driver',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 capitalize">
                        {row.original.attributes.vehicle_id ? `Vehicle: ${row.original.attributes.vehicle_id}` : 'No Vehicle'}
                    </span>
                    <span className="text-xs text-slate-500">
                        {row.original.attributes.driver_id ? `Driver: ${row.original.attributes.driver_id}` : 'No Driver'}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'attributes.status',
            header: 'Status',
            cell: ({ row }) => <TripStatusBadge status={row.original.attributes.status} />,
        },
        {
            header: 'Schedule',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">
                        {row.original.attributes.planned_start_time ? format(new Date(row.original.attributes.planned_start_time), 'MMM dd, HH:mm') : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-400 italic">
                        Start Time
                    </span>
                </div>
            ),
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const trip = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/trips/${trip.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(trip)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Trip
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onChangeStatus?.(trip)}>
                                <Route className="mr-2 h-4 w-4" /> Change Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                onClick={() => setCancelTarget(trip)}
                                disabled={trip.attributes.status === 'cancelled'}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel Trip
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading trips...</div>
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="hover:bg-slate-50/50 group"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No trips found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium text-slate-900">{data.length}</span> of <span className="font-medium text-slate-900">{pagination.total}</span> trips
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
                                if (pageNum <= 0) return null;
                                if (pageNum > pagination.lastPage) return null;

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

            {/* Cancel confirmation */}
            {cancelTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Cancel Trip</h3>
                            <p className="text-sm text-slate-500">
                                Are you sure you want to cancel trip{' '}
                                <span className="font-semibold text-slate-700">
                                    {cancelTarget.attributes.trip_number}
                                </span>
                                ? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setCancelTarget(null)}
                                disabled={isCancelling}
                            >
                                No, Keep It
                            </Button>
                            <Button
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                                onClick={() => doCancel(cancelTarget)}
                                disabled={isCancelling}
                            >
                                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Cancel'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
