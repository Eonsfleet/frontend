'use client'

import React from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    VisibilityState,
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
import { MoreHorizontal, Eye, Edit, Trash2, UserPlus, LayoutGrid, Cpu, Fuel, Columns3, Check } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PermissionGate } from '@/components/shared/PermissionGate'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
    active:             { label: 'Active',            className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    in_transit:         { label: 'In Transit',        className: 'bg-blue-50 text-blue-700 border-blue-200' },
    under_maintenance:  { label: 'Maintenance',       className: 'bg-amber-50 text-amber-700 border-amber-200' },
    maintenance:        { label: 'Maintenance',       className: 'bg-amber-50 text-amber-700 border-amber-200' },
    inactive:           { label: 'Inactive',          className: 'bg-slate-100 text-slate-500 border-slate-200' },
    disbursed:          { label: 'Disbursed',         className: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const DEVICE_STATUS_STYLES: Record<string, { dot: string; label: string }> = {
    online:  { dot: 'bg-emerald-500', label: 'Online' },
    offline: { dot: 'bg-rose-500',    label: 'Offline' },
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
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

    const columns: ColumnDef<Vehicle>[] = React.useMemo(() => [
        {
            id: 'registration',
            accessorKey: 'attributes.registration_number',
            header: 'Reg. No.',
            cell: ({ row }) => (
                <span className="font-medium text-slate-900">
                    {row.original.attributes.registration_number}
                </span>
            ),
        },
        {
            id: 'make_model',
            header: 'Make / Model',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-slate-900 capitalize">
                        {row.original.attributes.make} {row.original.attributes.model}
                    </span>
                    <span className="text-xs text-slate-500">{row.original.attributes.year}</span>
                </div>
            ),
        },
        {
            id: 'status',
            accessorKey: 'attributes.status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.attributes.status ?? ''
                const config = STATUS_STYLES[status] ?? {
                    label: status.replace(/_/g, ' '),
                    className: 'bg-slate-100 text-slate-600 border-slate-200',
                }
                return (
                    <Badge variant="outline" className={cn('capitalize text-[11px] font-semibold', config.className)}>
                        {config.label}
                    </Badge>
                )
            },
        },
        {
            id: 'body_fuel',
            header: 'Body / Fuel',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">{row.original.attributes.body_type}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 uppercase">{row.original.attributes.fuel_type}</span>
                        {(row.original.attributes as any).fuel_sensor_conversion_factor > 0 && (
                            <div className="h-3.5 w-3.5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100" title="Fuel Monitoring Supported">
                                <Fuel className="h-2 w-2 text-emerald-600" />
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'odometer',
            header: 'Odometer',
            cell: ({ row }) => {
                const loc = (row.original.relationships as any)?.current_location?.attributes
                const value = loc?.odometer ?? loc?.total_odometer ?? row.original.attributes.total_odometer
                return (
                    <div className="flex flex-col">
                        <span className="text-sm text-slate-700 font-medium">
                            {value != null ? `${Number(value).toLocaleString()} km` : '—'}
                        </span>
                        {loc?.odometer_source && (
                            <span className="text-[10px] text-slate-400 uppercase">{loc.odometer_source}</span>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'tracker',
            header: 'Tracker / Device',
            cell: ({ row }) => {
                const deviceId = row.original.attributes.device_id
                const device = (row.original.relationships as any)?.device
                const deviceStatus = (device?.status ?? row.original.attributes.deviceStatus ?? '').toLowerCase()
                const statusConfig = DEVICE_STATUS_STYLES[deviceStatus]

                if (!deviceId) {
                    return <span className="text-xs text-slate-400 italic">No device</span>
                }

                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-900 font-mono">{deviceId}</span>
                        {statusConfig ? (
                            <div className="flex items-center gap-1">
                                <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
                                <span className="text-[10px] text-slate-500">{statusConfig.label}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">Unknown</span>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
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
        state: { columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
    })

    const hiddenCount = Object.values(columnVisibility).filter(v => v === false).length

    if (isLoading) {
        return (
            <div className="rounded-md border border-slate-200 bg-white">
                <div className="p-8 text-center text-slate-500 text-sm">Loading vehicles...</div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-xs text-slate-500">
                        {pagination?.total ?? data.length} vehicles
                    </p>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                <Columns3 className="h-3.5 w-3.5" />
                                Columns
                                {hiddenCount > 0 && (
                                    <span className="ml-1 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                                        {hiddenCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs text-slate-500 font-medium">Toggle columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table
                                .getAllColumns()
                                .filter(col => col.getCanHide())
                                .map(col => (
                                    <DropdownMenuCheckboxItem
                                        key={col.id}
                                        className="capitalize text-sm"
                                        checked={col.getIsVisible()}
                                        onCheckedChange={val => col.toggleVisibility(val)}
                                    >
                                        {typeof col.columnDef.header === 'string'
                                            ? col.columnDef.header
                                            : col.id.replace(/_/g, ' ')}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Table>
                    <TableHeader className="bg-slate-50">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className="hover:bg-slate-50/50">
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-slate-400">
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
                        Showing <span className="font-medium text-slate-900">{data.length}</span> of{' '}
                        <span className="font-medium text-slate-900">{pagination.total}</span> vehicles
                    </p>
                    <Pagination className="mx-0 w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={e => { e.preventDefault(); if (pagination.current > 1) onPageChange?.(pagination.current - 1) }}
                                    className={pagination.current === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            {Array.from({ length: Math.min(5, pagination.lastPage) }, (_, i) => {
                                let pageNum = i + 1
                                if (pagination.lastPage > 5 && pagination.current > 3) {
                                    pageNum = pagination.current - 2 + i
                                    if (pageNum > pagination.lastPage) pageNum = pagination.lastPage - 4 + i
                                }
                                if (pageNum <= 0 || pageNum > pagination.lastPage) return null
                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href="#"
                                            isActive={pagination.current === pageNum}
                                            onClick={e => { e.preventDefault(); onPageChange?.(pageNum) }}
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
                                    onClick={e => { e.preventDefault(); if (pagination.current < pagination.lastPage) onPageChange?.(pagination.current + 1) }}
                                    className={pagination.current === pagination.lastPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    )
}
