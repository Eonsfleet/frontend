'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Download, Eye, FileText, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryError } from '@/components/shared/QueryError'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { InvoiceStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import * as billing from '@/lib/api/billing'
import type { InvoiceStatus } from '@/types/subscription'

type StatusFilter = 'all' | InvoiceStatus

const API_STATUS: Partial<Record<InvoiceStatus, string>> = {
    DRAFT: 'draft',
    ISSUED: 'issued',
    PARTIALLY_PAID: 'partially_paid',
    PAID: 'paid',
    OVERDUE: 'overdue',
    VOID: 'void',
    CANCELLED: 'cancelled',
}

export default function SubscriptionInvoicesPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

    const invoicesQuery = useQuery({
        queryKey: ['subscription-invoices', statusFilter],
        queryFn: () => billing.getInvoices({
            page: 1,
            per_page: 50,
            status: statusFilter === 'all' ? undefined : API_STATUS[statusFilter],
        }),
    })

    const invoices = useMemo(() => invoicesQuery.data?.data.data ?? [], [invoicesQuery.data])
    const summary = useMemo(() => {
        const total = invoices.reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0)
        const balance = invoices.reduce((sum, invoice) => sum + Number(invoice.amount_due ?? 0), 0)
        return { total, balance, currency: invoices[0]?.currency ?? 'NGN' }
    }, [invoices])

    const downloadPdf = async (invoiceId: number) => {
        const blob = await billing.downloadInvoicePdf(invoiceId)
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `invoice-${invoiceId}.pdf`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0055FF]">Billing documents</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Invoices</h1>
                    <p className="mt-1 text-sm text-slate-500">Review issued invoices, balances, billing periods, and downloadable PDFs.</p>
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger className="h-9 w-48 bg-white text-xs">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ISSUED">Issued</SelectItem>
                        <SelectItem value="PARTIALLY_PAID">Partially paid</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                        <SelectItem value="VOID">Void</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Summary label="Invoices" value={(invoicesQuery.data?.data.meta.total ?? invoices.length).toLocaleString()} />
                <Summary label="Total billed" value={<MoneyDisplay value={billing.toMoney(summary.total, summary.currency)} />} />
                <Summary label="Outstanding" value={<MoneyDisplay value={billing.toMoney(summary.balance, summary.currency)} />} />
            </div>

            <Card className="border-0 shadow-none">
                {invoicesQuery.isError ? (
                    <div className="p-6"><QueryError message="Failed to load invoices." onRetry={invoicesQuery.refetch} /></div>
                ) : invoicesQuery.isLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : invoices.length === 0 ? (
                    <EmptyState icon={FileText} title="No invoices found" description="Invoices will appear here once they are issued by the backend." />
                ) : (
                    <CardContent className="p-0">
                        <div className="overflow-x-auto rounded-lg bg-white">
                            <table className="min-w-[980px] w-full text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Invoice</th>
                                        <th className="px-4 py-3">Issued</th>
                                        <th className="px-4 py-3">Billing period</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                        <th className="px-4 py-3 text-right">Tax</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3 font-medium text-slate-950">{invoice.invoice_number}</td>
                                            <td className="px-4 py-3"><BillingDateDisplay date={invoice.issued_at} /></td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {invoice.billing_period_start && invoice.billing_period_end
                                                    ? <><BillingDateDisplay date={invoice.billing_period_start} /> - <BillingDateDisplay date={invoice.billing_period_end} /></>
                                                    : 'Not available'}
                                            </td>
                                            <td className="px-4 py-3 text-right"><MoneyDisplay value={billing.toMoney(invoice.subtotal, invoice.currency)} /></td>
                                            <td className="px-4 py-3 text-right"><MoneyDisplay value={billing.toMoney(invoice.tax ?? invoice.vat, invoice.currency)} /></td>
                                            <td className="px-4 py-3 text-right font-semibold"><MoneyDisplay value={billing.toMoney(invoice.total, invoice.currency)} /></td>
                                            <td className="px-4 py-3 text-right font-semibold"><MoneyDisplay value={billing.toMoney(invoice.amount_due, invoice.currency)} /></td>
                                            <td className="px-4 py-3"><InvoiceStatusBadge status={billing.normalizeInvoiceStatus(invoice.status)} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View invoice">
                                                        <Link href={`/subscription/invoices/${invoice.id}`}><Eye className="h-4 w-4" /></Link>
                                                    </Button>
                                                    {invoice.pdf_available && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Download PDF" onClick={() => downloadPdf(invoice.id)}>
                                                            <Download className="h-4 w-4" />
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

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
        </div>
    )
}
