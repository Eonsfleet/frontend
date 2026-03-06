'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function InvoiceHistoryPage() {
    // Mocked data for invoices
    const invoices = [
        { id: 'INV-2024-009', date: 'Sep 15, 2024', amount: 25000, status: 'paid', description: 'Growth Plan - Monthly Subscription' },
        { id: 'INV-2024-008', date: 'Aug 15, 2024', amount: 25000, status: 'paid', description: 'Growth Plan - Monthly Subscription' },
        { id: 'INV-2024-007', date: 'Jul 15, 2024', amount: 25000, status: 'paid', description: 'Growth Plan - Monthly Subscription' },
        { id: 'INV-2024-006', date: 'Jun 15, 2024', amount: 10000, status: 'paid', description: 'Starter Plan - Monthly Subscription' },
    ]

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
                                    <th className="px-6 py-3.5">Description</th>
                                    <th className="px-6 py-3.5">Amount</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-indigo-600 whitespace-nowrap">
                                            {invoice.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                            {invoice.date}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900">
                                            {invoice.description}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                            ₦{invoice.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none px-2 py-0.5 pointer-events-none">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="outline" size="sm" className="h-8 shadow-sm">
                                                <Download className="w-4 h-4 mr-2" /> PDF
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
