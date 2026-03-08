'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Loader2, Plus, Fuel, AlertCircle, CheckCircle2, XCircle,
    Search, Download, CreditCard, Clock, Radio, Wifi, WifiOff, AlertTriangle,
    ShieldAlert, ArrowDownCircle, Wrench, CheckCircle2 as CheckCircleIcon, BarChart3,
    ShieldCheck,
} from 'lucide-react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { getVehicles } from '@/lib/api/vehicles'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { FuelExpense, FuelVehicle, FuelAbnormality } from '@/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { extractApiError } from '@/lib/utils'

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'approved':
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
        case 'rejected':
            return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>
        case 'reimbursed':
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none gap-1"><CreditCard className="w-3 h-3" /> Reimbursed</Badge>
        default:
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><AlertCircle className="w-3 h-3" /> Pending</Badge>
    }
}

// ── Reject reason dialog ─────────────────────────────────────────────────────

const rejectSchema = z.object({ reason: z.string().min(3, 'Please provide a reason.') })

function RejectDialog({ expenseId, onClose }: { expenseId: string | number | null; onClose: () => void }) {
    const queryClient = useQueryClient()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ reason: string }>({
        resolver: zodResolver(rejectSchema),
    })

    const { mutate, isPending } = useMutation({
        mutationFn: ({ reason }: { reason: string }) => api.rejectFuelExpense(expenseId!, reason),
        onSuccess: () => {
            toast.success('Expense rejected.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expense-metrics'] })
            reset()
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    return (
        <Dialog open={!!expenseId} onOpenChange={() => { reset(); onClose() }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                    <div>
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <textarea
                            id="reason"
                            {...register('reason')}
                            rows={3}
                            placeholder="e.g. Receipt not attached."
                            className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                        />
                        {errors.reason && <p className="text-xs text-rose-500 mt-1">{errors.reason.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reject
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Log Expense dialog ───────────────────────────────────────────────────────

const logSchema = z.object({
    vehicle_id: z.string().min(1, 'Vehicle is required'),
    cost_per_volume: z.preprocess((v) => parseFloat(String(v ?? '')), z.number().positive('Enter cost per litre')),
    volume: z.preprocess((v) => parseFloat(String(v ?? '')), z.number().positive('Enter volume')),
    entry_date: z.string().min(1, 'Date is required'),
    purchase_from: z.string().optional(),
    reference_number: z.string().optional(),
})
type LogForm = z.infer<typeof logSchema>

function LogExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const queryClient = useQueryClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { register, handleSubmit, reset, formState: { errors } } = useForm<LogForm>({
        resolver: zodResolver(logSchema) as any,
        defaultValues: { entry_date: format(new Date(), 'yyyy-MM-dd') },
    })

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles', 1, ''],
        queryFn: () => getVehicles({ per_page: 100 }),
        enabled: open,
    })

    const { mutate, isPending } = useMutation({
        mutationFn: (d: LogForm) => api.createFuelExpense({
            vehicle_id: Number(d.vehicle_id),
            user_id: 0,
            cost_per_volume: d.cost_per_volume,
            volume: d.volume,
            entry_date: d.entry_date,
            purchase_from: d.purchase_from,
            reference_number: d.reference_number,
            status: 'pending_approval',
        }),
        onSuccess: () => {
            toast.success('Expense logged successfully.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expense-metrics'] })
            reset()
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    return (
        <Dialog open={open} onOpenChange={() => { reset(); onClose() }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Log Fuel Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Vehicle</Label>
                            <select
                                {...register('vehicle_id')}
                                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Select vehicle...</option>
                                {vehiclesData?.data?.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.attributes.registration_number} — {v.attributes.make} {v.attributes.model}
                                    </option>
                                ))}
                            </select>
                            {errors.vehicle_id && <p className="text-xs text-rose-500 mt-1">{errors.vehicle_id.message}</p>}
                        </div>
                        <div>
                            <Label>Volume (L)</Label>
                            <Input {...register('volume')} type="number" step="0.1" placeholder="e.g. 35.0" className="mt-1.5" />
                            {errors.volume && <p className="text-xs text-rose-500 mt-1">{errors.volume.message}</p>}
                        </div>
                        <div>
                            <Label>Cost per Litre (₦)</Label>
                            <Input {...register('cost_per_volume')} type="number" step="0.01" placeholder="e.g. 765.00" className="mt-1.5" />
                            {errors.cost_per_volume && <p className="text-xs text-rose-500 mt-1">{errors.cost_per_volume.message}</p>}
                        </div>
                        <div>
                            <Label>Date</Label>
                            <Input {...register('entry_date')} type="date" className="mt-1.5" />
                            {errors.entry_date && <p className="text-xs text-rose-500 mt-1">{errors.entry_date.message}</p>}
                        </div>
                        <div>
                            <Label>Reference No. <span className="text-slate-400">(optional)</span></Label>
                            <Input {...register('reference_number')} placeholder="REF-00001" className="mt-1.5" />
                        </div>
                        <div className="col-span-2">
                            <Label>Purchase From <span className="text-slate-400">(optional)</span></Label>
                            <Input {...register('purchase_from')} placeholder="e.g. Total Energy Station VI" className="mt-1.5" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Log Expense
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Supported Vehicles View ──────────────────────────────────────────────────

function FuelGauge({ percent, online }: { percent: number | null; online: boolean }) {
    const size = 100
    const strokeWidth = 10
    const r = (size - strokeWidth) / 2
    const circumference = Math.PI * r
    const progress = percent !== null ? Math.min(Math.max(percent, 0), 100) : 0
    const offset = circumference - (progress / 100) * circumference

    const colour = !online || percent === null ? '#94a3b8' :
        percent > 75 ? '#3b82f6' : percent >= 25 ? '#10b981' :
            percent >= 10 ? '#f59e0b' : '#ef4444'

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
                <path d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} strokeLinecap="round" />
                <path d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`} fill="none" stroke={colour} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="18" fontWeight="700" fill={online && percent !== null ? '#0f172a' : '#94a3b8'}>
                    {online && percent !== null ? `${Math.round(percent)}%` : '—'}
                </text>
            </svg>
        </div>
    )
}

function FuelLevelBadge({ percent }: { percent: number | null }) {
    if (percent === null) return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">No Data</Badge>
    if (percent < 10) return <Badge className="bg-rose-500 text-white border-none text-[10px]">Critical</Badge>
    if (percent < 25) return <Badge className="bg-amber-500 text-white border-none text-[10px]">Low</Badge>
    if (percent > 75) return <Badge className="bg-blue-500 text-white border-none text-[10px]">Full</Badge>
    return <Badge className="bg-emerald-500 text-white border-none text-[10px]">OK</Badge>
}

// ── Abnormality Icon ─────────────────────────────────────────────────────────

function AbnormalityIcon({ type }: { type: string }) {
    switch (type) {
        case 'theft': return <ShieldAlert className="h-4 w-4 text-rose-600" />
        case 'sudden_drop': return <ArrowDownCircle className="h-4 w-4 text-orange-500" />
        case 'low_fuel': return <AlertTriangle className="h-4 w-4 text-amber-500" />
        case 'refuel': return <Fuel className="h-4 w-4 text-blue-500" />
        default: return <Wrench className="h-4 w-4 text-slate-400" />
    }
}

// ── Vehicle Detail Dialog ────────────────────────────────────────────────────

function VehicleDetailDialog({ vehicle, onClose }: { vehicle: any | null; onClose: () => void }) {
    const queryClient = useQueryClient()
    const { data: abnData, isLoading: isLoadingAbn } = useQuery({
        queryKey: ['vehicle-abnormalities', vehicle?.id],
        queryFn: () => api.getVehicleAbnormalities(vehicle!.id, { per_page: 10 }),
        enabled: !!vehicle,
    })

    const { data: historyData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['vehicle-fuel-history', vehicle?.id],
        queryFn: () => api.getVehicleFuelHistory(vehicle!.id),
        enabled: !!vehicle,
    })

    const { mutate: acknowledge } = useMutation({
        mutationFn: (alertId: number) => api.acknowledgeFuelAlert(alertId),
        onSuccess: () => {
            toast.success('Alert acknowledged.')
            queryClient.invalidateQueries({ queryKey: ['vehicle-abnormalities', vehicle?.id] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const { mutate: resolve } = useMutation({
        mutationFn: ({ id, notes }: { id: number; notes: string }) => api.resolveFuelAlert(id, notes),
        onSuccess: () => {
            toast.success('Alert resolved.')
            queryClient.invalidateQueries({ queryKey: ['vehicle-abnormalities', vehicle?.id] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const abnormalities = abnData?.data?.abnormalities ?? []

    return (
        <Dialog open={!!vehicle} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Vehicle Fuel Status:</span>
                        <span className="text-emerald-600">{vehicle?.attributes?.registration_number}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Status</p>
                            <div className="flex items-center gap-1.5">
                                <div className={`h-2 w-2 rounded-full ${vehicle?.attributes?.device_online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="text-sm font-semibold">{vehicle?.attributes?.device_online ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Current Level</p>
                            <p className="text-sm font-semibold">{vehicle?.fuel_level?.fuel_level_percent.toFixed(1)}%</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Liters Remaining</p>
                            <p className="text-sm font-semibold">{vehicle?.fuel_level?.fuel_level_liters.toFixed(1)} L</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Tank Capacity</p>
                            <p className="text-sm font-semibold">{vehicle?.attributes?.fuel_capacity} L</p>
                        </div>
                    </div>

                    {/* History Chart */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Fuel Level History (Last 24h)</h3>
                        <div className="h-64 w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                            ) : historyData?.data?.history?.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={historyData.data.history}>
                                        <defs>
                                            <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="timestamp"
                                            tickFormatter={(str) => format(new Date(str), 'HH:mm')}
                                            fontSize={10}
                                            tick={{ fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            fontSize={10}
                                            tick={{ fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            unit="%"
                                        />
                                        <ChartTooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload
                                                    return (
                                                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-[11px] border border-slate-800">
                                                            <p className="font-bold border-b border-slate-700 pb-1 mb-1">{format(new Date(d.timestamp), 'MMM dd, HH:mm')}</p>
                                                            <p className="flex justify-between gap-4"><span>Level:</span> <span className="font-mono text-emerald-400">{d.fuel_level_percent.toFixed(1)}%</span></p>
                                                            <p className="flex justify-between gap-4"><span>Volume:</span> <span className="font-mono text-emerald-400">{d.fuel_level_liters.toFixed(1)} L</span></p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="fuel_level_percent"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#fuelGradient)"
                                            animationDuration={1000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                                    <Clock className="h-8 w-8 opacity-20" />
                                    <p className="text-xs">No history data available for this vehicle yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Abnormalities</h3>
                        <div className="space-y-2">
                            {isLoadingAbn ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                            ) : abnormalities.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-400">No abnormalities detected recently.</p>
                                </div>
                            ) : (
                                abnormalities.map((abn: any) => (
                                    <div key={abn.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-all shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                                                <AbnormalityIcon type={abn.attributes.type} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 capitalize">{abn.attributes.type.replace('_', ' ')}</p>
                                                <p className="text-[11px] text-slate-400">{format(new Date(abn.attributes.alert_time), 'MMM dd, HH:mm')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${abn.attributes.difference < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                                    {abn.attributes.difference > 0 ? '+' : ''}{abn.attributes.difference.toFixed(1)} {abn.attributes.unit}
                                                </p>
                                                <Badge variant="outline" className="text-[9px] font-bold py-0 h-4">
                                                    {(abn.attributes.confidence * 100).toFixed(0)}% confidence
                                                </Badge>
                                            </div>
                                            {abn.attributes.status === 'active' && (
                                                <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 shadow-sm" onClick={() => acknowledge(abn.id)}>Acknowledge</Button>
                                            )}
                                            {abn.attributes.status === 'acknowledged' && (
                                                <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 shadow-sm bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={() => resolve({ id: abn.id, notes: 'Resolved by fleet manager' })}>Resolve</Button>
                                            )}
                                            {abn.attributes.status === 'resolved' && (
                                                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 mt-2">
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function LiveMonitorView() {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [selectedVehicle, setSelectedVehicle] = useState<FuelVehicle | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['fuel-vehicles', { page, search }],
        queryFn: () => api.getFuelVehicles({ page, per_page: 12, search: search || undefined }),
    })

    const vehicles: FuelVehicle[] = data?.data?.vehicles ?? []
    const pagination = data?.data?.pagination
    const hasAnyVehicle = !isLoading && (vehicles.length > 0 || page > 1 || !!search)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Live Fuel Monitor</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time fuel levels and abnormality detection.</p>
                </div>
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search plate, make, model..."
                        className="pl-9 bg-slate-50 border-slate-200 h-9"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            ) : !hasAnyVehicle ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Radio className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium text-slate-700">No fuel monitoring devices found.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {vehicles.map(v => {
                            const level = v.fuel_level?.fuel_level_percent ?? null
                            const liters = v.fuel_level?.fuel_level_liters ?? null
                            const online = v.attributes.device_online

                            return (
                                <Card
                                    key={v.id}
                                    className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${online ? 'border-slate-200' : 'border-slate-100 opacity-75'}`}
                                    onClick={() => setSelectedVehicle(v)}
                                >
                                    <CardHeader className="pb-2 pt-4 px-4 border-b border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                {online ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-slate-400" />}
                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${online ? 'text-emerald-600' : 'text-slate-400'}`}>{online ? 'Online' : 'Offline'}</span>
                                            </div>
                                            <FuelLevelBadge percent={level} />
                                        </div>
                                        <CardTitle className="text-sm font-bold text-slate-900 mt-1">{v.attributes.registration_number}</CardTitle>
                                        <p className="text-xs text-slate-400">{v.attributes.make} {v.attributes.model}</p>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 pt-3 space-y-3">
                                        <FuelGauge percent={level} online={online} />
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-900">
                                                {liters?.toFixed(1) ?? '—'} L <span className="text-slate-400 font-normal">/ {v.attributes.fuel_capacity} L</span>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {pagination && pagination.last_page > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-slate-500">Page {pagination.current_page} of {pagination.last_page}</p>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                                <Button size="sm" variant="outline" disabled={page >= pagination.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <VehicleDetailDialog vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
        </div>
    )
}

function SectionPlaceholder({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
            <div className="h-16 w-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                <Icon className="h-8 w-8" />
            </div>
            <div className="max-w-sm space-y-1">
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>
            <Button variant="outline" className="mt-2 border-slate-200 shadow-sm">Enable Integration</Button>
        </div>
    )
}

// ── Main Module Page ─────────────────────────────────────────────────────────

export default function FuelModulePage() {
    return (
        <div className="space-y-6">
            <Tabs defaultValue="ledger" className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <TabsList className="bg-transparent h-auto p-0 gap-8">
                        <TabsTrigger value="ledger" className="bg-transparent h-10 px-0 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-emerald-600 data-[state=active]:shadow-none font-bold text-slate-500 data-[state=active]:text-slate-900">
                            Expense Ledger
                        </TabsTrigger>
                        <TabsTrigger value="monitor" className="bg-transparent h-10 px-0 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-emerald-600 data-[state=active]:shadow-none font-bold text-slate-500 data-[state=active]:text-slate-900">
                            Live Monitor
                        </TabsTrigger>
                        <TabsTrigger value="cards" className="bg-transparent h-10 px-0 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-emerald-600 data-[state=active]:shadow-none font-bold text-slate-500 data-[state=active]:text-slate-900">
                            Fuel Cards
                        </TabsTrigger>
                        <TabsTrigger value="reconciliation" className="bg-transparent h-10 px-0 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-emerald-600 data-[state=active]:shadow-none font-bold text-slate-500 data-[state=active]:text-slate-900">
                            Reconciliation
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="bg-transparent h-10 px-0 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-emerald-600 data-[state=active]:shadow-none font-bold text-slate-500 data-[state=active]:text-slate-900">
                            Reports
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="ledger" className="mt-0">
                    <FuelExpensesPage />
                </TabsContent>

                <TabsContent value="monitor" className="mt-0">
                    <LiveMonitorView />
                </TabsContent>

                <TabsContent value="cards" className="mt-0">
                    <SectionPlaceholder
                        title="Fuel Card Management"
                        description="Synchronize fuel card transactions from providers like Total, Oando, and MRS directly into your ledger."
                        icon={CreditCard}
                    />
                </TabsContent>

                <TabsContent value="reconciliation" className="mt-0">
                    <SectionPlaceholder
                        title="Reconciliation Engine"
                        description="Automatically match manual expenses with card transactions and detect volume/price variances."
                        icon={ShieldCheck}
                    />
                </TabsContent>

                <TabsContent value="reports" className="mt-0">
                    <SectionPlaceholder
                        title="Advanced Reporting"
                        description="Access IFTA compliance, theft summaries, and advanced cost analysis reports."
                        icon={BarChart3}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function FuelExpensesPage() {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [rejectId, setRejectId] = useState<string | number | null>(null)
    const [logOpen, setLogOpen] = useState(false)

    const { data, isLoading } = useQuery({
        queryKey: ['fuel-expenses', { page, search, statusFilter, startDate, endDate }],
        queryFn: () => api.getFuelExpenses({
            page,
            per_page: 15,
            q: search || undefined,
            status: statusFilter || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
        }),
    })

    const { data: metricsData } = useQuery({
        queryKey: ['fuel-expense-metrics'],
        queryFn: () => api.getFuelExpenseMetrics(),
    })

    const { mutate: handleApprove, isPending: isApproving } = useMutation({
        mutationFn: (id: string | number) => api.approveFuelExpense(id),
        onSuccess: () => {
            toast.success('Expense approved.')
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expense-metrics'] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const handleExport = async () => {
        try {
            const blob = await api.exportFuelExpenses({
                q: search || undefined,
                status: statusFilter || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `fuel-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast.error('Export failed.')
        }
    }

    const m = metricsData?.data
    const expenses: FuelExpense[] = data?.data?.fuel_expenses ?? []
    const pagination = data?.data?.pagination

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Expenses</h1>
                    <p className="text-slate-500 mt-1">Log, review, and approve manual fuel purchase records.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} className="shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={() => setLogOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Log Expense
                    </Button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Volume</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {m?.total_volume != null ? Number(m.total_volume).toFixed(1) : '—'} <span className="text-sm font-medium text-slate-500">L</span>
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Cost</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {m ? `₦${m.total_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Cost / L</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {m?.average_cost_per_liter != null ? `₦${Number(m.average_cost_per_liter).toFixed(2)}` : '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Approval</p>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-amber-600">{m?.pending_count ?? '—'}</p>
                            {m && m.pending_count > 0 && <Clock className="h-4 w-4 text-amber-500 mb-1" />}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search vehicle, driver, reference..."
                                className="pl-9 bg-slate-50 border-slate-200 h-9"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            />
                        </div>
                        <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
                            <SelectTrigger className="w-44 h-9 bg-slate-50 border-slate-200">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending_approval">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="reimbursed">Reimbursed</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                className="h-9 w-36 bg-slate-50 border-slate-200 text-sm"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                            />
                            <span className="text-slate-400 text-sm">→</span>
                            <Input
                                type="date"
                                className="h-9 w-36 bg-slate-50 border-slate-200 text-sm"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                            />
                        </div>
                        {(search || statusFilter || startDate || endDate) && (
                            <Button
                                variant="ghost" size="sm" className="h-9 text-slate-500"
                                onClick={() => { setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1) }}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Expense table */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
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
                                        <th className="px-6 py-3.5">Vehicle</th>
                                        <th className="px-6 py-3.5">Driver</th>
                                        <th className="px-6 py-3.5 whitespace-nowrap">Vol (L)</th>
                                        <th className="px-6 py-3.5 whitespace-nowrap">Cost (₦)</th>
                                        <th className="px-6 py-3.5">Source</th>
                                        <th className="px-6 py-3.5">Status</th>
                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                        <Fuel className="h-6 w-6 text-slate-400" />
                                                    </div>
                                                    <p className="font-medium text-slate-900">No Expenses Recorded</p>
                                                    <p className="text-sm mt-1">No fuel expenses logged yet. Click &apos;+ Log Expense&apos; to get started.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                                    {format(new Date(item.attributes.entry_date), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 leading-tight">
                                                        {item.relationships.vehicle?.registration_number ?? '—'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {item.relationships.vehicle?.make} {item.relationships.vehicle?.model}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-700">
                                                    {item.relationships.driver?.name ?? '—'}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                                                    {item.attributes.volume.toFixed(2)} L
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                                                    ₦{item.attributes.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={`text-[10px] capitalize tracking-wide ${item.attributes.source === 'card' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600'}`}>
                                                        {item.attributes.source ?? 'manual'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={item.attributes.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {(item.attributes.status === 'pending_approval' || item.attributes.status === 'rejected') ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                                                onClick={() => handleApprove(item.id)}
                                                                disabled={isApproving}
                                                            >
                                                                Approve
                                                            </Button>
                                                            {item.attributes.status === 'pending_approval' && (
                                                                <Button
                                                                    size="sm" variant="outline"
                                                                    className="h-8 border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                                                                    onClick={() => setRejectId(item.id)}
                                                                    disabled={isApproving}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic px-2">
                                                            {item.attributes.approved_at
                                                                ? `Actioned ${format(new Date(item.attributes.approved_at), 'MMM dd')}`
                                                                : '— Actioned —'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                            <p className="text-sm text-slate-500">
                                Page {pagination.current_page} of {pagination.last_page} &nbsp;·&nbsp; {pagination.total} records
                            </p>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                                <Button size="sm" variant="outline" disabled={page >= pagination.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <LogExpenseDialog open={logOpen} onClose={() => setLogOpen(false)} />
            <RejectDialog expenseId={rejectId} onClose={() => setRejectId(null)} />
        </div>
    )
}
