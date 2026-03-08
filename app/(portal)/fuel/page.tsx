'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Fuel, AlertCircle, CheckCircle2, XCircle, Search, Filter, Car } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { getVehicles } from '@/lib/api/vehicles'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FuelExpense, Vehicle } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export default function FuelModulePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Intelligence</h1>
                <p className="text-slate-500 mt-1">Monitor consumption trends, manage expenses, and track real-time fuel levels.</p>
            </div>

            <Tabs defaultValue="ledger" className="space-y-6">
                <TabsList className="bg-slate-100/50 p-1">
                    <TabsTrigger value="ledger" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Expense Ledger</TabsTrigger>
                    <TabsTrigger value="supported" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Supported Vehicles</TabsTrigger>
                </TabsList>

                <TabsContent value="ledger">
                    <FuelExpensesPage />
                </TabsContent>

                <TabsContent value="supported">
                    <SupportedVehiclesView />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function FuelExpensesPage() {
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
        <div className="space-y-4">
            <div className="flex justify-end">
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

function SupportedVehiclesView() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'low' | 'moderate' | 'full'>('all')

    const { data, isLoading } = useQuery({
        queryKey: ['vehicles-supported-fuel'],
        queryFn: () => getVehicles({ per_page: 50 }),
    })

    const supportedVehicles = data?.data?.filter(v =>
        (v.attributes.fuel_sensor_conversion_factor ?? 0) > 0 || v.attributes.fuel_capacity
    ) || []

    const filteredVehicles = supportedVehicles.filter(v => {
        const matchesSearch = v.attributes.registration_number.toLowerCase().includes(search.toLowerCase()) ||
            v.attributes.model.toLowerCase().includes(search.toLowerCase())

        if (statusFilter === 'all') return matchesSearch

        const level = 65 // Placeholder for real level from location sub-resource if not available here
        // Note: In real app, we'd fetch location or use level if embedded
        const status = level < 15 ? 'critical' : level < 30 ? 'low' : level > 90 ? 'full' : 'moderate'
        return matchesSearch && status === statusFilter
    })

    const getStatusBadge = (level: number) => {
        if (level < 15) return <Badge className="bg-rose-500 text-white border-none">Critical</Badge>
        if (level < 30) return <Badge className="bg-amber-500 text-white border-none">Low</Badge>
        if (level > 90) return <Badge className="bg-emerald-500 text-white border-none">Full</Badge>
        return <Badge className="bg-blue-500 text-white border-none">Moderate</Badge>
    }

    const getProgressColor = (level: number) => {
        if (level < 15) return 'bg-rose-500'
        if (level < 30) return 'bg-amber-500'
        if (level > 90) return 'bg-emerald-500'
        return 'bg-blue-500'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search reg or model..."
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="critical">Critical (&lt;15%)</option>
                        <option value="low">Low (&lt;30%)</option>
                        <option value="moderate">Moderate</option>
                        <option value="full">Full (&gt;90%)</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : filteredVehicles.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-2">
                    <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">No Support Vehicles Found</h3>
                    <p className="text-slate-500 mt-1">Try adjusting your filters or ensure vehicles have fuel sensors configured.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVehicles.map(v => {
                        const level = 72 // In a real scenario, this would come from a real-time source or pre-fetched location
                        const capacity = v.attributes.fuel_capacity || 0

                        return (
                            <Card key={v.id} className="group hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md">
                                <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/30">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Car className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-bold truncate">{v.attributes.registration_number}</CardTitle>
                                                <CardDescription className="text-[10px] truncate">{v.attributes.make} {v.attributes.model}</CardDescription>
                                            </div>
                                        </div>
                                        {getStatusBadge(level)}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-500 uppercase tracking-tighter text-[10px]">Fuel Level</span>
                                            <span className="text-slate-900 font-mono">{level}%</span>
                                        </div>
                                        <Progress
                                            value={level}
                                            className="h-2"
                                            // @ts-ignore - custom progress color via tailwind
                                            indicatorClassName={getProgressColor(level)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Current Volume</p>
                                            <p className="text-sm font-bold text-slate-900 font-mono">{((level / 100) * capacity).toFixed(1)} L</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Capacity</p>
                                            <p className="text-sm font-bold text-slate-900 font-mono">{capacity} L</p>
                                        </div>
                                    </div>

                                    <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-bold h-9">
                                        View Full Metrics
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
