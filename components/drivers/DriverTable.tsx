'use client'

import React, { useState } from 'react'
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
import { UserProfile } from '@/types'
import { MoreHorizontal, Eye, Mail, Trash2, Truck, Loader2 } from 'lucide-react'
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
import { PermissionGate } from '@/components/shared/PermissionGate'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateDriver } from '@/lib/api/drivers'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/utils'

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'

import { useQuery } from '@tanstack/react-query'
import { getDrivers, getDriverCurrentVehicle } from '@/lib/api/drivers'

interface DriverTableProps {
    data: UserProfile[]
    isLoading?: boolean
    onAssignVehicle?: (driver: UserProfile) => void
    pagination?: {
        current: number
        lastPage: number
        total: number
    }
    onPageChange?: (page: number) => void
}


function DriverVehicleCell({ driverId }: { driverId: string | number }) {
    const { data: response, isLoading } = useQuery({
        queryKey: ['driver-vehicle', driverId],
        queryFn: () => getDriverCurrentVehicle(driverId),
        staleTime: 5 * 60 * 1000,
    })

    if (isLoading) {
        return <div className="h-4 w-20 bg-slate-100 animate-pulse rounded" />
    }

    const vehicle = response?.data?.attributes

    return (
        <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-900">
                {vehicle?.registration_number || 'No vehicle'}
            </span>
        </div>
    )
}

export function DriverTable({
    data,
    isLoading,
    onAssignVehicle,
    pagination,
    onPageChange
}: DriverTableProps) {
    const queryClient = useQueryClient()
    const [driverToDeactivate, setDriverToDeactivate] = useState<UserProfile | null>(null)

    const { mutate: deactivateDriver, isPending: isDeactivating } = useMutation({
        mutationFn: (driverId: string | number) => updateDriver(driverId, { status: 'inactive' }),
        onSuccess: () => {
            toast.success('Driver deactivated successfully')
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
            setDriverToDeactivate(null)
        },
        onError: (error: any) => {
            toast.error(extractApiError(error, 'Failed to deactivate driver'))
        }
    })

    const handleDeactivate = (driverId: string | number) => {
        deactivateDriver(driverId)
    }
    const columns = React.useMemo<ColumnDef<UserProfile>[]>(() => [
        {
            header: 'Name',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-600">
                        {row.original.attributes.first_name[0]}{row.original.attributes.last_name[0]}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{row.original.attributes.full_name}</span>
                        <span className="text-xs text-slate-500">ID: {row.original.attributes.employee_id ||row.original.id || 'N/A'}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Email',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="text-sm">{row.original.attributes.email}</span>
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
                    case 'suspended':
                    case 'inactive':
                        variant = 'destructive'
                        break
                }

                return (
                    <Badge variant={variant} className="capitalize">
                        {status}
                    </Badge>
                )
            },
        },
        {
            header: 'Assigned Vehicle',
            cell: ({ row }) => <DriverVehicleCell driverId={row.original.id} />,
        },
        {
            header: 'Last Login',
            cell: ({ row }) => (
                <span className="text-xs text-slate-500">
                    {row.original.attributes.last_login
                        ? format(new Date(row.original.attributes.last_login), 'MMM d, h:mm a')
                        : 'Never'}
                </span>
            ),
        },

        {
            id: 'actions',
            cell: ({ row }) => {
                const driver = row.original

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
                                <Link href={`/drivers/${driver.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> View Profile
                                </Link>
                            </DropdownMenuItem>
                            <PermissionGate permission="drivers:write">
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onAssignVehicle?.(driver)}>
                                    <Truck className="mr-2 h-4 w-4" /> Assign Vehicle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setDriverToDeactivate(driver)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                                </DropdownMenuItem>
                            </PermissionGate>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [onAssignVehicle])
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading drivers...</div>
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-200">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-slate-600 font-semibold h-11">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500 italic">
                                    No drivers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium text-slate-900">{data.length}</span> of <span className="font-medium text-slate-900">{pagination.total}</span> drivers
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

            {/* Deactivate confirmation dialog */}
            {driverToDeactivate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Deactivate Driver</h3>
                            <p className="text-sm text-slate-500">
                                Are you sure you want to deactivate{' '}
                                <span className="font-semibold text-slate-700">
                                    {driverToDeactivate.attributes.full_name}
                                </span>
                                ? This driver will no longer be able to access the system.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setDriverToDeactivate(null)}
                                disabled={isDeactivating}
                            >
                                No, Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                                onClick={() => handleDeactivate(driverToDeactivate.id)}
                                disabled={isDeactivating}
                            >
                                {isDeactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Deactivate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
