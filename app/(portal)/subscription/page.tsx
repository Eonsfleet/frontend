'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
    Layers, Wallet, CalendarClock, CircleAlert, ArrowRight, ArrowUpRight,
    CreditCard, FilePlus2, PackagePlus, PackageMinus, RefreshCcw, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/shared/QueryError'
import { SubscriptionStatusBadge, BillingGroupStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import * as api from '@/lib/api/billing-groups'

const ACTIVITY_ICON: Record<string, React.ElementType> = {
    payment_received: CreditCard,
    invoice_issued: FilePlus2,
    assets_added: PackagePlus,
    asset_removal_scheduled: PackageMinus,
    billing_group_created: Layers,
    poc_extended: RefreshCcw,
}

export default function SubscriptionOverviewPage() {
    const { data: overview, isLoading: isOverviewLoading, isError: isOverviewError, refetch: refetchOverview } = useQuery({
        queryKey: ['subscription-overview'],
        queryFn: api.getSubscriptionOverview,
    })

    const { data: notices } = useQuery({
        queryKey: ['subscription-notices'],
        queryFn: api.getSubscriptionNotices,
    })

    const { data: billingGroups, isLoading: isGroupsLoading } = useQuery({
        queryKey: ['billing-groups'],
        queryFn: api.getBillingGroups,
    })

    const { data: activity, isLoading: isActivityLoading } = useQuery({
        queryKey: ['subscription-activity'],
        queryFn: api.getSubscriptionActivity,
    })

    if (isOverviewLoading) {
        return (
            <div className="max-w-6xl space-y-6">
                <Skeleton className="h-16 w-full rounded-xl" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 rounded-xl" />
            </div>
        )
    }

    if (isOverviewError || !overview) {
        return <QueryError message="Failed to load subscription overview." onRetry={refetchOverview} />
    }

    const isPastDue = overview.status === 'PAST_DUE'
    const primaryAction = isPastDue
        ? { label: 'View overdue invoice', href: '/subscription/invoices' }
        : overview.subscriptionType === 'POC'
          ? { label: 'Convert to Production', href: '/subscription/poc' }
          : { label: 'Add assets', href: '/subscription/billing-groups/add-assets' }

    return (
        <div className="max-w-6xl space-y-6">
            {/* Header (spec 7.1) */}
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription & Billing</h1>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        {overview.organizationName}
                        <span className="text-slate-300">&middot;</span>
                        <span className="font-medium text-slate-600">{overview.subscriptionType === 'POC' ? 'POC' : 'Production'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <SubscriptionStatusBadge status={overview.status} />
                    <Button asChild size="sm" className="h-9 gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
                        <Link href={primaryAction.href}>
                            {primaryAction.label} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </div>

            {isPastDue && overview.gracePeriodEndsAt && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    <span>Grace period ends <BillingDateDisplay date={overview.gracePeriodEndsAt} className="inline font-semibold" />.</span>
                </div>
            )}

            {/* Summary cards (spec 7.2) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" /> Current Plan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold text-slate-900">{overview.plan.name}</p>
                        <p className="mt-0.5 text-xs capitalize text-slate-400">{overview.plan.billingCycle.toLowerCase()} billing</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <PackagePlus className="h-3.5 w-3.5 text-indigo-500" /> Billable Assets
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold text-slate-900">{overview.billableAssets.total.toLocaleString()} active assets</p>
                        <p className="mt-0.5 text-xs text-slate-400">{overview.billableAssets.billingGroupCount} billing group{overview.billableAssets.billingGroupCount === 1 ? '' : 's'}</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <CalendarClock className="h-3.5 w-3.5 text-indigo-500" /> Nearest Renewal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {overview.nearestRenewal ? (
                            <>
                                <BillingDateDisplay date={overview.nearestRenewal.date} className="text-base font-bold text-slate-900" />
                                <MoneyDisplay value={overview.nearestRenewal.amount} className="mt-1 block text-xs text-slate-500" />
                            </>
                        ) : (
                            <p className="text-sm text-slate-400">No upcoming renewal</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <Wallet className="h-3.5 w-3.5 text-indigo-500" /> Outstanding Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MoneyDisplay value={overview.outstandingBalance.amount} className="block text-xl font-bold text-slate-900" />
                        <p className="mt-0.5 text-xs text-slate-400">
                            {overview.outstandingBalance.overdueInvoiceCount > 0
                                ? `${overview.outstandingBalance.overdueInvoiceCount} overdue invoice${overview.outstandingBalance.overdueInvoiceCount === 1 ? '' : 's'}`
                                : 'No overdue invoices'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Billing breakdown (spec 7.3) — the UI must not imply a single renewal date. */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/70 py-3.5">
                    <CardTitle className="text-[13px] font-semibold text-slate-700">Billing Groups</CardTitle>
                    <Button variant="link" asChild className="h-auto p-0 text-xs font-semibold text-indigo-600">
                        <Link href="/subscription/billing-groups" className="flex items-center gap-1">
                            View all <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isGroupsLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                    ) : !billingGroups || billingGroups.length === 0 ? (
                        <EmptyState
                            icon={Layers}
                            title="No billing groups yet"
                            description="This organisation has no Production assets attached to a billing group. Add assets to begin asset-based billing."
                            actionLabel="Add assets"
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3">Billing group</th>
                                        <th className="px-5 py-3 text-right">Assets</th>
                                        <th className="px-5 py-3 text-right">Unit price</th>
                                        <th className="px-5 py-3">Cycle</th>
                                        <th className="px-5 py-3">Next renewal</th>
                                        <th className="px-5 py-3 text-right">Amount</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {billingGroups.map((group) => (
                                        <tr key={group.id} className="transition-colors hover:bg-slate-50/50">
                                            <td className="px-5 py-4 font-medium text-slate-800">{group.name}</td>
                                            <td className="px-5 py-4 text-right text-slate-600">{group.assetCount.toLocaleString()}</td>
                                            <td className="px-5 py-4 text-right"><MoneyDisplay value={group.unitPrice} /></td>
                                            <td className="px-5 py-4 capitalize text-slate-600">{group.billingCycle.toLowerCase()}</td>
                                            <td className="px-5 py-4"><BillingDateDisplay date={group.nextRenewal} /></td>
                                            <td className="px-5 py-4 text-right font-semibold"><MoneyDisplay value={group.renewalAmount} /></td>
                                            <td className="px-5 py-4"><BillingGroupStatusBadge status={group.status} /></td>
                                            <td className="px-5 py-4 text-right">
                                                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                                    <Link href={`/subscription/billing-groups/${group.id}`}>View details</Link>
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

            {/* Action notices (spec 7.4) */}
            {notices && notices.length > 0 && (
                <div className="space-y-2">
                    {notices.map((notice) => (
                        <div
                            key={notice.id}
                            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                                notice.severity === 'critical'
                                    ? 'border-red-200 bg-red-50 text-red-800'
                                    : notice.severity === 'warning'
                                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                                      : 'border-blue-200 bg-blue-50 text-blue-800'
                            }`}
                        >
                            <span>{notice.message}</span>
                            <Button asChild size="sm" variant="outline" className="h-7 shrink-0 bg-white text-xs">
                                <Link href={notice.actionHref}>{notice.actionLabel}</Link>
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Activity (spec 7.5) */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 py-3.5">
                    <CardTitle className="text-[13px] font-semibold text-slate-700">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isActivityLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                    ) : !activity || activity.length === 0 ? (
                        <EmptyState icon={RefreshCcw} title="No activity yet" description="Subscription events will appear here as they happen." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {activity.map((event) => {
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
        </div>
    )
}
