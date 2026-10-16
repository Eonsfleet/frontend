'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryError } from '@/components/shared/QueryError'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { PaymentStatusBadge } from '@/components/shared/subscription/StatusBadges'
import * as billing from '@/lib/api/billing'
import type { PaymentStatus } from '@/types/subscription'

type StatusFilter = 'all' | PaymentStatus

const API_STATUS: Partial<Record<PaymentStatus, string>> = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCESSFUL: 'successful',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded',
}

export default function SubscriptionPaymentsPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

    const transactionsQuery = useQuery({
        queryKey: ['subscription-transactions', statusFilter],
        queryFn: () => billing.getSubscriptionTransactions({
            page: 1,
            per_page: 50,
            status: statusFilter === 'all' ? undefined : API_STATUS[statusFilter],
        }),
    })

    const transactions = useMemo(() => transactionsQuery.data?.data.data ?? [], [transactionsQuery.data])
    const summary = useMemo(() => {
        const successful = transactions.filter((item) => billing.normalizePaymentStatus(item.attributes.status) === 'SUCCESSFUL')
        return {
            count: transactionsQuery.data?.data.meta.total ?? transactions.length,
            successful: successful.length,
            amount: successful.reduce((sum, item) => sum + Number(item.attributes.amount ?? 0), 0),
            currency: transactions[0]?.attributes.currency ?? 'NGN',
        }
    }, [transactions, transactionsQuery.data?.data.meta.total])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0055FF]">Payment ledger</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Payments</h1>
                    <p className="mt-1 text-sm text-slate-500">Track subscription payment references, methods, provider status, and settlement dates.</p>
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger className="h-9 w-48 bg-white text-xs">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="SUCCESSFUL">Successful</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                        <SelectItem value="PARTIALLY_REFUNDED">Partially refunded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Summary label="Transactions" value={summary.count.toLocaleString()} />
                <Summary label="Successful" value={summary.successful.toLocaleString()} />
                <Summary label="Settled amount" value={<MoneyDisplay value={billing.toMoney(summary.amount, summary.currency)} />} />
            </div>

            <Card className="border-0 shadow-none">
                {transactionsQuery.isError ? (
                    <div className="p-6"><QueryError message="Failed to load payments." onRetry={transactionsQuery.refetch} /></div>
                ) : transactionsQuery.isLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : transactions.length === 0 ? (
                    <EmptyState icon={Receipt} title="No payments found" description="Subscription payment records will appear here after payment initialization or settlement." />
                ) : (
                    <CardContent className="p-0">
                        <div className="overflow-x-auto rounded-lg bg-white">
                            <table className="min-w-[860px] w-full text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Reference</th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Method</th>
                                        <th className="px-4 py-3">Created</th>
                                        <th className="px-4 py-3">Paid</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3 font-medium text-slate-950">{transaction.attributes.reference ?? `TX-${transaction.id}`}</td>
                                            <td className="px-4 py-3 text-slate-600">{transaction.relationships?.subscription?.plan?.name ?? 'Subscription'}</td>
                                            <td className="px-4 py-3 capitalize text-slate-600">{transaction.attributes.payment_method ?? 'Not supplied'}</td>
                                            <td className="px-4 py-3"><BillingDateDisplay date={transaction.attributes.created_at} /></td>
                                            <td className="px-4 py-3">{transaction.attributes.paid_at ? <BillingDateDisplay date={transaction.attributes.paid_at} /> : 'Not paid'}</td>
                                            <td className="px-4 py-3 text-right font-semibold"><MoneyDisplay value={billing.toMoney(transaction.attributes.amount, transaction.attributes.currency)} /></td>
                                            <td className="px-4 py-3"><PaymentStatusBadge status={billing.normalizePaymentStatus(transaction.attributes.status)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
        </div>
    )
}
