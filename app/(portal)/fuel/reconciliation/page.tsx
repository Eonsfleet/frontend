'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, GitCompare, AlertTriangle, CheckCircle, SearchX } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FuelReconciliationDiscrepancy } from '@/types'

export default function FuelReconciliationPage() {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)

    const { data, isLoading } = useQuery({
        queryKey: ['fuel-discrepancies', { page }],
        queryFn: () => api.getDiscrepancies({ page, per_page: 20 }),
    })

    const { mutate: runEngine, isPending: isRunningEngine } = useMutation({
        mutationFn: () => api.runReconciliationEngine(),
        onSuccess: (res) => {
            toast.success(`Analysis complete. Found ${res.discrepancies_found} anomalies.`)
            queryClient.invalidateQueries({ queryKey: ['fuel-discrepancies'] })
        },
        onError: () => toast.error('Failed to trigger the reconciliation engine.')
    })

    const getVarianceBadge = (percentage: number) => {
        if (percentage > 10) return <Badge variant="destructive" className="bg-rose-100 text-rose-800 hover:bg-rose-100">+{percentage.toFixed(1)}%</Badge>
        if (percentage < -10) return <Badge variant="destructive" className="bg-rose-100 text-rose-800 hover:bg-rose-100">{percentage.toFixed(1)}%</Badge>
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%</Badge>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reconciliation Engine</h1>
                    <p className="text-slate-500 mt-1">Cross-reference fuel card charges against manually logged vehicle expenses.</p>
                </div>
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200"
                    onClick={() => runEngine()}
                    disabled={isRunningEngine}
                >
                    {isRunningEngine ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitCompare className="mr-2 h-4 w-4" />}
                    Run Analysis
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900 flex items-center">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
                            Flagged Discrepancies
                        </CardTitle>
                        <CardDescription className="mt-1">Transactions where billed volume significantly exceeds reported consumption.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                            <p>Loading anomalies...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3.5">Date</th>
                                        <th className="px-6 py-3.5">Vehicle</th>
                                        <th className="px-6 py-3.5">Reported (L)</th>
                                        <th className="px-6 py-3.5">Card Billed (L)</th>
                                        <th className="px-6 py-3.5">Variance</th>
                                        <th className="px-6 py-3.5">Status</th>
                                        <th className="px-6 py-3.5 text-right">Resolution</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data?.data?.discrepancies?.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-emerald-500">
                                                        <CheckCircle className="h-6 w-6" />
                                                    </div>
                                                    <p className="font-medium text-slate-900">No Discrepancies Detected</p>
                                                    <p className="text-sm mt-1">All fuel card transactions match the driver reported logs.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.data?.discrepancies?.map((item: FuelReconciliationDiscrepancy) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                                    {format(new Date(item.attributes.transaction_date), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900">VID: {item.relationships.expense.data?.id || 'Unknown'}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-emerald-700">
                                                    {item.attributes.reported_volume.toFixed(2)} L
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-rose-700">
                                                    {item.attributes.card_billed_volume.toFixed(2)} L
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getVarianceBadge(item.attributes.variance_percentage)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={`text-[10px] capitalize tracking-wide ${item.attributes.status === 'flagged' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600'}`}>
                                                        {item.attributes.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button size="sm" variant="outline" className="h-8">Dispute</Button>
                                                        <Button size="sm" className="h-8 bg-slate-900 text-white hover:bg-slate-800">Resolve</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
