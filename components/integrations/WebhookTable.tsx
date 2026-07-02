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
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, extractApiError } from '@/lib/utils'
import { deleteWebhook, testWebhook, WebhookEndpoint } from '@/lib/api/webhooks'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MoreHorizontal, Edit, Trash2, Zap, Loader2, Link2 } from 'lucide-react'

interface WebhookTableProps {
    data: WebhookEndpoint[]
    onEdit: (webhook: WebhookEndpoint) => void
}

export function WebhookTable({ data, onEdit }: WebhookTableProps) {
    const queryClient = useQueryClient()
    const [deleteTarget, setDeleteTarget] = React.useState<WebhookEndpoint | null>(null)
    const [testingId, setTestingId] = React.useState<string | null>(null)

    const { mutate: handleDelete, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => deleteWebhook(id),
        onSuccess: () => {
            toast.success('Webhook deleted successfully.')
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            setDeleteTarget(null)
        },
        onError: (error: unknown) => {
            toast.error(extractApiError(error, 'Failed to delete webhook.'))
        },
    })

    const { mutate: handleTest } = useMutation({
        mutationFn: (id: string) => testWebhook(id),
        onMutate: (id) => setTestingId(id),
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Test delivery succeeded (status ${res.status}).`)
            } else {
                toast.error(`Test delivery failed (status ${res.status}).`)
            }
        },
        onError: (error: unknown) => {
            toast.error(extractApiError(error, 'Failed to send test delivery.'))
        },
        onSettled: () => setTestingId(null),
    })

    const columns: ColumnDef<WebhookEndpoint>[] = React.useMemo(() => [
        {
            id: 'endpoint',
            header: 'Endpoint',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Link2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-slate-900">{row.original.name}</span>
                        <span className="text-xs text-slate-500 font-mono truncate max-w-xs">{row.original.url}</span>
                    </div>
                </div>
            ),
        },
        {
            id: 'events',
            header: 'Events',
            cell: ({ row }) => {
                const events = row.original.events ?? []
                if (events.length === 0) return <span className="text-xs text-slate-400 italic">None</span>
                const visible = events.slice(0, 2)
                const remaining = events.length - visible.length
                return (
                    <div className="flex flex-wrap items-center gap-1">
                        {visible.map(evt => (
                            <Badge key={evt} variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-600 border-slate-200">
                                {evt}
                            </Badge>
                        ))}
                        {remaining > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">
                                +{remaining} more
                            </Badge>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className={cn(
                        'text-[11px] font-semibold',
                        row.original.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}
                >
                    {row.original.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            id: 'last_delivery',
            header: 'Last Delivery',
            cell: ({ row }) => {
                const ts = row.original.last_delivery_at
                if (!ts) return <span className="text-xs text-slate-400">Never</span>
                const date = new Date(ts)
                if (Number.isNaN(date.getTime())) return <span className="text-xs text-slate-400">Never</span>
                return (
                    <span className="text-xs text-slate-600" title={date.toLocaleString()}>
                        {formatDistanceToNow(date, { addSuffix: true })}
                    </span>
                )
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const webhook = row.original
                const isTesting = testingId === webhook.id
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
                            <DropdownMenuItem onClick={() => onEdit(webhook)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTest(webhook.id)} disabled={isTesting}>
                                {isTesting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap className="mr-2 h-4 w-4" />
                                )}
                                Send Test
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                onClick={() => setDeleteTarget(webhook)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [onEdit, handleTest, testingId])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

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
                                    No webhooks found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Delete Webhook</h3>
                            <p className="text-sm text-slate-500">
                                Are you sure you want to delete{' '}
                                <span className="font-semibold text-slate-700">{deleteTarget.name}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                            >
                                No, Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                                onClick={() => handleDelete(deleteTarget.id)}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
