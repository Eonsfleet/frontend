'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    CreditCard, Zap, CheckCircle2, History, ArrowRight,
    Loader2, AlertCircle, AlertTriangle, Car, Cpu, Layers,
    CalendarDays, RefreshCw, XCircle,
} from 'lucide-react'
import * as api from '@/lib/api/billing'
import { cn } from '@/lib/utils'

// ─── Dunning Alert Banner ─────────────────────────────────────────────────────

const DUNNING_ALERTS = {
    grace: {
        icon: AlertTriangle,
        title: 'Payment Overdue — Grace Period',
        body: 'Your organisation has outstanding unpaid assets. Some services may be interrupted after 7 days if payment is not settled.',
        className: 'bg-amber-50 border-amber-200 text-amber-800',
        iconClass: 'text-amber-500',
    },
    restricted: {
        icon: AlertCircle,
        title: 'Real-Time Tracking Paused',
        body: 'Live GPS and tracking are suspended on unpaid assets. Settle your outstanding balance to restore full access.',
        className: 'bg-orange-50 border-orange-200 text-orange-800',
        iconClass: 'text-orange-500',
    },
    suspended: {
        icon: XCircle,
        title: 'Account Suspended',
        body: 'One or more subscriptions have been suspended due to non-payment. Contact support to reactivate.',
        className: 'bg-red-50 border-red-200 text-red-800',
        iconClass: 'text-red-500',
    },
}

function DunningBanner({ stage }: { stage: string }) {
    const cfg = DUNNING_ALERTS[stage as keyof typeof DUNNING_ALERTS]
    if (!cfg) return null
    const Icon = cfg.icon
    return (
        <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3.5', cfg.className)}>
            <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', cfg.iconClass)} />
            <div className="min-w-0">
                <p className="text-sm font-semibold">{cfg.title}</p>
                <p className="text-xs mt-0.5 opacity-80">{cfg.body}</p>
            </div>
            <Button asChild size="sm" variant="outline"
                className="shrink-0 ml-auto border-current text-current hover:bg-white/60 h-8 text-xs">
                <Link href="/billing/assets">View Assets</Link>
            </Button>
        </div>
    )
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        active:     'bg-emerald-100 text-emerald-700',
        trial:      'bg-blue-100 text-blue-700',
        grace:      'bg-amber-100 text-amber-700',
        restricted: 'bg-orange-100 text-orange-700',
        suspended:  'bg-red-100 text-red-700',
        expired:    'bg-slate-100 text-slate-500',
    }
    return (
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider', map[status] ?? map.expired)}>
            <CheckCircle2 className="w-3 h-3" />
            {status}
        </span>
    )
}

// ─── Asset Summary Strip ──────────────────────────────────────────────────────

function AssetSummaryStrip({ summary }: { summary: api.AssetSubscriptionSummary }) {
    return (
        <Link href="/billing/assets" className="block group">
            <Card className="border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
                <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Asset Subscriptions</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:gap-2 transition-all">
                            Manage <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Active',   value: summary.active,   color: 'text-emerald-600' },
                            { label: 'Trial',    value: summary.trialing, color: 'text-blue-600' },
                            { label: 'Past Due', value: summary.past_due, color: 'text-amber-600' },
                            { label: 'Monthly',  value: `₦${(summary.monthly_arr_kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`, color: 'text-slate-800' },
                        ].map((s) => (
                            <div key={s.label} className="text-center">
                                <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillingOverviewPage() {
    const { data: subscription, isLoading: isSubLoading, isError: isSubError } = useQuery({
        queryKey: ['subscription-current'],
        queryFn: api.getOrganizationSubscription,
    })

    const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery({
        queryKey: ['invoices-recent'],
        queryFn: () => api.getInvoices({ page: 1 }),
    })

    const { data: assetSummary } = useQuery({
        queryKey: ['asset-subscription-summary'],
        queryFn: api.getAssetSubscriptionSummary,
        enabled: !!subscription,
    })

    if (isSubLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (isSubError) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Failed to load subscription</h2>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm">There was a problem fetching your billing status. Please try again.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
            </div>
        )
    }

    const isUnlimited = subscription ? subscription.vehicle_limit === null : false
    const usagePercentage = subscription && !isUnlimited ? Math.round((subscription.vehicle_count / (subscription.vehicle_limit as number)) * 100) || 0 : 0
    const isNearLimit = subscription ? (!isUnlimited && usagePercentage >= 80) : false
    const recentInvoices = invoicesData?.data?.data?.slice(0, 3) || []
    const hasDunning = assetSummary && assetSummary.past_due > 0

    return (
        <div className="space-y-5 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Overview</h1>
                <p className="text-slate-500 mt-1 text-sm">Your organisation's plan, usage, and billing summary.</p>
            </div>

            {/* Dunning Alert */}
            {hasDunning && <DunningBanner stage="grace" />}

            {/* Plan Card + Billing Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {subscription ? (
                    <Card className="md:col-span-2 border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="pb-0 pt-5 px-6">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Plan</CardTitle>
                                <StatusPill status={subscription.status} />
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pt-4 pb-6 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{subscription.plan.name}</h2>
                                    <p className="text-slate-400 text-sm mt-1 capitalize">{subscription.billing_cycle} billing</p>
                                </div>
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0" asChild>
                                    <Link href="/billing/upgrade">
                                        <Zap className="mr-2 h-3.5 w-3.5" /> Upgrade Plan
                                    </Link>
                                </Button>
                            </div>

                            <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Renewal */}
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400">Renewal Date</p>
                                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                                            {subscription.ends_at
                                                ? format(new Date(subscription.ends_at), 'MMM d, yyyy')
                                                : 'No expiry set'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Started {format(new Date(subscription.starts_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>

                                {/* Vehicle Usage */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="font-medium text-slate-500 flex items-center gap-1.5">
                                            <Car className="w-3.5 h-3.5 text-slate-400" /> Vehicle Limit
                                        </span>
                                        <span className={cn('font-bold', isNearLimit ? 'text-amber-600' : 'text-indigo-600')}>
                                            {subscription.vehicle_count} / {isUnlimited ? 'Unlimited' : subscription.vehicle_limit}
                                        </span>
                                    </div>
                                    {!isUnlimited && (
                                        <>
                                            <Progress
                                                value={usagePercentage}
                                                className={cn('h-2 bg-slate-100', isNearLimit ? '[&>div]:bg-amber-500' : '[&>div]:bg-indigo-500')}
                                            />
                                            <p className={cn('text-[11px] mt-1.5', isNearLimit ? 'text-amber-600 font-medium' : 'text-slate-400')}>
                                                {isNearLimit
                                                    ? `${100 - usagePercentage}% of capacity remaining — consider upgrading.`
                                                    : `${usagePercentage}% of vehicle quota used.`
                                                }
                                            </p>
                                        </>
                                    )}
                                    {isUnlimited && (
                                        <p className="text-[11px] text-slate-400 mt-1">No vehicle limit on your current plan.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="md:col-span-2 border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="pb-0 pt-5 px-6">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plan Status</CardTitle>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                                    No Active Plan
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pt-4 pb-6 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select a Subscription Plan</h2>
                                    <p className="text-slate-500 text-sm mt-2 max-w-md">
                                        Your organization does not have an active subscription. Choose a plan to add vehicles, track your fleet, and monitor driver behavior.
                                    </p>
                                </div>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-sm" asChild>
                                    <Link href="/billing/upgrade">
                                        <Zap className="mr-2 h-3.5 w-3.5" /> View Plans
                                    </Link>
                                </Button>
                            </div>
                            <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600">
                                <div className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-semibold text-slate-800">Real-Time GPS Tracking</p>
                                        <p className="text-slate-400 mt-0.5">Live tracking with instant alerts.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-semibold text-slate-800">Smart Fuel & Maintenance</p>
                                        <p className="text-slate-400 mt-0.5">Monitor fuel usage and schedule servicing.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Payment Method */}
                <Card className="border-slate-200 shadow-sm bg-slate-900 text-slate-50 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-transparent to-violet-900/20" />
                    <CardHeader className="relative z-10 pb-2 pt-5 px-5">
                        <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Payment Method
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 flex-1 flex flex-col justify-center px-5 py-6">
                        {subscription ? (
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-9 bg-slate-100/10 rounded-md flex items-center justify-center border border-slate-700">
                                    <div className="relative w-8 h-5">
                                        <div className="absolute left-0 w-5 h-5 rounded-full bg-red-500/80" />
                                        <div className="absolute right-0 w-5 h-5 rounded-full bg-amber-400/80" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-mono text-base font-medium tracking-widest text-slate-200">•••• 4242</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Expires 12/28</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="mx-auto w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                                    <CreditCard className="w-5 h-5 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-400">No payment method on file</p>
                                <p className="text-[10px] text-slate-500 mt-1">Stored securely during plan selection</p>
                            </div>
                        )}
                        {subscription && <p className="text-[10px] text-slate-600 mt-5 italic">Payment method management coming soon.</p>}
                    </CardContent>
                </Card>
            </div>

            {/* Asset Subscription Summary */}
            {subscription && assetSummary && <AssetSummaryStrip summary={assetSummary} />}

            {/* Recent Transactions */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        <CardTitle className="text-[13px] font-semibold text-slate-700">Recent Invoices</CardTitle>
                    </div>
                    <Button variant="link" className="text-indigo-600 h-auto p-0 text-xs" asChild>
                        <Link href="/billing/invoices" className="flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isInvoicesLoading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3">Invoice</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                                            {format(new Date(inv.issued_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-slate-800 text-xs">{inv.invoice_number}</td>
                                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-800">
                                            {inv.currency} {inv.total.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={cn(
                                                'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                                                inv.status === 'paid'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700'
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-xs italic">
                                            No invoices yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
