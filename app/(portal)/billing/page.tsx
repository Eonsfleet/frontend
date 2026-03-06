'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Zap, CheckCircle2, History, ArrowRight } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

export default function BillingOverviewPage() {
    // Mocked data for the overview
    const currentPlan = {
        name: 'Growth',
        price: '₦25,000',
        interval: 'month',
        status: 'active',
        nextBillingDate: 'Oct 15, 2024',
        limits: {
            vehicles: { current: 42, max: 100 },
            users: { current: 18, max: 50 }
        }
    }

    const usagePercentage = Math.round((currentPlan.limits.vehicles.current / currentPlan.limits.vehicles.max) * 100)

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
                            {currentPlan.status === 'active' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-4xl font-extrabold text-slate-900">{currentPlan.name}</h2>
                                <p className="text-slate-500 mt-1 font-medium">{currentPlan.price} / {currentPlan.interval}</p>
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
                                <p className="text-sm font-medium text-slate-500 mb-1">Next Billing Date</p>
                                <p className="text-lg font-bold text-slate-900">{currentPlan.nextBillingDate}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Card ending in •••• 4242</p>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-medium text-slate-700">Vehicle Limit</span>
                                    <span className="font-bold text-indigo-600">{currentPlan.limits.vehicles.current} / {currentPlan.limits.vehicles.max}</span>
                                </div>
                                <Progress value={usagePercentage} className="h-2.5 bg-slate-100 [&>div]:bg-indigo-600" />
                                <p className="text-xs text-slate-500 mt-2">You have used {usagePercentage}% of your active vehicle quota.</p>
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
                    <div className="p-4 border-t border-slate-800 relative z-10">
                        <Button variant="ghost" className="w-full text-indigo-300 hover:text-indigo-200 hover:bg-slate-800 justify-between">
                            Manage Payment Method <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
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
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3.5">Date</th>
                                <th className="px-6 py-3.5">Description</th>
                                <th className="px-6 py-3.5">Amount</th>
                                <th className="px-6 py-3.5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">Sep 15, 2024</td>
                                <td className="px-6 py-4 font-medium text-slate-900">Growth Plan - Monthly Subscription</td>
                                <td className="px-6 py-4 font-mono font-medium">₦25,000</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">Paid</span>
                                </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">Aug 15, 2024</td>
                                <td className="px-6 py-4 font-medium text-slate-900">Growth Plan - Monthly Subscription</td>
                                <td className="px-6 py-4 font-mono font-medium">₦25,000</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">Paid</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
