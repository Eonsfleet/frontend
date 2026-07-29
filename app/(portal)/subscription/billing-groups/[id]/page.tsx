'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    ArrowLeft, Loader2, PackageMinus, AlertTriangle, Car, Cpu, FilePlus2, Layers, RefreshCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { QueryError } from '@/components/shared/QueryError'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { BillingGroupStatusBadge, InvoiceStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { extractApiError } from '@/lib/utils'
import { useAccessControl } from '@/hooks/useAccessControl'
import * as api from '@/lib/api/billing-groups'
import type { BillingAsset } from '@/types/subscription'

const ACTIVITY_ICON: Record<string, React.ElementType> = {
    invoice_issued: FilePlus2,
    billing_group_created: Layers,
}

function ScheduleRemovalDialog({
    billingGroupId,
    asset,
    onClose,
}: {
    billingGroupId: string
    asset: BillingAsset | null
    onClose: () => void
}) {
    const queryClient = useQueryClient()
    const { isOwner } = useAccessControl() // organisation owners get full self-service, including immediate removal
    const [mode, setMode] = useState<'schedule' | 'immediate'>('schedule')
    const [effectiveDate, setEffectiveDate] = useState(asset?.billingEnd ?? '')
    const [reason, setReason] = useState('')

    const scheduleMutation = useMutation({
        mutationFn: () => api.scheduleAssetRemoval({ billingGroupId, assetId: asset!.id, effectiveDate, reason }),
        onSuccess: () => {
            toast.success(`Asset removal scheduled for ${effectiveDate || 'end of current period'}.`)
            queryClient.invalidateQueries({ queryKey: ['billing-group', billingGroupId] })
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err, 'Failed to schedule removal.')),
    })

    const immediateMutation = useMutation({
        mutationFn: () => api.requestImmediateRemoval({ billingGroupId, assetId: asset!.id, reason }),
        onSuccess: () => {
            toast.success('Asset removed immediately.')
            queryClient.invalidateQueries({ queryKey: ['billing-group', billingGroupId] })
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err, 'Failed to remove asset.')),
    })

    if (!asset) return null

    const isImmediate = mode === 'immediate'
    const isPending = scheduleMutation.isPending || immediateMutation.isPending

    return (
        <Dialog open={!!asset} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className={isImmediate ? 'flex items-center gap-2 text-red-700' : undefined}>
                        {isImmediate && <AlertTriangle className="h-5 w-5" />}
                        {isImmediate ? 'Remove Immediately' : 'Schedule Removal'}
                    </DialogTitle>
                    <DialogDescription>
                        {isImmediate
                            ? `This ends billing for ${asset.label} right away. This cannot be undone.`
                            : `Billing remains active until the end of the current paid period for ${asset.label}.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {!isImmediate && (
                        <div className="space-y-1.5">
                            <Label>Effective date</Label>
                            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label>Reason</Label>
                        <textarea
                            rows={3}
                            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Vehicle decommissioned"
                        />
                    </div>
                    {isOwner && (
                        <button
                            type="button"
                            className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-red-600 hover:underline"
                            onClick={() => setMode(isImmediate ? 'schedule' : 'immediate')}
                        >
                            {isImmediate ? 'Schedule for period end instead' : 'Remove immediately instead (skips remaining paid period)'}
                        </button>
                    )}
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        variant={isImmediate ? 'destructive' : 'default'}
                        disabled={isPending || (!isImmediate && !effectiveDate) || !reason.trim()}
                        onClick={() => (isImmediate ? immediateMutation.mutate() : scheduleMutation.mutate())}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isImmediate ? 'Confirm Immediate Removal' : 'Confirm Removal'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function BillingGroupDetailPage() {
    const params = useParams<{ id: string }>()
    const groupId = params.id
    const [removalAsset, setRemovalAsset] = useState<BillingAsset | null>(null)

    const { data: group, isLoading, isError, refetch } = useQuery({
        queryKey: ['billing-group', groupId],
        queryFn: () => api.getBillingGroupDetail(groupId),
    })

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
    }

    if (isError || !group) {
        return <QueryError message="Failed to load billing group." onRetry={refetch} />
    }

    return (
        <div className="max-w-6xl space-y-6">
            <Link href="/subscription/billing-groups" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" /> Billing Groups
            </Link>

            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{group.name}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {group.plan} &middot; {group.billingCycle === 'MONTHLY' ? 'Monthly' : 'Annual'} billing
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <BillingGroupStatusBadge status={group.status} />
                    <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recurring amount</p>
                        <MoneyDisplay value={group.renewalAmount} className="text-lg font-bold text-slate-900" />
                    </div>
                </div>
            </div>

            {/* Billing summary */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader><CardTitle className="text-[13px] font-semibold text-slate-700">Billing Summary</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <Row label="Quantity" value={group.assetCount.toLocaleString()} />
                        <Row label="Unit price" value={<MoneyDisplay value={group.unitPrice} />} />
                        <Row label="Subtotal" value={<MoneyDisplay value={group.subtotal} />} />
                        <Row label="Discount" value={<MoneyDisplay value={group.discount} />} />
                        <Row label="Tax" value={<MoneyDisplay value={group.tax} />} />
                        <Row label="Total" value={<MoneyDisplay value={group.total} />} bold />
                        <Row label="Currency" value={group.total.currency} />
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader><CardTitle className="text-[13px] font-semibold text-slate-700">Current Period</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <Row label="Period start" value={<BillingDateDisplay date={group.currentPeriodStart} />} />
                        <Row label="Period end" value={<BillingDateDisplay date={group.currentPeriodEnd} />} />
                        <Row label="Next renewal" value={<BillingDateDisplay date={group.nextRenewal} showRelative />} />
                        <Row label="Cancellation state" value={<span className="capitalize">{group.cancellationState}</span>} />
                    </CardContent>
                </Card>
            </div>

            {/* Assets table */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100"><CardTitle className="text-[13px] font-semibold text-slate-700">Assets</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {group.assets.length === 0 ? (
                        <EmptyState icon={Car} title="No assets in this group" description="Add assets to this billing group to begin billing." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3">Asset</th>
                                        <th className="px-5 py-3">Registration number</th>
                                        <th className="px-5 py-3">Device</th>
                                        <th className="px-5 py-3">Billing start</th>
                                        <th className="px-5 py-3">Billing end</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Removal date</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {group.assets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2 font-medium text-slate-800">
                                                    {asset.assetType === 'Vehicle' ? <Car className="h-3.5 w-3.5 text-indigo-500" /> : <Cpu className="h-3.5 w-3.5 text-violet-500" />}
                                                    {asset.label}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-600">{asset.registrationNumber ?? '—'}</td>
                                            <td className="px-5 py-3.5 capitalize text-slate-600">{asset.deviceStatus}</td>
                                            <td className="px-5 py-3.5"><BillingDateDisplay date={asset.billingStart} /></td>
                                            <td className="px-5 py-3.5">{asset.billingEnd ? <BillingDateDisplay date={asset.billingEnd} /> : <span className="text-slate-400">—</span>}</td>
                                            <td className="px-5 py-3.5 capitalize text-slate-600">{asset.status.replace('_', ' ')}</td>
                                            <td className="px-5 py-3.5">{asset.removalDate ? <BillingDateDisplay date={asset.removalDate} /> : <span className="text-slate-400">—</span>}</td>
                                            <td className="px-5 py-3.5 text-right">
                                                {asset.status === 'active' && (
                                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-slate-500 hover:text-red-600" onClick={() => setRemovalAsset(asset)}>
                                                        <PackageMinus className="h-3.5 w-3.5" /> Schedule removal
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Invoice history */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100"><CardTitle className="text-[13px] font-semibold text-slate-700">Invoice History</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {group.invoices.length === 0 ? (
                        <EmptyState icon={FilePlus2} title="No invoices yet" description="Invoices for this billing group will appear here once issued." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3">Invoice number</th>
                                        <th className="px-5 py-3">Period</th>
                                        <th className="px-5 py-3">Issued date</th>
                                        <th className="px-5 py-3">Due date</th>
                                        <th className="px-5 py-3 text-right">Amount</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {group.invoices.map((invoice) => (
                                        <tr key={invoice.invoiceNumber} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3.5 font-medium text-slate-800">{invoice.invoiceNumber}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{invoice.period}</td>
                                            <td className="px-5 py-3.5"><BillingDateDisplay date={invoice.issuedDate} /></td>
                                            <td className="px-5 py-3.5"><BillingDateDisplay date={invoice.dueDate} /></td>
                                            <td className="px-5 py-3.5 text-right"><MoneyDisplay value={invoice.amount} /></td>
                                            <td className="px-5 py-3.5"><InvoiceStatusBadge status={invoice.status} /></td>
                                            <td className="px-5 py-3.5 text-right">
                                                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                                    <Link href={`/subscription/invoices/${invoice.invoiceNumber}`}>View</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Activity timeline */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100"><CardTitle className="text-[13px] font-semibold text-slate-700">Activity</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {group.activity.length === 0 ? (
                        <EmptyState icon={RefreshCcw} title="No activity yet" description="Billing group events will appear here as they happen." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {group.activity.map((event) => {
                                const Icon = ACTIVITY_ICON[event.type] ?? RefreshCcw
                                return (
                                    <li key={event.id} className="flex items-center gap-3 px-5 py-3.5">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                            <Icon className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-800">{event.label}</p>
                                            <BillingDateDisplay date={event.timestamp} className="text-[11px] text-slate-400" />
                                        </div>
                                        {event.amount && <MoneyDisplay value={event.amount} className="text-sm font-semibold text-slate-700" />}
                                        {event.assetCount !== undefined && <span className="text-sm text-slate-500">{event.assetCount} assets</span>}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <ScheduleRemovalDialog billingGroupId={group.id} asset={removalAsset} onClose={() => setRemovalAsset(null)} />
        </div>
    )
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
    return (
        <div className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
            <span className="text-slate-500">{label}</span>
            <span className={bold ? 'font-bold text-slate-900' : 'text-slate-700'}>{value}</span>
        </div>
    )
}
