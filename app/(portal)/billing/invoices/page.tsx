'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, CheckCircle2, Loader2, AlertCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as api from '@/lib/api/billing'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export default function InvoiceHistoryPage() {
    const [page, setPage] = useState(1)
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)

    const { data: invoicesData, isLoading, isError } = useQuery({
        queryKey: ['invoices', page],
        queryFn: () => api.getInvoices({ page })
    })

    const { data: invoiceDetailData, isLoading: isLoadingDetail } = useQuery({
        queryKey: ['invoice-detail', selectedInvoiceId],
        queryFn: () => api.getInvoiceDetails(selectedInvoiceId!),
        enabled: !!selectedInvoiceId
    })

    const { mutate: downloadPdf, isPending: isDownloading } = useMutation({
        mutationFn: async (invoiceId: number) => {
            const blob = await api.downloadInvoicePdf(invoiceId)
            
            // Create a download link
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `invoice-${invoiceId}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        },
        onSuccess: () => {
            toast.success('Invoice PDF downloaded successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to download PDF')
        }
    })

    const handleDownload = (id: number) => {
        downloadPdf(id)
    }

    const handleViewDetails = (id: number) => {
        setSelectedInvoiceId(id)
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
    const invoiceDetail = invoiceDetailData?.data

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
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 shadow-sm"
                                                    onClick={() => handleViewDetails(invoice.id)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" /> View
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 shadow-sm"
                                                    disabled={!invoice.pdf_available || isDownloading}
                                                    onClick={() => handleDownload(invoice.id)}
                                                >
                                                    {isDownloading ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Download className="w-4 h-4 mr-2" />
                                                    )}
                                                    PDF
                                                </Button>
                                            </div>
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

            {/* Invoice Details Modal */}
            <Dialog open={!!selectedInvoiceId} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Invoice Details</DialogTitle>
                        <DialogDescription>
                            {invoiceDetail && `Invoice ${invoiceDetail.invoice_number}`}
                        </DialogDescription>
                    </DialogHeader>
                    {isLoadingDetail ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : invoiceDetail ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice Number</p>
                                    <p className="text-sm font-medium text-slate-900 mt-1">{invoiceDetail.invoice_number}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</p>
                                    <p className="text-sm font-medium text-slate-900 mt-1">
                                        {format(new Date(invoiceDetail.issued_at), 'MMM dd, yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
                                    <Badge className={`mt-1 border-none px-2 py-0.5 ${invoiceDetail.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {invoiceDetail.status === 'paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                        <span className="capitalize">{invoiceDetail.status}</span>
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</p>
                                    <p className="text-sm font-bold text-slate-900 mt-1">
                                        {invoiceDetail.currency} {invoiceDetail.total.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {invoiceDetail.line_items && invoiceDetail.line_items.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Line Items</p>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Description</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Unit Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {invoiceDetail.line_items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2 text-slate-700">{item.description}</td>
                                                        <td className="px-4 py-2 text-right text-slate-700">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-right font-mono text-slate-700">
                                                            {invoiceDetail.currency} {item.unit_price.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-mono font-medium text-slate-900">
                                                            {invoiceDetail.currency} {item.total.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-200 pt-4 space-y-2">
                                {invoiceDetail.subtotal !== undefined && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Subtotal</span>
                                        <span className="font-mono text-slate-900">
                                            {invoiceDetail.currency} {invoiceDetail.subtotal.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {invoiceDetail.tax !== undefined && invoiceDetail.tax > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Tax</span>
                                        <span className="font-mono text-slate-900">
                                            {invoiceDetail.currency} {invoiceDetail.tax.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {invoiceDetail.discount !== undefined && invoiceDetail.discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Discount</span>
                                        <span className="font-mono text-emerald-600">
                                            -{invoiceDetail.currency} {invoiceDetail.discount.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
                                    <span className="text-slate-900">Total</span>
                                    <span className="font-mono text-slate-900">
                                        {invoiceDetail.currency} {invoiceDetail.total.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedInvoiceId(null)}
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => handleDownload(invoiceDetail.id)}
                                    disabled={!invoiceDetail.pdf_available || isDownloading}
                                >
                                    {isDownloading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Download PDF
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            Failed to load invoice details
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
