'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Zap, CheckCircle2, History, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/billing'
import { format } from 'date-fns'

export default function BillingOverviewPage() {
    const { data: subscription, isLoading: isSubLoading, isError: isSubError } = useQuery({
        queryKey: ['subscription-current'],
        queryFn: api.getOrganizationSubscription
    })

    const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery({
        queryKey: ['invoices-recent'],
        queryFn: () => api.getInvoices({ page: 1 })
    })

    if (isSubLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (isSubError || !subscription) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold text-slate-900">Failed to load subscription</h2>
                <p className="text-slate-500 max-w-md">There was an error fetching your current billing status. Please try again later.</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    const isUnlimited = subscription.vehicle_limit === null
    const usagePercentage = isUnlimited ? 0 : Math.round((subscription.vehicle_count / (subscription.vehicle_limit as number)) * 100) || 0
    const recentInvoices = invoicesData?.data?.data?.slice(0, 3) || []

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Overview</h1>
                <p className="text-slate-500 mt-1">Manage your organization's active plan, review usage limits, and billing cycles.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-sm border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-70" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            Current Plan
                            {subscription.status === 'active' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-4xl font-extrabold text-slate-900">{subscription.plan.name}</h2>
                                <p className="text-slate-500 mt-1 font-medium capitalize">{subscription.status} Subscription</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" asChild>
                                    <Link href="/billing/upgrade">
                                        <Zap className="mr-2 h-4 w-4" /> Upgrade Plan
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Renewal / Expiry Date</p>
                                <p className="text-lg font-bold text-slate-900">
                                    {subscription.ends_at ? format(new Date(subscription.ends_at), 'MMM dd, yyyy') : 'No Expiry'}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">Started on {format(new Date(subscription.starts_at), 'MMM dd, yyyy')}</p>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-medium text-slate-700">Vehicle Limit</span>
                                    <span className="font-bold text-indigo-600">
                                        {subscription.vehicle_count} / {isUnlimited ? 'Unlimited' : subscription.vehicle_limit}
                                    </span>
                                </div>
                                {!isUnlimited && (
                                    <>
                                        <Progress value={usagePercentage} className="h-2.5 bg-slate-100 [&>div]:bg-indigo-600" />
                                        <p className="text-xs text-slate-500 mt-2">You have used {usagePercentage}% of your active vehicle quota.</p>
                                    </>
                                )}
                                {isUnlimited && (
                                    <p className="text-xs text-slate-500 mt-2">You have no vehicle limits on your current plan.</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 bg-slate-900 text-slate-50 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 flex-1 flex flex-col justify-center py-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-10 bg-slate-100 rounded flex items-center justify-center -rotate-6 shadow">
                                <div className="w-8 h-8 rounded-full bg-red-500 opacity-80 mix-blend-multiply translate-x-2" />
                                <div className="w-8 h-8 rounded-full bg-amber-400 opacity-80 mix-blend-multiply -translate-x-2" />
                            </div>
                            <div>
                                <p className="font-mono text-lg font-medium tracking-widest text-white">•••• 4242</p>
                                <p className="text-sm text-slate-400 mt-0.5">Expires 12/28</p>
                            </div>
                        </div>
                    </CardContent>
                    {/* <div className="p-4 border-t border-slate-800 relative z-10">
                        <Button variant="ghost" className="w-full text-indigo-300 hover:text-indigo-200 hover:bg-slate-800 justify-between">
                            Manage Payment Method <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div> */}
                </Card>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
                    </div>
                    <Button variant="link" className="text-indigo-600 h-auto p-0" asChild>
                        <Link href="/billing/invoices">View all history</Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isInvoicesLoading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3.5">Date</th>
                                    <th className="px-6 py-3.5">Invoice #</th>
                                    <th className="px-6 py-3.5">Amount</th>
                                    <th className="px-6 py-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">{format(new Date(inv.issued_at), 'MMM dd, yyyy')}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{inv.invoice_number}</td>
                                        <td className="px-6 py-4 font-mono font-medium">{inv.currency} {inv.total.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No recent transactions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
