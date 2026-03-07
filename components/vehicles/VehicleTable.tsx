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
import { Badge } from '@/components/ui/badge'
import { Vehicle } from '@/types'
import { MoreHorizontal, Eye, Edit, Trash2, UserPlus, LayoutGrid, Cpu } from 'lucide-react'
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

import { PermissionGate } from '@/components/shared/PermissionGate'

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'

interface VehicleTableProps {
    data: Vehicle[]
    isLoading?: boolean
    onAssign?: (vehicle: Vehicle) => void
    onAssignCluster?: (vehicle: Vehicle) => void
    onAssignTracker?: (vehicle: Vehicle) => void
    onEdit?: (vehicle: Vehicle) => void
    pagination?: {
        current: number
        lastPage: number
        total: number
    }
    onPageChange?: (page: number) => void
}

export function VehicleTable({
    data,
    isLoading,
    onAssign,
    onAssignCluster,
    onAssignTracker,
    onEdit,
    pagination,
    onPageChange
}: VehicleTableProps) {
    const columns: ColumnDef<Vehicle>[] = React.useMemo(() => [
        {
            accessorKey: 'attributes.registration_number',
            header: 'Reg. No.',
            cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.attributes.registration_number}</span>,
        },
        {
            header: 'Make/Model',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-slate-900 capitalize">{row.original.attributes.make} {row.original.attributes.model}</span>
                    <span className="text-xs text-slate-500">{row.original.attributes.year}</span>
                </div>
            ),
        },
        {
            accessorKey: 'attributes.status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.attributes.status
                let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'

                switch (status) {
                    case 'active':
                        variant = 'default'
                        break
                    case 'in_transit':
                        variant = 'secondary'
                        break
                    case 'maintenance':
                        variant = 'secondary'
                        break
                    case 'inactive':
                        variant = 'outline'
                        break
                }

                return (
                    <Badge variant={variant} className="capitalize py-0.5">
                        {status.replace('_', ' ')}
                    </Badge>
                )
            },
        },
        {
            header: 'Body / Fuel',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">{row.original.attributes.body_type}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{row.original.attributes.fuel_type}</span>
                </div>
            ),
        },
        {
            header: 'Odometer',
            cell: ({ row }) => <span className="text-sm text-slate-600">{(row.original.attributes.total_odometer ?? 0).toLocaleString()} km</span>,
        },
        {
            header: 'Cluster',
            cell: ({ row }) => {
                const cluster = row.original.relationships?.cluster?.data
                return (
                    <span className="text-xs text-slate-500 font-medium">
                        {cluster?.name || 'Unassigned'}
                    </span>
                )
            },
        },
        {
            header: 'Tracker',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-xs text-slate-900 font-mono">
                        {row.original.attributes.tracker_id || 'No tracker'}
                    </span>
                    {row.original.attributes.device_id && (
                        <span className="text-[10px] text-slate-400">ID: {row.original.attributes.device_id}</span>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const vehicle = row.original

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
                                <Link href={`/vehicles/${vehicle.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                            </DropdownMenuItem>
                            <PermissionGate permission="vehicles:write">
                                <DropdownMenuItem onClick={() => onEdit?.(vehicle)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Vehicle
                                </DropdownMenuItem>
                            </PermissionGate>
                            <DropdownMenuSeparator />
                            <PermissionGate permission="vehicles:assign">
                                <DropdownMenuItem onClick={() => onAssign?.(vehicle)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Assign Driver
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAssignCluster?.(vehicle)}>
                                    <LayoutGrid className="mr-2 h-4 w-4" /> Assign Cluster
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAssignTracker?.(vehicle)}>
                                    <Cpu className="mr-2 h-4 w-4" /> Assign Tracker
                                </DropdownMenuItem>
                            </PermissionGate>
                            <DropdownMenuSeparator />
                            <PermissionGate permission="vehicles:delete">
                                <DropdownMenuItem className="text-rose-600 focus:text-rose-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </PermissionGate>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [onAssign, onAssignCluster, onAssignTracker, onEdit])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading vehicles...</div>
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className="hover:bg-slate-50/50"
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
                                    No vehicles found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium text-slate-900">{data.length}</span> of <span className="font-medium text-slate-900">{pagination.total}</span> vehicles
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

                            {/* Simple page numbers */}
                            {Array.from({ length: Math.min(5, pagination.lastPage) }, (_, i) => {
                                // Logic to show pages around current
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
        </div>
    )
}
