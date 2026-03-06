'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Download, BarChart3, TrendingUp, AlertOctagon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'

export default function FuelReportsPage() {
    const { data: theftData, isLoading: isLoadingTheft } = useQuery({
        queryKey: ['fuel-theft-summary'],
        queryFn: () => api.getTheftSummary(),
    })

    const { data: iftaData, isLoading: isLoadingIfta } = useQuery({
        queryKey: ['fuel-ifta-report', { month: '10', year: '2023' }], // Static params for demo purposes
        queryFn: () => api.getIftaReport('10', '2023'),
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance & Reports</h1>
                    <p className="text-slate-500 mt-1">Export IFTA compliance schedules and review fuel consumption analytics.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex-shrink-0 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900">IFTA Compliance Report</CardTitle>
                                    <CardDescription>International Fuel Tax Agreement summaries.</CardDescription>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="h-8">
                                <Download className="w-4 h-4 mr-2" /> Export PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoadingIfta ? (
                            <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Distance Configured</p>
                                        <p className="text-2xl font-bold text-slate-900">142,504 <span className="text-sm font-medium text-slate-500">mi</span></p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Taxable Gallons</p>
                                        <p className="text-2xl font-bold text-slate-900">22,340 <span className="text-sm font-medium text-slate-500">gal</span></p>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-500 bg-blue-50/50 p-3 rounded-md border border-blue-100">
                                    <strong className="text-blue-900">Generated for Q3 2023.</strong> Ensure all trip distance logs are finalized before submitting to your jurisdiction.
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex-shrink-0 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
                                <AlertOctagon className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Theft & Anomaly Summary</CardTitle>
                                <CardDescription>Detected incidents from rapid drops or reconciliation.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoadingTheft ? (
                            <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-rose-600" /></div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-5 h-5 text-rose-600" />
                                        <div>
                                            <p className="text-sm font-bold text-rose-900">Volume Discrepancies</p>
                                            <p className="text-xs text-rose-700 font-medium">Over last 30 days</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-rose-700">4 Instances</p>
                                        <p className="text-xs font-medium text-rose-600 mb-0.5 mt-0.5">~120 Liters Missing</p>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800">
                                    Review Flagged Anomalies
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
