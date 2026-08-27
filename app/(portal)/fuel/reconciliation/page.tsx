'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    Ban,
    CheckCircle2,
    Eye,
    FileSearch,
    Loader2,
    RefreshCw,
    ShieldCheck,
    SlidersHorizontal,
    XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { QueryError } from '@/components/shared/QueryError'
import { FuelTabs } from '../components/FuelTabs'
import {
    acceptFuelReconciliation,
    approveReconciledFuelExpense,
    getFuelReconciliationDetail,
    getFuelReconciliationSummary,
    getFuelReconciliations,
    investigateFuelReconciliation,
    rejectFuelReconciliation,
    rejectReconciledFuelExpense,
    type FuelPagination,
    type FuelReconciliationListParams,
} from '@/lib/api/fuel'
import type { FuelReconciliationReviewItem, FuelReviewConfidence, FuelReviewStatus } from '@/types'
import { cn, extractApiError } from '@/lib/utils'

const PAGE_SIZE = 25

type ActionKind = 'accept' | 'reject' | 'investigate' | 'approve_expense' | 'reject_expense'

interface ReviewFilters {
    status: 'all' | FuelReviewStatus
    confidence: 'all' | FuelReviewConfidence
    reviewed: 'all' | 'yes' | 'no'
    from: string
    to: string
    sortBy: NonNullable<FuelReconciliationListParams['sort_by']>
    page: number
}

const initialFilters: ReviewFilters = {
    status: 'all',
    confidence: 'all',
    reviewed: 'no',
    from: '',
    to: '',
    sortBy: 'attention',
    page: 1,
}

const confidenceClass: Record<FuelReviewConfidence, string> = {
    high: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-orange-50 text-orange-700',
    none: 'bg-slate-100 text-slate-600',
}

const statusClass: Record<FuelReviewStatus, string> = {
    proposed: 'bg-blue-50 text-blue-700',
    confirmed: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
    unmatched: 'bg-slate-100 text-slate-600',
    superseded: 'bg-slate-100 text-slate-500',
}

function money(amount: number, currency = 'NGN') {
    return `${currency} ${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function dateLabel(value: unknown) {
    if (typeof value !== 'string' || !value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '-' : format(date, 'MMM d, yyyy h:mm a')
}

function textValue(value: unknown) {
    if (value == null || value === '') return '-'
    return String(value)
}

function paginationOf(pagination?: FuelPagination) {
    return {
        current: pagination?.current_page ?? pagination?.current ?? 1,
        lastPage: pagination?.last_page ?? pagination?.lastPage ?? 1,
        perPage: pagination?.per_page ?? pagination?.perPage ?? PAGE_SIZE,
        total: pagination?.total ?? 0,
    }
}

function asParams(filters: ReviewFilters): FuelReconciliationListParams {
    return {
        status: filters.status === 'all' ? undefined : [filters.status],
        confidence: filters.confidence === 'all' ? undefined : [filters.confidence],
        reviewed: filters.reviewed === 'all' ? undefined : filters.reviewed,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sort_by: filters.sortBy,
        page: filters.page,
        per_page: PAGE_SIZE,
    }
}

function SummaryCards({ from, to }: { from: string; to: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['fuel-reconciliation-summary', { from, to }],
        queryFn: () => getFuelReconciliationSummary({ from: from || undefined, to: to || undefined }),
    })
    const summary = data?.data
    const buckets = summary?.by_status ?? {}

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricCard title="Total spend" value={summary ? money(summary.total_spend, summary.currency) : '-'} loading={isLoading} />
            <MetricCard title="Verified" value={money(buckets.verified_by_device?.amount ?? 0, summary?.currency)} sub={`${buckets.verified_by_device?.transactions ?? 0} records`} loading={isLoading} tone="emerald" />
            <MetricCard title="Needs review" value={money(buckets.awaiting_review?.amount ?? 0, summary?.currency)} sub={`${buckets.awaiting_review?.transactions ?? 0} records`} loading={isLoading} tone="amber" />
            <MetricCard title="No support" value={money(buckets.no_supporting_refill?.amount ?? 0, summary?.currency)} sub={`${buckets.no_supporting_refill?.transactions ?? 0} records`} loading={isLoading} />
        </div>
    )
}

function MetricCard({ title, value, sub, loading, tone = 'slate' }: { title: string; value: string; sub?: string; loading?: boolean; tone?: 'slate' | 'emerald' | 'amber' }) {
    const toneClass = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900'
    return (
        <Card className="border-0 shadow-none">
            <CardContent className="p-4">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
                {loading ? <div className="h-7 w-28 animate-pulse rounded bg-slate-100" /> : <p className={cn('text-xl font-bold', toneClass)}>{value}</p>}
                {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
            </CardContent>
        </Card>
    )
}

function ActionDialog({
    action,
    item,
    isPending,
    onClose,
    onSubmit,
}: {
    action: ActionKind | null
    item: FuelReconciliationReviewItem | null
    isPending: boolean
    onClose: () => void
    onSubmit: (reason: string) => void
}) {
    const [reason, setReason] = useState('')
    const labels: Record<ActionKind, { title: string; button: string; description: string; optional?: boolean }> = {
        accept: { title: 'Confirm Match', button: 'Confirm match', description: 'Lock the proposed device refill as the match for this purchase.', optional: true },
        reject: { title: 'Reject Match', button: 'Reject match', description: 'Mark the proposed device refill as incorrect.' },
        investigate: { title: 'Request Investigation', button: 'Request investigation', description: 'Leave the expense pending while someone verifies the evidence.' },
        approve_expense: { title: 'Approve Expense', button: 'Approve expense', description: 'Approve the financial claim using the reconciliation evidence.' },
        reject_expense: { title: 'Reject Expense', button: 'Reject expense', description: 'Reject the financial claim and record the reason.' },
    }
    const meta = action ? labels[action] : null
    const reasonRequired = meta && !meta.optional

    return (
        <Dialog open={!!action && !!item} onOpenChange={(open) => { if (!open) { setReason(''); onClose() } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{meta?.title}</DialogTitle>
                    <DialogDescription>{meta?.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label>{reasonRequired ? 'Reason' : 'Note'}</Label>
                    <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setReason(''); onClose() }}>Cancel</Button>
                    <Button
                        type="button"
                        disabled={isPending || (reasonRequired ? reason.trim().length < 3 : false)}
                        onClick={() => onSubmit(reason.trim())}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {meta?.button}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function DetailSheet({ id, onClose }: { id: number | null; onClose: () => void }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['fuel-reconciliation-detail', id],
        queryFn: () => getFuelReconciliationDetail(id!),
        enabled: id != null,
    })
    const detail = data?.data.reconciliation
    const financial = detail?.financial_evidence ?? {}
    const device = detail?.device_evidence ?? null
    const reasoning = detail?.engine_reasoning ?? {}
    const vehicle = financial.vehicle as Record<string, unknown> | undefined
    const imported = financial.import as Record<string, unknown> | undefined

    return (
        <Sheet open={id != null} onOpenChange={(open) => { if (!open) onClose() }}>
            <SheetContent side="right" className="w-full overflow-y-auto border-0 p-0 shadow-none sm:max-w-xl">
                <SheetHeader className="px-5 pt-5 text-left">
                    <SheetTitle>Reconciliation Detail</SheetTitle>
                    <SheetDescription>Financial record, device evidence, scoring, and alternatives.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 px-5 pb-6 pt-4">
                    {isLoading && <div className="h-36 animate-pulse rounded-lg bg-slate-100" />}
                    {isError && <QueryError message="Failed to load reconciliation detail." />}
                    {detail && (
                        <>
                            <DetailBlock title="Financial Evidence" rows={[
                                ['Expense', textValue(financial.fuel_expense_id)],
                                ['Vehicle', textValue(vehicle?.registration_number)],
                                ['Purchased', `${textValue(financial.liters)} L · ${money(Number(financial.amount ?? 0), String(financial.currency ?? 'NGN'))}`],
                                ['Vendor', textValue(financial.vendor)],
                                ['Reference', textValue(financial.reference)],
                                ['Imported', dateLabel(imported?.imported_at)],
                            ]} />
                            <DetailBlock title="Device Evidence" rows={[
                                ['Transaction', textValue(device?.fuel_transaction_id)],
                                ['Detected', dateLabel(device?.detected_at)],
                                ['Liters', `${textValue(device?.detected_liters)} L`],
                                ['Sensor', device?.sensor_confidence != null ? `${Math.round(Number(device.sensor_confidence) * 100)}%` : '-'],
                            ]} />
                            <DetailBlock title="Engine Reasoning" rows={[
                                ['Confidence', textValue(reasoning.confidence_label ?? reasoning.confidence)],
                                ['Final score', textValue(reasoning.final_score)],
                                ['Candidates', textValue(reasoning.candidates_considered)],
                                ['Algorithm', textValue(reasoning.algorithm_version)],
                                ['Explanation', textValue(reasoning.explanation)],
                            ]} />
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

function DetailBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
    return (
        <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>
            <div className="space-y-2">
                {rows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                        <span className="text-slate-400">{label}</span>
                        <span className="min-w-0 whitespace-pre-wrap break-words font-medium text-slate-700">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
    return (
        <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</Label>
            <select className="mt-1.5 h-9 w-full rounded-md bg-slate-50 px-3 text-sm focus:outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
            </select>
        </div>
    )
}

export default function FuelReconciliationPage() {
    const queryClient = useQueryClient()
    const [filters, setFilters] = useState<ReviewFilters>(initialFilters)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [detailId, setDetailId] = useState<number | null>(null)
    const [action, setAction] = useState<{ kind: ActionKind; item: FuelReconciliationReviewItem } | null>(null)
    const params = useMemo(() => asParams(filters), [filters])

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['fuel-reconciliations', params],
        queryFn: () => getFuelReconciliations(params),
    })

    const rows = data?.data.reconciliations ?? []
    const pagination = paginationOf(data?.data.pagination)

    const actionMutation = useMutation({
        mutationFn: ({ kind, id, reason }: { kind: ActionKind; id: number; reason: string }) => {
            if (kind === 'accept') return acceptFuelReconciliation(id, reason || undefined)
            if (kind === 'reject') return rejectFuelReconciliation(id, reason)
            if (kind === 'investigate') return investigateFuelReconciliation(id, reason)
            if (kind === 'approve_expense') return approveReconciledFuelExpense(id, reason)
            return rejectReconciledFuelExpense(id, reason)
        },
        onSuccess: (response) => {
            toast.success(response.message)
            setAction(null)
            queryClient.invalidateQueries({ queryKey: ['fuel-reconciliations'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-reconciliation-summary'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
        },
        onError: (error) => toast.error(extractApiError(error)),
    })

    const updateFilters = (next: Partial<ReviewFilters>) => setFilters((current) => ({ ...current, ...next }))

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Reconciliation</h1>
                    <p className="mt-1 text-sm text-slate-500">Review V2 matching evidence separately from financial approval.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 border-0 bg-slate-100 shadow-none hover:bg-slate-200" onClick={() => setFiltersOpen(true)}>
                        <SlidersHorizontal className="h-4 w-4" /> Filters
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none" onClick={() => refetch()} disabled={isFetching}>
                        {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                    </Button>
                </div>
            </div>

            <FuelTabs active="Reconciliation" />
            <SummaryCards from={filters.from} to={filters.to} />

            {isError ? (
                <QueryError message="Failed to load reconciliation queue." onRetry={refetch} />
            ) : (
                <Card className="overflow-hidden border-0 shadow-none">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] text-left text-sm">
                                <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3.5">Expense</th>
                                        <th className="px-5 py-3.5">Vehicle</th>
                                        <th className="px-5 py-3.5">Evidence</th>
                                        <th className="px-5 py-3.5">Variance</th>
                                        <th className="px-5 py-3.5">Confidence</th>
                                        <th className="px-5 py-3.5">Decision</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 6 }).map((_, index) => (
                                            <tr key={index}>
                                                <td colSpan={7} className="px-5 py-3"><div className="h-14 animate-pulse rounded-lg bg-slate-50" /></td>
                                            </tr>
                                        ))
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center text-slate-400">No reconciliation records match the selected filters.</td>
                                        </tr>
                                    ) : rows.map((row) => {
                                        const attrs = row.attributes
                                        const vehicle = row.relationships.vehicle
                                        return (
                                            <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-slate-900">EXP-{row.fuel_expense_id}</div>
                                                    <div className="mt-1 text-xs text-slate-500">{money(attrs.amount, attrs.currency)}</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-bold uppercase text-slate-900">{vehicle?.registration_number ?? 'UNKNOWN'}</div>
                                                    <div className="text-xs text-slate-400">{vehicle?.model ?? 'No model'} · {row.relationships.driver?.name ?? 'No driver'}</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-medium text-slate-800">{attrs.imported_liters ?? '-'} L imported</div>
                                                    <div className="text-xs text-slate-500">{attrs.device_liters ?? '-'} L device · {attrs.time_difference_minutes ?? '-'} min</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-slate-800">{attrs.variance_percent != null ? `${Number(attrs.variance_percent).toFixed(2)}%` : '-'}</div>
                                                    <div className="text-xs text-slate-400">{attrs.liters_difference ?? '-'} L difference</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Badge className={cn('border-0', confidenceClass[attrs.confidence])}>{attrs.confidence_label}</Badge>
                                                    {attrs.would_auto_approve && <div className="mt-1 text-xs font-medium text-emerald-600">Eligible by evidence</div>}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Badge className={cn('border-0', statusClass[attrs.status])}>{attrs.status_label}</Badge>
                                                    <div className="mt-1 text-xs text-slate-400">{attrs.decided_by === 'person' ? 'Human locked' : 'System proposed'}</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="View evidence" title="View evidence" onClick={() => setDetailId(row.id)}><Eye className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" aria-label="Confirm match" title="Confirm match" onClick={() => setAction({ kind: 'accept', item: row })}><CheckCircle2 className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700" aria-label="Reject match" title="Reject match" onClick={() => setAction({ kind: 'reject', item: row })}><XCircle className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700" aria-label="Request investigation" title="Request investigation" onClick={() => setAction({ kind: 'investigate', item: row })}><FileSearch className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700" aria-label="Approve expense" title="Approve expense" onClick={() => setAction({ kind: 'approve_expense', item: row })}><ShieldCheck className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-rose-700" aria-label="Reject expense" title="Reject expense" onClick={() => setAction({ kind: 'reject_expense', item: row })}><Ban className="h-4 w-4" /></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50/70 px-5 py-3 text-sm text-slate-500">
                            <span>{pagination.total} records · page {pagination.current} of {pagination.lastPage}</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" disabled={pagination.current <= 1} onClick={() => updateFilters({ page: pagination.current - 1 })}>Previous</Button>
                                <Button size="sm" variant="outline" disabled={pagination.current >= pagination.lastPage} onClick={() => updateFilters({ page: pagination.current + 1 })}>Next</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetContent side="right" className="w-full border-0 p-0 shadow-none sm:max-w-md">
                    <SheetHeader className="px-5 pt-5 text-left">
                        <SheetTitle>Reconciliation Filters</SheetTitle>
                        <SheetDescription>Refine by evidence confidence, decision state, review state, and date.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-5 px-5 pb-5 pt-4">
                        <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilters({ status: value as ReviewFilters['status'], page: 1 })} options={[['all', 'All'], ['proposed', 'Proposed'], ['confirmed', 'Confirmed'], ['rejected', 'Rejected'], ['unmatched', 'Unmatched']]} />
                        <FilterSelect label="Confidence" value={filters.confidence} onChange={(value) => updateFilters({ confidence: value as ReviewFilters['confidence'], page: 1 })} options={[['all', 'All'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['none', 'None']]} />
                        <FilterSelect label="Reviewed" value={filters.reviewed} onChange={(value) => updateFilters({ reviewed: value as ReviewFilters['reviewed'], page: 1 })} options={[['all', 'All'], ['no', 'Awaiting review'], ['yes', 'Reviewed']]} />
                        <FilterSelect label="Sort" value={filters.sortBy} onChange={(value) => updateFilters({ sortBy: value as ReviewFilters['sortBy'], page: 1 })} options={[['attention', 'Attention'], ['exposure', 'Exposure'], ['variance', 'Variance'], ['oldest', 'Oldest'], ['confidence', 'Confidence']]} />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</Label>
                                <Input type="date" className="mt-1.5 h-9 border-0 bg-slate-50" value={filters.from} onChange={(event) => updateFilters({ from: event.target.value, page: 1 })} />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</Label>
                                <Input type="date" className="mt-1.5 h-9 border-0 bg-slate-50" value={filters.to} onChange={(event) => updateFilters({ to: event.target.value, page: 1 })} />
                            </div>
                        </div>
                        <Button type="button" variant="outline" className="h-9 w-full border-0 bg-slate-100 shadow-none" onClick={() => setFilters(initialFilters)}>Reset Filters</Button>
                    </div>
                </SheetContent>
            </Sheet>
            <DetailSheet id={detailId} onClose={() => setDetailId(null)} />
            <ActionDialog
                action={action?.kind ?? null}
                item={action?.item ?? null}
                isPending={actionMutation.isPending}
                onClose={() => setAction(null)}
                onSubmit={(reason) => {
                    if (action) actionMutation.mutate({ kind: action.kind, id: action.item.id, reason })
                }}
            />
        </div>
    )
}
