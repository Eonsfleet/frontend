'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Loader2, Plus, Download, Search, AlertCircle, CheckCircle2, XCircle,
    CreditCard, Clock,
} from 'lucide-react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { getVehicles } from '@/lib/api/vehicles'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { FuelExpense } from '@/types'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { extractApiError } from '@/lib/utils'
import { QueryError } from '@/components/shared/QueryError'
import { useAuthStore } from '@/store/authStore'
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_DROPDOWN } from '@/lib/config'

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'approved':
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
        case 'rejected':
            return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>
        case 'reimbursed':
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none gap-1"><CreditCard className="w-3 h-3" /> Reimbursed</Badge>
        default:
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><AlertCircle className="w-3 h-3" /> Pending</Badge>
    }
}

// ── Standardized Table Pagination ───────────────────────────────────────────

interface TablePaginationProps {
    pagination?: {
        current: number
        lastPage: number
        total: number
    }
    onPageChange: (page: number) => void
    variant?: 'default' | 'simple'
}

function TablePagination({ pagination, onPageChange, variant = 'default' }: TablePaginationProps) {
    if (!pagination || pagination.lastPage <= 1) return null

    if (variant === 'simple') {
        return (
            <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500 font-medium">Page {pagination.current} of {pagination.lastPage}</p>
                <div className="flex gap-2">
                    <Button
                        size="sm" variant="outline"
                        className="h-8 px-3 text-xs"
                        disabled={pagination.current <= 1}
                        onClick={() => onPageChange(pagination.current - 1)}
                    >
                        Previous
                    </Button>
                    <Button
                        size="sm" variant="outline"
                        className="h-8 px-3 text-xs"
                        disabled={pagination.current >= pagination.lastPage}
                        onClick={() => onPageChange(pagination.current + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                Page {pagination.current} of {pagination.lastPage} &nbsp;·&nbsp; {pagination.total} records
            </p>
            <div className="flex gap-2">
                <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider"
                    disabled={pagination.current <= 1}
                    onClick={() => onPageChange(pagination.current - 1)}
                >
                    Previous
                </Button>
                <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider"
                    disabled={pagination.current >= pagination.lastPage}
                    onClick={() => onPageChange(pagination.current + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

// ── Reject reason dialog ─────────────────────────────────────────────────────

const rejectSchema = z.object({ reason: z.string().min(3, 'Please provide a reason.') })

function RejectDialog({ expenseId, onClose }: { expenseId: string | number | null; onClose: () => void }) {
    const queryClient = useQueryClient()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ reason: string }>({
        resolver: zodResolver(rejectSchema),
    })

    const { mutate, isPending } = useMutation({
        mutationFn: ({ reason }: { reason: string }) => api.rejectFuelExpense(expenseId!, reason),
        onSuccess: () => {
            toast.success('Expense rejected.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expense-metrics'] })
            reset()
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    return (
        <Dialog open={!!expenseId} onOpenChange={() => { reset(); onClose() }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                    <div>
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <textarea
                            id="reason"
                            {...register('reason')}
                            rows={3}
                            placeholder="e.g. Receipt not attached."
                            className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                        />
                        {errors.reason && <p className="text-xs text-rose-500 mt-1">{errors.reason.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reject
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Log Expense dialog ───────────────────────────────────────────────────────

const logSchema = z.object({
    vehicle_id: z.string().min(1, 'Vehicle is required'),
    cost_per_volume: z.coerce.number().positive('Enter cost per litre'),
    volume: z.coerce.number().positive('Enter volume'),
    entry_date: z.string().min(1, 'Date is required'),
    purchase_from: z.string().optional(),
    reference_number: z.string().optional(),
})
type LogForm = z.infer<typeof logSchema>

function LogExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<LogForm>({
        resolver: zodResolver(logSchema) as Resolver<LogForm>,
        defaultValues: { entry_date: format(new Date(), 'yyyy-MM-dd') },
    })

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles', 1, ''],
        queryFn: () => getVehicles({ per_page: PAGE_SIZE_DROPDOWN }),
        enabled: open,
    })

    const { mutate, isPending } = useMutation({
        mutationFn: (d: LogForm) => api.createFuelExpense({
            vehicle_id: Number(d.vehicle_id),
            user_id: Number(user?.id),
            cost_per_volume: d.cost_per_volume,
            volume: d.volume,
            entry_date: d.entry_date,
            purchase_from: d.purchase_from,
            reference_number: d.reference_number,
            status: 'pending_approval',
        }),
        onSuccess: () => {
            toast.success('Expense logged successfully.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expense-metrics'] })
            reset()
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    return (
        <Dialog open={open} onOpenChange={() => { reset(); onClose() }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Log Fuel Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Vehicle</Label>
                            <select
                                {...register('vehicle_id')}
                                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Select vehicle...</option>
                                {vehiclesData?.data?.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.attributes.registration_number} — {v.attributes.make} {v.attributes.model}
                                    </option>
                                ))}
                            </select>
                            {errors.vehicle_id && <p className="text-xs text-rose-500 mt-1">{errors.vehicle_id.message}</p>}
                        </div>
                        <div>
                            <Label>Volume (L)</Label>
                            <Input {...register('volume')} type="number" step="0.1" placeholder="e.g. 35.0" className="mt-1.5" />
                            {errors.volume && <p className="text-xs text-rose-500 mt-1">{errors.volume.message}</p>}
                        </div>
                        <div>
                            <Label>Cost per Litre (₦)</Label>
                            <Input {...register('cost_per_volume')} type="number" step="0.01" placeholder="e.g. 765.00" className="mt-1.5" />
                            {errors.cost_per_volume && <p className="text-xs text-rose-500 mt-1">{errors.cost_per_volume.message}</p>}
                        </div>
                        <div>
                            <Label>Date</Label>
                            <Input {...register('entry_date')} type="date" className="mt-1.5" />
                            {errors.entry_date && <p className="text-xs text-rose-500 mt-1">{errors.entry_date.message}</p>}
                        </div>
                        <div>
                            <Label>Reference No. <span className="text-slate-400">(optional)</span></Label>
                            <Input {...register('reference_number')} placeholder="REF-00001" className="mt-1.5" />
                        </div>
                        <div className="col-span-2">
                            <Label>Purchase From <span className="text-slate-400">(optional)</span></Label>
                            <Input {...register('purchase_from')} placeholder="e.g. Total Energy Station VI" className="mt-1.5" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Log Expense
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function FuelExpensesPage() {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [rejectId, setRejectId] = useState<string | number | null>(null)
    const [logOpen, setLogOpen] = useState(false)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['fuel-expenses', { page, search, statusFilter, startDate, endDate }],
        queryFn: () => api.getFuelExpenses({
            page,
            per_page: PAGE_SIZE_DEFAULT,
            q: search || undefined,
            status: statusFilter || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
        }),
    })

    const { data: metricsData } = useQuery({
        queryKey: ['fuel-expense-metrics'],
        queryFn: () => api.getFuelExpenseMetrics(),
    })

    const { mutate: handleApprove, isPending: isApproving } = useMutation({
        mutationFn: (id: string | number) => api.approveFuelExpense(id),
        onSuccess: () => {
            toast.success('Expense approved.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expense-metrics'] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const handleExport = async () => {
        try {
            const blob = await api.exportFuelExpenses({
                q: search || undefined,
                status: statusFilter || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `fuel-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast.error('Export failed.')
        }
    }

    const m = metricsData?.data
    const expenses: FuelExpense[] = data?.data?.fuel_expenses ?? []
    const paginationData = data?.data?.pagination as
        | { current?: number; current_page?: number; lastPage?: number; last_page?: number; total?: number }
        | undefined
    
    // Map API pagination to component expectations (API uses camelCase, type uses snake_case)
    const pagination = paginationData ? {
        current: paginationData.current ?? paginationData.current_page ?? 1,
        lastPage: paginationData.lastPage ?? paginationData.last_page ?? 1,
        total: paginationData.total ?? 0
    } : undefined

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Ledger</h1>
                    <p className="text-slate-500 mt-1">Log, review, and approve manual fuel purchase records.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} className="shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={() => setLogOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Log Expense
                    </Button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Volume</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {m?.total_volume != null ? Number(m.total_volume).toFixed(1) : '—'} <span className="text-sm font-medium text-slate-500">L</span>
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Cost</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {m ? `₦${m.total_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Cost / L</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {m?.average_cost_per_liter != null ? `₦${Number(m.average_cost_per_liter).toFixed(2)}` : '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Approval</p>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-amber-600">{m?.pending_count ?? m?.pending_approval_count ?? '—'}</p>
                            {m && (m.pending_count ?? m.pending_approval_count ?? 0) > 0 && <Clock className="h-4 w-4 text-amber-500 mb-1" />}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search vehicle, driver, reference..."
                                className="pl-9 bg-slate-50 border-slate-200 h-9"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            />
                        </div>
                        <div className="w-40">
                            <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 block">Status</Label>
                            <select
                                className="w-full h-9 bg-slate-50 border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending_approval">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="reimbursed">Reimbursed</option>
                            </select>
                        </div>
                        <div className="w-40">
                            <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 block">From</Label>
                            <Input type="date" className="h-9 bg-slate-50 border-slate-200 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="w-40">
                            <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 block">To</Label>
                            <Input type="date" className="h-9 bg-slate-50 border-slate-200 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        {(search || statusFilter || startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-slate-500 hover:text-slate-900"
                                onClick={() => { setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1) }}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Reference No</th>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Vol (L)</th>
                                    <th className="px-6 py-4">Cost (₦)</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                                            <td className="px-6 py-4">
                                                <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                                                <div className="h-3 w-24 bg-slate-100 rounded" />
                                            </td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                                            <td className="px-6 py-4">
                                                <div className="h-5 w-24 bg-slate-200 rounded mb-1" />
                                                <div className="h-3 w-16 bg-slate-100 rounded" />
                                            </td>
                                            <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-200 rounded-full" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-8 w-20 bg-slate-200 rounded ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-6">
                                            <QueryError message="Failed to load fuel expenses." onRetry={refetch} />
                                        </td>
                                    </tr>
                                ) : expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                            No fuel expenses found.
                                        </td>
                                    </tr>
                                ) : (
                                    expenses.map(exp => (
                                        <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{exp?.attributes?.reference_number ?? '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{exp.relationships.vehicle?.registration_number ?? 'Unknown'}</div>
                                                <div className="text-[11px] text-slate-400 font-medium">by {exp.relationships.driver?.name ?? 'Unknown'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {format(new Date(exp.attributes.entry_date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium text-slate-700">
                                                {(exp.attributes.volume ?? 0).toFixed(1)} L
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-slate-900 text-base">₦{(exp.attributes.amount ?? 0).toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                    {exp.attributes.amount && exp.attributes.volume 
                                                        ? `₦${(exp.attributes.amount / exp.attributes.volume).toFixed(2)}/L`
                                                        : '-'
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={exp.attributes.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {exp.attributes.status === 'pending_approval' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                            onClick={() => handleApprove(exp.id)}
                                                            disabled={isApproving}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50"
                                                            onClick={() => setRejectId(exp.id)}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-8 text-slate-400" disabled>
                                                        Finalized
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <TablePagination pagination={pagination} onPageChange={setPage} />
                </CardContent>
            </Card>

            <LogExpenseDialog open={logOpen} onClose={() => setLogOpen(false)} />
            <RejectDialog expenseId={rejectId} onClose={() => setRejectId(null)} />
        </div>
    )
}
