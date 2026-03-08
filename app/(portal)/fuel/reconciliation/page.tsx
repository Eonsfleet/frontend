'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Loader2, AlertTriangle, CheckCircle, PlayCircle,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { FuelReconciliationDiscrepancy } from '@/types'
import { extractApiError } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ── Standardized Table Pagination ───────────────────────────────────────────

interface TablePaginationProps {
    pagination?: {
        current_page: number
        last_page: number
        total: number
    }
    onPageChange: (page: number) => void
    variant?: 'default' | 'simple'
}

function TablePagination({ pagination, onPageChange, variant = 'default' }: TablePaginationProps) {
    if (!pagination || pagination.last_page <= 1) return null

    if (variant === 'simple') {
        return (
            <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500 font-medium">Page {pagination.current_page} of {pagination.last_page}</p>
                <div className="flex gap-2">
                    <Button
                        size="sm" variant="outline"
                        className="h-8 px-3 text-xs"
                        disabled={pagination.current_page <= 1}
                        onClick={() => onPageChange(pagination.current_page - 1)}
                    >
                        Previous
                    </Button>
                    <Button
                        size="sm" variant="outline"
                        className="h-8 px-3 text-xs"
                        disabled={pagination.current_page >= pagination.last_page}
                        onClick={() => onPageChange(pagination.current_page + 1)}
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
                Page {pagination.current_page} of {pagination.last_page} &nbsp;·&nbsp; {pagination.total} records
            </p>
            <div className="flex gap-2">
                <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider"
                    disabled={pagination.current_page <= 1}
                    onClick={() => onPageChange(pagination.current_page - 1)}
                >
                    Previous
                </Button>
                <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => onPageChange(pagination.current_page + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

// ── Dispute dialog ────────────────────────────────────────────────────────────

const disputeSchema = z.object({ reason: z.string().min(3, 'Provide a reason.') })

function DisputeDialog({ txnId, onClose }: { txnId: string | null; onClose: () => void }) {
    const queryClient = useQueryClient()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ reason: string }>({
        resolver: zodResolver(disputeSchema),
    })

    const { mutate, isPending } = useMutation({
        mutationFn: ({ reason }: { reason: string }) => api.disputeCardTransaction(txnId!, reason),
        onSuccess: () => {
            toast.success('Transaction disputed.')
            queryClient.invalidateQueries({ queryKey: ['reconciliation-report'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-discrepancies'] })
            reset()
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    return (
        <Dialog open={!!txnId} onOpenChange={() => { reset(); onClose() }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Dispute Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                    <div>
                        <Label>Reason for dispute</Label>
                        <textarea
                            {...register('reason')}
                            rows={3}
                            placeholder="e.g. Volume does not match station receipt."
                            className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                        />
                        {errors.reason && <p className="text-xs text-rose-500 mt-1">{errors.reason.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
                        <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Dispute
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FuelReconciliationPage() {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [disputeId, setDisputeId] = useState<string | null>(null)

    // Full reconciliation report for summary cards
    const { data: reportData, isLoading: isLoadingReport } = useQuery({
        queryKey: ['reconciliation-report', { startDate, endDate }],
        queryFn: () => api.getReconciliationReport({
            start_date: startDate || undefined,
            end_date: endDate || undefined,
        }),
    })

    // Discrepancies list for the table
    const { data: discData, isLoading: isLoadingDisc } = useQuery({
        queryKey: ['fuel-discrepancies', { page, startDate, endDate }],
        queryFn: () => api.getDiscrepancies({ page, per_page: 15, start_date: startDate || undefined, end_date: endDate || undefined }),
    })

    const { mutate: runEngine, isPending: isRunningEngine } = useMutation({
        mutationFn: () => api.runReconciliationEngine({
            start_date: startDate || undefined,
            end_date: endDate || undefined,
        }),
        onSuccess: (res) => {
            toast.success(`Reconciliation complete. ${res.data.matched_count} matched, ${res.data.unmatched_transactions_count} unmatched transactions.`)
            queryClient.invalidateQueries({ queryKey: ['reconciliation-report'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-discrepancies'] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const { mutate: resolveDisc } = useMutation({
        mutationFn: (id: string) => api.approveCardTransaction(id),
        onSuccess: () => {
            toast.success('Transaction approved.')
            queryClient.invalidateQueries({ queryKey: ['fuel-discrepancies'] })
            queryClient.invalidateQueries({ queryKey: ['reconciliation-report'] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const summary = reportData?.data?.summary
    const discrepancies: FuelReconciliationDiscrepancy[] = discData?.data?.discrepancies ?? []
    const pagination = discData?.data?.pagination

    const getDiscStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved': return <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Resolved</Badge>
            case 'disputed': return <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">Disputed</Badge>
            default: return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Needs Review</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reconciliation Engine</h1>
                    <p className="text-slate-500 mt-1">Match fuel card charges to expense records and flag discrepancies.</p>
                </div>
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    onClick={() => runEngine()}
                    disabled={isRunningEngine}
                >
                    {isRunningEngine
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                        : <><PlayCircle className="mr-2 h-4 w-4" /> Run Auto-match</>
                    }
                </Button>
            </div>

            {/* Date filters */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-sm font-medium text-slate-600">Period:</span>
                        <Input type="date" className="h-9 w-36 bg-slate-50 border-slate-200 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <span className="text-slate-400">→</span>
                        <Input type="date" className="h-9 w-36 bg-slate-50 border-slate-200 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        {(startDate || endDate) && (
                            <Button variant="ghost" size="sm" className="h-9 text-slate-500" onClick={() => { setStartDate(''); setEndDate('') }}>Clear</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Summary cards */}
            {isLoadingReport ? (
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="shadow-sm border-slate-200 animate-pulse">
                            <CardContent className="p-5 h-20" />
                        </Card>
                    ))}
                </div>
            ) : summary ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="shadow-sm border-emerald-200 bg-emerald-50/40">
                        <CardContent className="p-5">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Matched</p>
                            <p className="text-3xl font-bold text-emerald-700">{summary.matched_count}</p>
                            <p className="text-xs text-emerald-600 mt-1">transactions reconciled</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-amber-200 bg-amber-50/40">
                        <CardContent className="p-5">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Unmatched Transactions</p>
                            <p className="text-3xl font-bold text-amber-700">{summary.unmatched_transactions_count}</p>
                            <p className="text-xs text-amber-600 mt-1">card txns without expenses</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-rose-200 bg-rose-50/40">
                        <CardContent className="p-5">
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Variance Flagged</p>
                            <p className="text-3xl font-bold text-rose-700">{summary.variance_flagged_count}</p>
                            <p className="text-xs text-rose-600 mt-1">volume discrepancies detected</p>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Discrepancies table */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-900">Discrepancies Requiring Review</CardTitle>
                            <CardDescription className="mt-0.5">Transactions where billed volume significantly exceeds reported consumption.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingDisc ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                            <p>Loading discrepancies...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3.5">Date</th>
                                        <th className="px-6 py-3.5">Merchant</th>
                                        <th className="px-6 py-3.5 whitespace-nowrap">Vol (L)</th>
                                        <th className="px-6 py-3.5">Amount</th>
                                        <th className="px-6 py-3.5">Status</th>
                                        <th className="px-6 py-3.5 text-right">Resolution</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {discrepancies.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                                                    </div>
                                                    <p className="font-medium text-slate-900">Everything Reconciled</p>
                                                    <p className="text-sm mt-1">No discrepancies found for this period.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        discrepancies.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                                    {format(new Date(item.attributes.transaction_date), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{item.attributes.merchant_name}</div>
                                                    <div className="text-xs text-slate-400 capitalize">{item.attributes.provider}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-700">
                                                    {(item.attributes.volume_liters ?? 0).toFixed(2)} L
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                                    ₦{(item.attributes.amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getDiscStatusBadge(item.attributes.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.attributes.status === 'needs_review' && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                                                onClick={() => resolveDisc(item.id)}
                                                            >
                                                                Approve Match
                                                            </Button>
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                                                                onClick={() => setDisputeId(item.id)}
                                                            >
                                                                Dispute
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {item.attributes.status !== 'needs_review' && (
                                                        <span className="text-xs text-slate-400 italic px-2">Actioned</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <TablePagination pagination={pagination} onPageChange={setPage} />
                </CardContent>
            </Card>

            <DisputeDialog txnId={disputeId} onClose={() => setDisputeId(null)} />
        </div>
    )
}
