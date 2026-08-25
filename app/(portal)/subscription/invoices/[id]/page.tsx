'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Download, Loader2, Mail } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryError } from '@/components/shared/QueryError'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { InvoiceStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { extractApiError } from '@/lib/utils'
import * as billing from '@/lib/api/billing'

export default function SubscriptionInvoiceDetailPage() {
    const params = useParams<{ id: string }>()
    const invoiceId = params.id

    const invoiceQuery = useQuery({
        queryKey: ['subscription-invoice', invoiceId],
        queryFn: () => billing.getInvoiceDetails(invoiceId),
    })

    const invoice = invoiceQuery.data?.data

    const downloadPdf = async () => {
        try {
            const blob = await billing.downloadInvoicePdf(invoiceId)
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `invoice-${invoice?.invoice_number ?? invoiceId}.pdf`
            anchor.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            toast.error(extractApiError(error, 'Failed to download invoice PDF.'))
        }
    }

    if (invoiceQuery.isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
    }

    if (invoiceQuery.isError || !invoice) {
        return <QueryError message="Failed to load invoice." onRetry={invoiceQuery.refetch} />
    }

    const tax = invoice.tax ?? invoice.vat ?? 0
    const amountDue = invoice.amount_due ?? invoice.total
    const paidAmount = Math.max(Number(invoice.total ?? 0) - Number(amountDue ?? 0), 0)

    return (
        <div className="max-w-5xl space-y-6">
            <Link href="/subscription/invoices" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" /> Invoices
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0055FF]">Invoice detail</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{invoice.invoice_number}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {invoice.billing_period_start && invoice.billing_period_end
                            ? <><BillingDateDisplay date={invoice.billing_period_start} /> - <BillingDateDisplay date={invoice.billing_period_end} /></>
                            : 'Billing period not supplied'}
                    </p>
                </div>
                <InvoiceStatusBadge status={billing.normalizeInvoiceStatus(invoice.status)} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Info label="Issued" value={<BillingDateDisplay date={invoice.issued_at} />} />
                <Info label="Currency" value={invoice.currency} />
                <Info label="Total" value={<MoneyDisplay value={billing.toMoney(invoice.total, invoice.currency)} />} />
                <Info label="Balance due" value={<MoneyDisplay value={billing.toMoney(amountDue, invoice.currency)} />} />
            </div>

            <Card className="border-0 shadow-none">
                <CardContent className="p-0">
                    <div className="border-b border-slate-100 py-3">
                        <h2 className="text-base font-semibold text-slate-950">Line Items</h2>
                        <p className="text-sm text-slate-500">The backend-calculated charges that make up this invoice.</p>
                    </div>
                    <div className="overflow-x-auto rounded-lg bg-white">
                        <table className="min-w-[760px] w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-right">Quantity</th>
                                    <th className="px-4 py-3 text-right">Unit price</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(invoice.line_items ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">No line items were returned for this invoice.</td>
                                    </tr>
                                ) : invoice.line_items?.map((item, index) => (
                                    <tr key={`${item.description}-${index}`}>
                                        <td className="px-4 py-3 text-slate-900">{item.description}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right"><MoneyDisplay value={billing.toMoney(item.unit_price, invoice.currency)} /></td>
                                        <td className="px-4 py-3 text-right font-semibold"><MoneyDisplay value={billing.toMoney(item.total, invoice.currency)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-none">
                <CardContent className="space-y-3 rounded-lg bg-white p-5 text-sm">
                    <Row label="Subtotal" value={<MoneyDisplay value={billing.toMoney(invoice.subtotal, invoice.currency)} />} />
                    <Row label={invoice.tax_label ?? 'Tax'} value={<MoneyDisplay value={billing.toMoney(tax, invoice.currency)} />} />
                    <Row label="Discount" value={<MoneyDisplay value={billing.toMoney(invoice.discount, invoice.currency)} />} />
                    <Row label="Credit applied" value={<MoneyDisplay value={billing.toMoney(invoice.credit_applied, invoice.currency)} />} />
                    <Row label="Amount paid" value={<MoneyDisplay value={billing.toMoney(paidAmount, invoice.currency)} />} />
                    <Row label="Balance due" value={<MoneyDisplay value={billing.toMoney(amountDue, invoice.currency)} />} bold />
                </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
                {invoice.pdf_available && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={downloadPdf}>
                        <Download className="h-4 w-4" /> Download PDF
                    </Button>
                )}
                <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href="mailto:support@eonsfleet.com"><Mail className="h-4 w-4" /> Contact finance</a>
                </Button>
            </div>
        </div>
    )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
        </div>
    )
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">{label}</span>
            <span className={bold ? 'text-base font-semibold text-slate-950' : 'text-slate-800'}>{value}</span>
        </div>
    )
}
