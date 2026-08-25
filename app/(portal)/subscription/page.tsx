'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, CreditCard, FileText, Layers, Loader2, Receipt, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/shared/QueryError'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { InvoiceStatusBadge, PaymentStatusBadge, SubscriptionStatusBadge } from '@/components/shared/subscription/StatusBadges'
import * as billing from '@/lib/api/billing'

export default function SubscriptionOverviewPage() {
    const subscriptionQuery = useQuery({
        queryKey: ['org-subscription'],
        queryFn: billing.getOrganizationSubscription,
    })

    const invoicesQuery = useQuery({
        queryKey: ['subscription-invoices', 'recent'],
        queryFn: () => billing.getInvoices({ page: 1, per_page: 5 }),
    })

    const transactionsQuery = useQuery({
        queryKey: ['subscription-transactions', 'recent'],
        queryFn: () => billing.getSubscriptionTransactions({ page: 1, per_page: 5 }),
    })

    const invoices = useMemo(() => invoicesQuery.data?.data.data ?? [], [invoicesQuery.data])
    const transactions = useMemo(() => transactionsQuery.data?.data.data ?? [], [transactionsQuery.data])
    const subscription = subscriptionQuery.data
    const currency = subscription?.currency ?? invoices[0]?.currency ?? 'NGN'

    const outstanding = useMemo(() => {
        return invoices
            .filter((invoice) => !['paid', 'void', 'cancelled', 'canceled'].includes(String(invoice.status).toLowerCase()))
            .reduce((total, invoice) => total + Number(invoice.amount_due ?? invoice.total ?? 0), 0)
    }, [invoices])

    if (subscriptionQuery.isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-20 w-full rounded-lg" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}
                </div>
                <Skeleton className="h-80 rounded-lg" />
            </div>
        )
    }

    if (subscriptionQuery.isError) {
        return <QueryError message="Failed to load subscription overview." onRetry={subscriptionQuery.refetch} />
    }

    const status = billing.normalizeSubscriptionStatus(subscription?.status)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0055FF]">Billing center</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Subscription & Billing</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Manage plan access, invoices, payments, renewal dates, and billable fleet capacity from one place.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <SubscriptionStatusBadge status={status} />
                    <Button asChild className="h-9 gap-2 bg-[#0055FF] text-white hover:bg-[#0048d9]">
                        <Link href="/subscription/plan">Manage plan <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Metric icon={Layers} label="Current plan" value={subscription?.plan.name ?? 'No active plan'} caption={subscription ? `${subscription.billing_cycle} billing` : 'Select a plan to activate billing'} />
                <Metric icon={CreditCard} label="Billable vehicles" value={(subscription?.vehicle_count ?? 0).toLocaleString()} caption={subscription?.vehicle_limit ? `${subscription.vehicle_limit.toLocaleString()} vehicle limit` : 'No fixed plan limit'} />
                <Metric icon={CalendarClock} label="Next billing date" value={subscription?.ends_at ? <BillingDateDisplay date={subscription.ends_at} /> : 'Not set'} caption={subscription?.starts_at ? <>Started <BillingDateDisplay date={subscription.starts_at} /></> : 'Awaiting activation'} />
                <Metric icon={Wallet} label="Outstanding balance" value={<MoneyDisplay value={billing.toMoney(outstanding, currency)} />} caption={outstanding > 0 ? 'Requires finance attention' : 'No unpaid balance'} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-0 shadow-none">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3">
                            <div>
                                <h2 className="text-base font-semibold text-slate-950">Current Subscription</h2>
                                <p className="text-sm text-slate-500">Backend subscription record and plan entitlements.</p>
                            </div>
                            <Button asChild variant="outline" size="sm" className="h-8">
                                <Link href="/subscription/plan">View plans</Link>
                            </Button>
                        </div>
                        {subscription ? (
                            <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
                                <Detail label="Plan" value={subscription.plan.name} />
                                <Detail label="Cycle" value={subscription.billing_cycle} />
                                <Detail label="Recurring price" value={<MoneyDisplay value={billing.toMoney(subscription.plan.price, subscription.currency)} />} />
                                <Detail label="Payment state" value={status.replaceAll('_', ' ')} />
                                <Detail label="Capabilities" value={`${subscription.capabilities.length.toLocaleString()} enabled`} />
                                <Detail label="Next billing" value={subscription.ends_at ? <BillingDateDisplay date={subscription.ends_at} /> : 'Not set'} />
                            </div>
                        ) : (
                            <div>
                                <EmptyState icon={Layers} title="No subscription found" description="Choose a plan to activate billing for this organisation." />
                                <div className="-mt-12 flex justify-center pb-8">
                                    <Button asChild className="bg-[#0055FF] text-white hover:bg-[#0048d9]">
                                        <Link href="/subscription/plan">Choose plan</Link>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-none">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3">
                            <div>
                                <h2 className="text-base font-semibold text-slate-950">Recent Invoices</h2>
                                <p className="text-sm text-slate-500">Latest issued billing documents.</p>
                            </div>
                            <Button asChild variant="outline" size="sm" className="h-8">
                                <Link href="/subscription/invoices">All invoices</Link>
                            </Button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {invoicesQuery.isLoading ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                            ) : invoices.length === 0 ? (
                                <EmptyState icon={FileText} title="No invoices yet" description="Invoices will appear here when they are issued." />
                            ) : invoices.map((invoice) => (
                                <Link key={invoice.id} href={`/subscription/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900">{invoice.invoice_number}</p>
                                        <BillingDateDisplay date={invoice.issued_at} className="text-xs text-slate-500" />
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <MoneyDisplay value={billing.toMoney(invoice.amount_due ?? invoice.total, invoice.currency)} className="text-sm font-semibold text-slate-900" />
                                        <InvoiceStatusBadge status={billing.normalizeInvoiceStatus(invoice.status)} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-none">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-950">Recent Payments</h2>
                            <p className="text-sm text-slate-500">Payment transaction status from the subscription API.</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="h-8">
                            <Link href="/subscription/payments">All payments</Link>
                        </Button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {transactionsQuery.isLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                        ) : transactions.length === 0 ? (
                            <EmptyState icon={Receipt} title="No payments yet" description="Successful and pending payments will be listed here." />
                        ) : transactions.map((transaction) => (
                            <div key={transaction.id} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{transaction.attributes.reference ?? `Transaction ${transaction.id}`}</p>
                                    <p className="text-xs text-slate-500">{transaction.relationships?.subscription?.plan?.name ?? 'Subscription payment'}</p>
                                </div>
                                <MoneyDisplay value={billing.toMoney(transaction.attributes.amount, transaction.attributes.currency)} className="text-sm font-semibold text-slate-900" />
                                <PaymentStatusBadge status={billing.normalizePaymentStatus(transaction.attributes.status)} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function Metric({ icon: Icon, label, value, caption }: { icon: React.ElementType; label: string; value: React.ReactNode; caption: React.ReactNode }) {
    return (
        <div className="rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
                    <div className="mt-1 text-xs text-slate-500">{caption}</div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0055FF]/10">
                    <Icon className="h-4 w-4 text-[#0055FF]" />
                </div>
            </div>
        </div>
    )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="mt-1 text-sm font-semibold capitalize text-slate-900">{value}</div>
        </div>
    )
}
