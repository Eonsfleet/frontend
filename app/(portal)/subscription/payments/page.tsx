'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Receipt, Loader2, Eye, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/shared/QueryError'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { PaymentStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import * as api from '@/lib/api/billing-groups'

export default function SubscriptionPaymentsPage() {
    const { data: payments, isLoading, isError, refetch } = useQuery({
        queryKey: ['subscription-payments'],
        queryFn: api.getSubscriptionPayments,
    })

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
                <p className="mt-1 text-sm text-slate-500">Payment history across all invoices. Provider payloads are not exposed here.</p>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                {isError ? (
                    <div className="p-6"><QueryError message="Failed to load payments." onRetry={refetch} /></div>
                ) : isLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : !payments || payments.length === 0 ? (
                    <EmptyState icon={Receipt} title="No payments yet" description="Payments made toward your invoices will appear here." />
                ) : (
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Payment reference</th>
                                        <th className="px-5 py-3.5">Invoice</th>
                                        <th className="px-5 py-3.5">Date</th>
                                        <th className="px-5 py-3.5">Method</th>
                                        <th className="px-5 py-3.5 text-right">Amount</th>
                                        <th className="px-5 py-3.5">Provider</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-4 font-medium text-slate-800">{payment.reference}</td>
                                            <td className="px-5 py-4">
                                                <Link href={`/subscription/invoices/${payment.invoiceNumber}`} className="text-indigo-600 hover:underline">
                                                    {payment.invoiceNumber}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4"><BillingDateDisplay date={payment.date} /></td>
                                            <td className="px-5 py-4 text-slate-600">{payment.method}</td>
                                            <td className="px-5 py-4 text-right"><MoneyDisplay value={payment.amount} /></td>
                                            <td className="px-5 py-4 text-slate-600">{payment.provider}</td>
                                            <td className="px-5 py-4"><PaymentStatusBadge status={payment.status} /></td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"><Eye className="h-3.5 w-3.5" /> View</Button>
                                                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Download className="h-3.5 w-3.5" /> Receipt</Button>
                                                </div>
                                            </td>
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
