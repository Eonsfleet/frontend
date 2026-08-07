'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { FileText, Loader2, Download, Eye, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryError } from '@/components/shared/QueryError'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { InvoiceStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import * as api from '@/lib/api/billing-groups'
import type { InvoiceStatus } from '@/types/subscription'

type StatusFilter = 'all' | InvoiceStatus

export default function SubscriptionInvoicesPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

    const { data: invoices, isLoading, isError, refetch } = useQuery({
        queryKey: ['subscription-invoices'],
        queryFn: api.getSubscriptionInvoices,
    })

    const filtered = useMemo(() => {
        if (!invoices) return []
        return statusFilter === 'all' ? invoices : invoices.filter((inv) => inv.status === statusFilter)
    }, [invoices, statusFilter])

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
                <p className="mt-1 text-sm text-slate-500">Review invoices across all billing groups and pay outstanding balances.</p>
            </div>

            <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="h-9 w-44 border-slate-200 text-xs">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ISSUED">Issued</SelectItem>
                        <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                        <SelectItem value="VOID">Void</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                {isError ? (
                    <div className="p-6"><QueryError message="Failed to load invoices." onRetry={refetch} /></div>
                ) : isLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={FileText} title="No invoices found" description="Invoices will appear here once issued for your billing groups." />
                ) : (
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Invoice number</th>
                                        <th className="px-5 py-3.5">Issued date</th>
                                        <th className="px-5 py-3.5">Billing period</th>
                                        <th className="px-5 py-3.5">Due date</th>
                                        <th className="px-5 py-3.5 text-right">Amount</th>
                                        <th className="px-5 py-3.5 text-right">Amount paid</th>
                                        <th className="px-5 py-3.5 text-right">Balance</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-4 font-medium text-slate-800">{invoice.invoiceNumber}</td>
                                            <td className="px-5 py-4"><BillingDateDisplay date={invoice.issuedDate} /></td>
                                            <td className="px-5 py-4 text-slate-600">{invoice.billingPeriod}</td>
                                            <td className="px-5 py-4"><BillingDateDisplay date={invoice.dueDate} /></td>
                                            <td className="px-5 py-4 text-right"><MoneyDisplay value={invoice.amount} /></td>
                                            <td className="px-5 py-4 text-right text-slate-500"><MoneyDisplay value={invoice.amountPaid} /></td>
                                            <td className="px-5 py-4 text-right font-semibold"><MoneyDisplay value={invoice.balance} /></td>
                                            <td className="px-5 py-4"><InvoiceStatusBadge status={invoice.status} /></td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                                                        <Link href={`/subscription/invoices/${invoice.id}`}><Eye className="h-3.5 w-3.5" /> View</Link>
                                                    </Button>
                                                    {invoice.payable && (
                                                        <Button asChild size="sm" className="h-7 gap-1 bg-blue-600 text-xs text-white hover:bg-blue-700">
                                                            <Link href={`/subscription/invoices/${invoice.id}`}><CreditCard className="h-3.5 w-3.5" /> Pay</Link>
                                                        </Button>
                                                    )}
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
