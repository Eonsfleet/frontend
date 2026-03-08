'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, CheckCircle2, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/billing'
import { format } from 'date-fns'

export default function InvoiceHistoryPage() {
    const [page, setPage] = useState(1)

    const { data: invoicesData, isLoading, isError } = useQuery({
        queryKey: ['invoices', page],
        queryFn: () => api.getInvoices({ page })
    })

    const handleDownload = (id: number) => {
        const url = api.getInvoicePdfUrl(id)
        window.open(url, '_blank')
    }

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (isError || !invoicesData) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold text-slate-900">Failed to load invoices</h2>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    const invoices = invoicesData.data.data
    const meta = invoicesData.data.meta

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoice History</h1>
                <p className="text-slate-500 mt-1">Review past payments, download PDF statements, and track your billing ledger.</p>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Billing Statements
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3.5">Invoice ID</th>
                                    <th className="px-6 py-3.5">Date</th>
                                    <th className="px-6 py-3.5">Amount</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-indigo-600 whitespace-nowrap">
                                            {invoice.invoice_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                            {format(new Date(invoice.issued_at), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                            {invoice.currency} {invoice.total.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={`border-none px-2 py-0.5 pointer-events-none ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {invoice.status === 'paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                <span className="capitalize">{invoice.status}</span>
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 shadow-sm"
                                                disabled={!invoice.pdf_available}
                                                onClick={() => handleDownload(invoice.id)}
                                            >
                                                <Download className="w-4 h-4 mr-2" /> PDF
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                            No billing statements found for this organization.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {meta.last_page > 1 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <p className="text-xs text-slate-500">Page {page} of {meta.last_page}</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === meta.last_page}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
