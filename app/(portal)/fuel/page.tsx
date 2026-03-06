'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Fuel, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FuelExpense } from '@/types'

export default function FuelExpensesPage() {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)

    const { data, isLoading } = useQuery({
        queryKey: ['fuel-expenses', { page }],
        queryFn: () => api.getFuelExpenses({ page, per_page: 15 }),
    })

    const { mutate: handleApprove, isPending: isApproving } = useMutation({
        mutationFn: (id: string) => api.approveFuelExpense(id),
        onSuccess: () => {
            toast.success('Fuel expense approved.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
        },
        onError: () => toast.error('Failed to approve expense.')
    })

    const { mutate: handleReject, isPending: isRejecting } = useMutation({
        mutationFn: (id: string) => api.rejectFuelExpense(id, 'Rejected by manager review.'),
        onSuccess: () => {
            toast.success('Fuel expense rejected.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
        },
        onError: () => toast.error('Failed to reject expense.')
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-2 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>
            case 'rejected': return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none px-2 py-0.5"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
            default: return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-2 py-0.5"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Expenses</h1>
                    <p className="text-slate-500 mt-1">Review, approve, and track manual and integrated fuel charges.</p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-200 hover:shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Log Manual Expense
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-semibold">Expense Ledger</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                            <p>Loading expense ledger...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3.5">Date</th>
                                        <th className="px-6 py-3.5">Vehicle / Driver</th>
                                        <th className="px-6 py-3.5 whitespace-nowrap">Volume (L)</th>
                                        <th className="px-6 py-3.5">Cost (₦)</th>
                                        <th className="px-6 py-3.5">Source</th>
                                        <th className="px-6 py-3.5">Status</th>
                                        <th className="px-6 py-3.5 text-right">Approval Workflow</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data?.data?.expenses?.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                        <Fuel className="h-6 w-6 text-slate-400" />
                                                    </div>
                                                    <p className="font-medium text-slate-900">No Expenses Recorded</p>
                                                    <p className="text-sm mt-1">No manual or card-integrated fuel transactions found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.data?.expenses?.map((item: FuelExpense) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                                    {format(new Date(item.attributes.date), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 leading-tight">
                                                        {item.relationships.vehicle.data ? `VID: ${item.relationships.vehicle.data.id}` : 'Unlinked Vehicle'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {item.relationships.driver.data ? `Driver ID: ${item.relationships.driver.data.id}` : 'Unknown Driver'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-700">
                                                    {item.attributes.volume_liters.toFixed(2)} L
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                                    ₦{item.attributes.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={`text-[10px] capitalize tracking-wide ${item.attributes.source === 'card_integration' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600'}`}>
                                                        {item.attributes.source.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(item.attributes.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right align-middle">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {item.attributes.status === 'pending' ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800"
                                                                    onClick={() => handleApprove(item.id)}
                                                                    disabled={isApproving || isRejecting}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800"
                                                                    onClick={() => handleReject(item.id)}
                                                                    disabled={isApproving || isRejecting}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic font-medium px-2">— Actioned —</span>
                                                        )}
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
