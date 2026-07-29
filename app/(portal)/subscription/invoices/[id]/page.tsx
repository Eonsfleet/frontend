'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, CreditCard, Download, Loader2, CheckCircle2, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/shared/QueryError'
import { InvoiceStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { extractApiError } from '@/lib/utils'
import * as api from '@/lib/api/billing-groups'

export default function SubscriptionInvoiceDetailPage() {
    const params = useParams<{ id: string }>()
    const invoiceId = params.id
    const queryClient = useQueryClient()
    const [verifying, setVerifying] = useState(false)

    const { data: invoice, isLoading, isError, refetch } = useQuery({
        queryKey: ['subscription-invoice', invoiceId],
        queryFn: () => api.getSubscriptionInvoiceDetail(invoiceId),
    })

    const payMutation = useMutation({
        mutationFn: () => api.initiateInvoicePayment(invoiceId),
        onSuccess: () => {
            // Never mark payment successful from a browser redirect alone (spec 11.3) —
            // simulate the provider round trip, then poll the backend for confirmation.
            setVerifying(true)
        },
        onError: (err) => toast.error(extractApiError(err, 'Failed to start payment.')),
    })

    const verifyMutation = useMutation({
        mutationFn: () => api.verifyPayment(invoiceId),
        onSuccess: (res) => {
            if (res.state === 'successful') {
                toast.success('Payment confirmed.')
                queryClient.invalidateQueries({ queryKey: ['subscription-invoice', invoiceId] })
                queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] })
                setVerifying(false)
            }
        },
    })

    useEffect(() => {
        if (!verifying) return
        verifyMutation.mutate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verifying])

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
    }

    if (isError || !invoice) {
        return <QueryError message="Failed to load invoice." onRetry={refetch} />
    }

    return (
        <div className="max-w-4xl space-y-6">
            <Link href="/subscription/invoices" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" /> Invoices
            </Link>

            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoice {invoice.invoiceNumber}</h1>
                    <p className="mt-1 text-sm text-slate-500">{invoice.organizationName} &middot; {invoice.billingPeriod}</p>
                </div>
                <InvoiceStatusBadge status={invoice.status} />
            </div>

            {verifying && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    We are confirming your payment.
                </div>
            )}

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                    <Info label="Issue date" value={<BillingDateDisplay date={invoice.issuedDate} />} />
                    <Info label="Due date" value={<BillingDateDisplay date={invoice.dueDate} />} />
                    <Info label="Currency" value={invoice.amount.currency} />
                    <Info label="Balance due" value={<MoneyDisplay value={invoice.balance} className="font-bold text-slate-900" />} />
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100"><CardTitle className="text-[13px] font-semibold text-slate-700">Line Items</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Description</th>
                                    <th className="px-5 py-3 text-right">Quantity</th>
                                    <th className="px-5 py-3 text-right">Unit price</th>
                                    <th className="px-5 py-3 text-right">Discount</th>
                                    <th className="px-5 py-3 text-right">Tax</th>
                                    <th className="px-5 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.lineItems.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-5 py-3.5 text-slate-700">{item.description}</td>
                                        <td className="px-5 py-3.5 text-right text-slate-600">{item.quantity}</td>
                                        <td className="px-5 py-3.5 text-right"><MoneyDisplay value={item.unitPrice} /></td>
                                        <td className="px-5 py-3.5 text-right"><MoneyDisplay value={item.discount} /></td>
                                        <td className="px-5 py-3.5 text-right"><MoneyDisplay value={item.tax} /></td>
                                        <td className="px-5 py-3.5 text-right font-semibold"><MoneyDisplay value={item.total} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="space-y-2 p-5 text-sm">
                    <Row label="Subtotal" value={<MoneyDisplay value={invoice.subtotal} />} />
                    <Row label="Discount" value={<MoneyDisplay value={invoice.discount} />} />
                    <Row label="Tax" value={<MoneyDisplay value={invoice.tax} />} />
                    <Row label="Amount paid" value={<MoneyDisplay value={invoice.amountPaid} />} />
                    <Row label="Balance due" value={<MoneyDisplay value={invoice.balance} />} bold />
                </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Download invoice</Button>
                {invoice.status === 'PAID' && <Button variant="outline" size="sm" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Download receipt</Button>}
                <Button variant="outline" size="sm" className="gap-2"><Mail className="h-4 w-4" /> Contact support</Button>
                {invoice.payable && (
                    <Button
                        size="sm"
                        className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                        disabled={payMutation.isPending || verifying}
                        onClick={() => payMutation.mutate()}
                    >
                        {(payMutation.isPending || verifying) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Pay now
                    </Button>
                )}
            </div>
        </div>
    )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <div className="mt-1 text-sm text-slate-800">{value}</div>
        </div>
    )
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
    return (
        <div className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
            <span className="text-slate-500">{label}</span>
            <span className={bold ? 'text-base font-bold text-slate-900' : 'text-slate-700'}>{value}</span>
        </div>
    )
}
