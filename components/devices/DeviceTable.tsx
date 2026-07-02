'use client'

import React from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'

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
import { cn } from '@/lib/utils'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import { Cpu, Truck } from 'lucide-react'

/**
 * The `/devices` REST endpoint's exact payload shape isn't formalized in `types/vehicle.ts`
 * (that `Device` interface only covers `{id, serial_number, imei?, status}`). Other consumers
 * of `getDevices()` (e.g. `AssignTrackerDialog.tsx`) treat entries defensively as either
 * JSON:API-wrapped (`{id, attributes: {...}}`) or flat objects — we do the same here rather
 * than assume a shape the backend hasn't committed to.
 */
export interface NormalizedDevice {
    id: string
    /** The identifier used elsewhere in the app (e.g. `vehicle.attributes.device_id`) to link a device to a vehicle */
    identifier: string
    imei: string | null
    status: string
    lastPacketAt: string | null
    phone: string | null
}

interface RawDeviceFields {
    device_id?: string
    serial_number?: string
    imei?: string
    status?: string
    last_packet_received_at?: string | null
    updated_at?: string | null
    phone_number?: string | null
    phone?: string | null
}

/** Defensive shape covering both JSON:API-wrapped and flat `/devices` responses. */
export interface RawDevice extends RawDeviceFields {
    id?: string | number
    attributes?: RawDeviceFields
}

export function normalizeDevice(raw: RawDevice): NormalizedDevice {
    const attrs = raw?.attributes ?? {}
    const identifier =
        attrs.device_id ?? raw?.device_id ?? attrs.serial_number ?? raw?.serial_number ?? String(raw?.id ?? '')
    const status = (attrs.status ?? raw?.status ?? 'unknown').toString().toLowerCase()
    const lastPacketAt =
        attrs.last_packet_received_at ??
        raw?.last_packet_received_at ??
        attrs.updated_at ??
        raw?.updated_at ??
        null

    return {
        id: String(raw?.id ?? identifier),
        identifier: String(identifier),
        imei: attrs.imei ?? raw?.imei ?? null,
        status,
        lastPacketAt,
        phone: attrs.phone_number ?? attrs.phone ?? raw?.phone_number ?? raw?.phone ?? null,
    }
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    offline: { label: 'Offline', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

interface DeviceTableProps {
    data: RawDevice[]
    isLoading?: boolean
    vehicleByDevice: Map<string, Vehicle>
    pagination?: {
        current: number
        lastPage: number
        total: number
    }
    onPageChange?: (page: number) => void
}

export function DeviceTable({ data, isLoading, vehicleByDevice, pagination, onPageChange }: DeviceTableProps) {
    const devices = React.useMemo(() => data.map(normalizeDevice), [data])

    const columns: ColumnDef<NormalizedDevice>[] = React.useMemo(() => [
        {
            id: 'device',
            header: 'Device',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Cpu className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-900 font-mono text-sm">{row.original.identifier || '—'}</span>
                        <span className="text-xs text-slate-500">
                            IMEI: {row.original.imei || '—'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const config = STATUS_STYLES[row.original.status] ?? {
                    label: row.original.status.replace(/_/g, ' '),
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
            id: 'last_packet',
            header: 'Last Heartbeat',
            cell: ({ row }) => {
                const ts = row.original.lastPacketAt
                if (!ts) return <span className="text-xs text-slate-400">—</span>
                const date = new Date(ts)
                if (Number.isNaN(date.getTime())) return <span className="text-xs text-slate-400">—</span>
                return (
                    <span className="text-xs text-slate-600" title={date.toLocaleString()}>
                        {formatDistanceToNow(date, { addSuffix: true })}
                    </span>
                )
            },
        },
        {
            id: 'assigned_vehicle',
            header: 'Assigned Vehicle',
            cell: ({ row }) => {
                const vehicle = vehicleByDevice.get(row.original.identifier)
                if (!vehicle) {
                    return <span className="text-xs text-slate-400 italic">Unassigned</span>
                }
                return (
                    <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-900">{vehicle.attributes.registration_number}</span>
                    </div>
                )
            },
        },
    ], [vehicleByDevice])

    const table = useReactTable({
        data: devices,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-slate-100 bg-white">
                <div className="p-8 text-center text-slate-500 text-sm">Loading devices...</div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
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
                                    No devices found.
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
                        <span className="font-medium text-slate-900">{pagination.total}</span> devices
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
