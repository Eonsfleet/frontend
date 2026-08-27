'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowRight,
    CalendarClock,
    CreditCard,
    FileText,
    Layers,
    Loader2,
    Receipt,
    ShieldCheck,
    Users,
    Wallet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/shared/QueryError'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { InvoiceStatusBadge, PaymentStatusBadge, SubscriptionStatusBadge } from '@/components/shared/subscription/StatusBadges'
import * as billing from '@/lib/api/billing'
import { cn } from '@/lib/utils'

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

    const paidTotal = useMemo(() => {
        return transactions
            .filter((transaction) => billing.normalizePaymentStatus(transaction.attributes.status) === 'SUCCESSFUL')
            .reduce((total, transaction) => total + Number(transaction.attributes.amount ?? 0), 0)
    }, [transactions])

    if (subscriptionQuery.isLoading) {
        return (
            <div className="space-y-5">
                <Skeleton className="h-44 w-full rounded-lg" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}
                </div>
                <Skeleton className="h-80 rounded-lg" />
            </div>
        )
    }

    if (subscriptionQuery.isError) {
        return <QueryError message="Failed to load subscription overview." onRetry={subscriptionQuery.refetch} />
    }

    const status = billing.normalizeSubscriptionStatus(subscription?.status)
    const vehicleLimit = subscription?.vehicle_limit ?? null
    const vehicleCount = subscription?.vehicle_count ?? 0
    const vehicleUsage = vehicleLimit && vehicleLimit > 0 ? Math.min(100, Math.round((vehicleCount / vehicleLimit) * 100)) : 0
    const capabilities = subscription?.capabilities ?? []

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Billing Center</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Subscription & Billing</h1>
                            <SubscriptionStatusBadge status={status} />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Manage the active plan, billable capacity, invoices, and subscription payments from one tidy workspace.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" className="h-9">
                            <Link href="/subscription/invoices"><FileText className="mr-2 h-4 w-4" /> Invoices</Link>
                        </Button>
                        <Button asChild className="h-9 bg-blue-600 text-white hover:bg-blue-700">
                            <Link href="/subscription/plan">Manage plan <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        {subscription ? (
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Current plan</p>
                                    <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{subscription.plan.name}</h2>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <PlanChip icon={CreditCard} label={`${subscription.billing_cycle} billing`} />
                                        <PlanChip icon={ShieldCheck} label={`${capabilities.length.toLocaleString()} capabilities`} />
                                        <PlanChip icon={Users} label={subscription.user_limit ? `${subscription.user_limit.toLocaleString()} users` : 'Flexible users'} />
                                    </div>
                                </div>
                                <div className="lg:text-right">
                                    <MoneyDisplay value={billing.toMoney(subscription.plan.price, subscription.currency)} className="text-3xl font-semibold tracking-tight text-slate-950" />
                                    <p className="mt-1 text-sm text-slate-500">recurring plan price</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">No subscription found</h2>
                                    <p className="mt-1 text-sm text-slate-500">Choose a plan to activate billing for this organisation.</p>
                                </div>
                                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                                    <Link href="/subscription/plan">Choose plan</Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-sm font-medium text-slate-500">Billable vehicles</p>
                        <div className="mt-2 flex items-end justify-between gap-3">
                            <p className="text-3xl font-semibold tracking-tight text-slate-950">{vehicleCount.toLocaleString()}</p>
                            <p className="text-sm font-medium text-slate-500">{vehicleLimit ? `${vehicleLimit.toLocaleString()} limit` : 'No fixed limit'}</p>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full bg-blue-600" style={{ width: `${vehicleLimit ? vehicleUsage : 100}%` }} />
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            {subscription?.ends_at ? <>Next billing <BillingDateDisplay date={subscription.ends_at} /></> : 'Next billing date is not set'}
                        </p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Metric icon={Wallet} label="Outstanding balance" value={<MoneyDisplay value={billing.toMoney(outstanding, currency)} />} caption={outstanding > 0 ? 'Unpaid invoice total' : 'No unpaid balance'} tone="bg-amber-50 text-amber-700" />
                <Metric icon={Receipt} label="Recent payments" value={<MoneyDisplay value={billing.toMoney(paidTotal, currency)} />} caption={`${transactions.length.toLocaleString()} latest transactions loaded`} tone="bg-emerald-50 text-emerald-700" />
                <Metric icon={CalendarClock} label="Started" value={subscription?.starts_at ? <BillingDateDisplay date={subscription.starts_at} /> : 'Not active'} caption={subscription?.ends_at ? <>Renews <BillingDateDisplay date={subscription.ends_at} /></> : 'Awaiting renewal date'} tone="bg-blue-50 text-blue-700" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="border-0 shadow-none">
                    <CardContent className="p-0">
                        <PanelHeader
                            title="Plan Entitlements"
                            description="Subscription limits and enabled modules from the backend plan record."
                            action={<Button asChild variant="outline" size="sm" className="h-8"><Link href="/subscription/plan">View plans</Link></Button>}
                        />
                        {subscription ? (
                            <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
                                <Detail label="Billing cycle" value={subscription.billing_cycle} />
                                <Detail label="Payment state" value={status.replaceAll('_', ' ')} />
                                <Detail label="Vehicle limit" value={vehicleLimit ? vehicleLimit.toLocaleString() : 'No fixed limit'} />
                                <Detail label="Admin limit" value={subscription.admin_limit ? subscription.admin_limit.toLocaleString() : 'Flexible'} />
                                <div className="rounded-lg bg-slate-50 px-4 py-3 sm:col-span-2">
                                    <p className="text-xs font-medium text-slate-500">Capabilities</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {capabilities.slice(0, 10).map((capability) => (
                                            <span key={capability} className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 shadow-sm">
                                                {String(capability).replaceAll('_', ' ')}
                                            </span>
                                        ))}
                                        {capabilities.length > 10 && (
                                            <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                                                +{capabilities.length - 10} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <EmptyState icon={Layers} title="No entitlements available" description="Plan capabilities will appear here after activation." />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-none">
                    <CardContent className="p-0">
                        <PanelHeader
                            title="Recent Invoices"
                            description="Latest issued billing documents from the invoices endpoint."
                            action={<Button asChild variant="outline" size="sm" className="h-8"><Link href="/subscription/invoices">All invoices</Link></Button>}
                        />
                        <div className="divide-y divide-slate-100">
                            {invoicesQuery.isLoading ? (
                                <LoadingRow />
                            ) : invoicesQuery.isError ? (
                                <ErrorRow message="Failed to load invoices." onRetry={invoicesQuery.refetch} />
                            ) : invoices.length === 0 ? (
                                <EmptyState icon={FileText} title="No invoices yet" description="Invoices will appear here when they are issued." />
                            ) : invoices.map((invoice) => (
                                <Link key={invoice.id} href={`/subscription/invoices/${invoice.id}`} className="grid gap-3 py-3 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">{invoice.invoice_number}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Issued <BillingDateDisplay date={invoice.issued_at} />
                                        </p>
                                    </div>
                                    <MoneyDisplay value={billing.toMoney(invoice.amount_due ?? invoice.total, invoice.currency)} className="text-sm font-semibold text-slate-900" />
                                    <InvoiceStatusBadge status={billing.normalizeInvoiceStatus(invoice.status)} />
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-none">
                <CardContent className="p-0">
                    <PanelHeader
                        title="Recent Payments"
                        description="Transaction status and payment references from the subscription API."
                        action={<Button asChild variant="outline" size="sm" className="h-8"><Link href="/subscription/payments">All payments</Link></Button>}
                    />
                    <div className="divide-y divide-slate-100">
                        {transactionsQuery.isLoading ? (
                            <LoadingRow />
                        ) : transactionsQuery.isError ? (
                            <ErrorRow message="Failed to load payments." onRetry={transactionsQuery.refetch} />
                        ) : transactions.length === 0 ? (
                            <EmptyState icon={Receipt} title="No payments yet" description="Successful and pending payments will be listed here." />
                        ) : transactions.map((transaction) => (
                            <div key={transaction.id} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{transaction.attributes.reference ?? `Transaction ${transaction.id}`}</p>
                                    <p className="mt-1 text-xs text-slate-500">{transaction.relationships?.subscription?.plan?.name ?? 'Subscription payment'}</p>
                                </div>
                                <p className="text-xs text-slate-500">{transaction.attributes.payment_method ?? 'Provider checkout'}</p>
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

function PanelHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-base font-semibold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            {action}
        </div>
    )
}

function PlanChip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <span className="inline-flex h-8 items-center gap-2 rounded-md bg-white px-3 text-xs font-semibold capitalize text-slate-700 shadow-sm">
            <Icon className="h-3.5 w-3.5 text-blue-600" />
            {label}
        </span>
    )
}

function Metric({
    icon: Icon,
    label,
    value,
    caption,
    tone,
}: {
    icon: React.ElementType
    label: string
    value: React.ReactNode
    caption: React.ReactNode
    tone: string
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
                    <div className="mt-1 text-xs text-slate-500">{caption}</div>
                </div>
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', tone)}>
                    <Icon className="h-4 w-4" />
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

function LoadingRow() {
    return (
        <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
    )
}

function ErrorRow({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-700">{message}</p>
            <Button variant="ghost" size="sm" className="mt-2 h-8 text-blue-600 hover:bg-blue-50" onClick={onRetry}>
                <ArrowRight className="mr-1.5 h-3.5 w-3.5 rotate-180" /> Retry
            </Button>
        </div>
    )
}
