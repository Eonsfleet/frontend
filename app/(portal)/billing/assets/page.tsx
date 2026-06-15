'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Car, Cpu, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2, ChevronLeft, ChevronRight, TrendingUp, Ban, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import * as api from '@/lib/api/billing'
import type { AssetSubscription, AssetSubscriptionStatus } from '@/lib/api/billing'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AssetSubscriptionStatus, { label: string; className: string; icon: React.ElementType }> = {
    trialing:  { label: 'Trial',    className: 'bg-blue-50 text-blue-700 border-blue-100',    icon: Clock },
    active:    { label: 'Active',   className: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
    past_due:  { label: 'Past Due', className: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
    cancelled: { label: 'Cancelled',className: 'bg-slate-100 text-slate-500 border-slate-200', icon: XCircle },
    expired:   { label: 'Expired',  className: 'bg-red-50 text-red-600 border-red-100',       icon: XCircle },
}

const DUNNING_CONFIG = {
    grace:      { label: 'Grace Period', className: 'bg-amber-50 text-amber-700 border-amber-100' },
    restricted: { label: 'Restricted',   className: 'bg-orange-50 text-orange-700 border-orange-100' },
    suspended:  { label: 'Suspended',    className: 'bg-red-50 text-red-700 border-red-100' },
}

function StatusBadge({ status }: { status: AssetSubscriptionStatus }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired
    const Icon = cfg.icon
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border', cfg.className)}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    )
}

function DunningBadge({ stage }: { stage: string }) {
    const cfg = DUNNING_CONFIG[stage as keyof typeof DUNNING_CONFIG]
    if (!cfg) return null
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border', cfg.className)}>
            {cfg.label}
        </span>
    )
}

function AssetIcon({ type, className }: { type: string; className?: string }) {
    return type === 'Vehicle'
        ? <Car className={cn('w-4 h-4', className)} />
        : <Cpu className={cn('w-4 h-4', className)} />
}

function formatNaira(kobo: number) {
    return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: api.AssetSubscriptionSummary }) {
    const cards = [
        { label: 'Active Assets',  value: summary.active,   sub: `${summary.trialing} on trial`, color: 'text-emerald-600' },
        { label: 'Past Due',       value: summary.past_due, sub: 'Awaiting payment',              color: 'text-amber-600' },
        { label: 'Monthly ARR',    value: formatNaira(summary.monthly_arr_kobo), sub: 'Active only', color: 'text-indigo-600', isText: true },
        { label: 'Total Assets',   value: summary.total,    sub: `${summary.expired + summary.cancelled} inactive`, color: 'text-slate-700' },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
                <Card key={c.label} className="border-slate-200 shadow-sm">
                    <CardContent className="pt-5 pb-4 px-5">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                        <p className={cn('text-2xl font-bold mt-1.5', c.color)}>{c.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

// ─── Table Row Skeleton ────────────────────────────────────────────────────────

function RowSkeleton() {
    return (
        <tr className="border-b border-slate-100">
            {Array.from({ length: 7 }).map((_, i) => (
                <td key={i} className="px-5 py-4">
                    <Skeleton className="h-4 w-full rounded" />
                </td>
            ))}
        </tr>
    )
}

// ─── Cancel Dialog ─────────────────────────────────────────────────────────────

function CancelDialog({
    subscription,
    open,
    onClose,
}: {
    subscription: AssetSubscription | null
    open: boolean
    onClose: () => void
}) {
    const queryClient = useQueryClient()
    const { mutate, isPending } = useMutation({
        mutationFn: (id: number) => api.cancelAssetSubscription(id),
        onSuccess: () => {
            toast.success('Subscription cancelled. Access continues until end of billing period.')
            queryClient.invalidateQueries({ queryKey: ['asset-subscriptions'] })
            queryClient.invalidateQueries({ queryKey: ['asset-subscription-summary'] })
            onClose()
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? 'Failed to cancel subscription.')
        },
    })

    if (!subscription) return null

    const assetType = subscription.subscribable_type === 'Vehicle' ? 'Vehicle' : 'Device'
    const expiresLabel = subscription.current_period_end
        ? format(new Date(subscription.current_period_end), 'MMMM d, yyyy')
        : 'end of current period'

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-slate-900">Cancel Subscription</DialogTitle>
                    <DialogDescription className="text-slate-500 mt-2 leading-relaxed">
                        This {assetType.toLowerCase()} subscription will be cancelled.
                        {' '}You will retain access until <span className="font-semibold text-slate-700">{expiresLabel}</span> with no refund for unused time.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 mt-2">
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Keep Subscription
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => mutate(subscription.id)}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                        Confirm Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type AssetTypeFilter = 'all' | 'Vehicle' | 'Device'
type StatusFilter = 'all' | AssetSubscriptionStatus

export default function AssetSubscriptionsPage() {
    const [assetType, setAssetType]   = useState<AssetTypeFilter>('all')
    const [statusFilter, setStatus]   = useState<StatusFilter>('all')
    const [page, setPage]             = useState(1)
    const [toCancel, setToCancel]     = useState<AssetSubscription | null>(null)

    const queryParams = {
        ...(assetType !== 'all'    ? { type: assetType as 'Vehicle' | 'Device' } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter as AssetSubscriptionStatus } : {}),
        page,
        per_page: 15,
    }

    const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['asset-subscription-summary'],
        queryFn: api.getAssetSubscriptionSummary,
    })

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['asset-subscriptions', queryParams],
        queryFn: () => api.getAssetSubscriptions(queryParams),
    })

    const subscriptions = data?.data ?? []
    const meta = data?.meta

    const handleTabChange = (val: string) => {
        setAssetType(val as AssetTypeFilter)
        setPage(1)
    }

    const handleStatusChange = (val: string) => {
        setStatus(val as StatusFilter)
        setPage(1)
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Asset Subscriptions</h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Each vehicle and device is billed individually. Manage and track billing status per asset.
                </p>
            </div>

            {/* Summary */}
            {isSummaryLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="border-slate-200 shadow-sm">
                            <CardContent className="pt-5 pb-4 px-5 space-y-2">
                                <Skeleton className="h-3 w-24 rounded" />
                                <Skeleton className="h-7 w-16 rounded" />
                                <Skeleton className="h-3 w-20 rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : summaryData ? (
                <SummaryCards summary={summaryData} />
            ) : null}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Tabs value={assetType} onValueChange={handleTabChange}>
                    <TabsList className="bg-slate-100 p-1 h-9">
                        <TabsTrigger value="all"     className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">All Assets</TabsTrigger>
                        <TabsTrigger value="Vehicle" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5" /> Vehicles
                        </TabsTrigger>
                        <TabsTrigger value="Device"  className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5" /> Devices
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-40 h-9 text-xs border-slate-200">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all"      className="text-xs">All Statuses</SelectItem>
                            <SelectItem value="trialing" className="text-xs">Trial</SelectItem>
                            <SelectItem value="active"   className="text-xs">Active</SelectItem>
                            <SelectItem value="past_due" className="text-xs">Past Due</SelectItem>
                            <SelectItem value="cancelled"className="text-xs">Cancelled</SelectItem>
                            <SelectItem value="expired"  className="text-xs">Expired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                {isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Failed to load subscriptions</p>
                            <p className="text-xs text-slate-400 mt-1">Check your connection and try again.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="border-b border-slate-100 bg-slate-50/70">
                                <tr>
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-8"></th>
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Asset</th>
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cycle</th>
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rate</th>
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Next Billing</th>
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading
                                    ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                                    : subscriptions.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={7} className="px-5 py-16 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <TrendingUp className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-500">No subscriptions found</p>
                                                        <p className="text-xs text-slate-400">Add vehicles or devices to start generating asset subscriptions.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                        : subscriptions.map((sub) => {
                                            const canCancel = sub.status === 'active' || sub.status === 'trialing'
                                            return (
                                                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                                    {/* Icon */}
                                                    <td className="px-5 py-4">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                            <AssetIcon
                                                                type={sub.subscribable_type}
                                                                className={sub.subscribable_type === 'Vehicle' ? 'text-indigo-500' : 'text-violet-500'}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Asset */}
                                                    <td className="px-5 py-4">
                                                        <p className="font-medium text-slate-800 text-sm">
                                                            {sub.subscribable_type === 'Vehicle' ? 'Vehicle' : 'Device'} #{sub.subscribable_id}
                                                        </p>
                                                        {sub.plan && (
                                                            <p className="text-xs text-slate-400 mt-0.5">{sub.plan.name}</p>
                                                        )}
                                                    </td>

                                                    {/* Cycle */}
                                                    <td className="px-5 py-4">
                                                        <span className="text-xs font-medium text-slate-600 capitalize">{sub.billing_cycle}</span>
                                                    </td>

                                                    {/* Rate */}
                                                    <td className="px-5 py-4 font-mono font-medium text-slate-800 text-sm">
                                                        {formatNaira(sub.price_kobo)}
                                                        <span className="text-xs text-slate-400 font-sans ml-1">/{sub.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span>
                                                    </td>

                                                    {/* Next Billing */}
                                                    <td className="px-5 py-4">
                                                        {sub.next_billing_at ? (
                                                            <span className="text-sm text-slate-600">
                                                                {format(new Date(sub.next_billing_at), 'MMM d, yyyy')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <StatusBadge status={sub.status} />
                                                            {sub.dunning_stage && (
                                                                <DunningBadge stage={sub.dunning_stage} />
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-5 py-4 text-right">
                                                        {canCancel && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => setToCancel(sub)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                }
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                    <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                            Page {meta.current_page} of {meta.last_page} &middot; {meta.total} total
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                            </Button>
                            <Button variant="outline" size="sm" className="h-8" disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>
                                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <CancelDialog
                subscription={toCancel}
                open={!!toCancel}
                onClose={() => setToCancel(null)}
            />
        </div>
    )
}
