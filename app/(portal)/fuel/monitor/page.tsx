'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Loader2, Search, Radio, Wifi, WifiOff, AlertTriangle,
    ShieldAlert, ArrowDownCircle, Wrench, CheckCircle2 as CheckCircleIcon,
    ShieldCheck, Fuel, Clock, TrendingDown, TrendingUp, GitCompare, Zap,
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
} from 'recharts'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import * as analyticsApi from '@/lib/api/analytics'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { FuelVehicle } from '@/types'
import { extractApiError, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useFuelLiveSync, type FuelLiveOverride } from '../components/useFuelLiveSync'


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

function AbnormalityIcon({ type }: { type: string }) {
    switch (type) {
        case 'theft': return <ShieldAlert className="h-4 w-4 text-rose-600" />
        case 'sudden_drop': return <ArrowDownCircle className="h-4 w-4 text-orange-500" />
        case 'low_fuel': return <AlertTriangle className="h-4 w-4 text-amber-500" />
        case 'refuel': return <Fuel className="h-4 w-4 text-blue-500" />
        default: return <Wrench className="h-4 w-4 text-slate-400" />
    }
}

function VehicleDetailDialog({
    vehicle,
    live,
    onClose,
}: {
    vehicle: FuelVehicle | null
    live: Record<number, FuelLiveOverride>
    onClose: () => void
}) {
    const queryClient = useQueryClient()
    const override = vehicle ? live[Number(vehicle.id)] : undefined
    const isOnline = override?.isOnline ?? vehicle?.attributes?.device_online ?? false
    const levelPercent = override?.fuelPercent ?? vehicle?.fuel_level?.fuel_level_percent ?? null
    const levelLiters = override?.fuelLiters ?? vehicle?.fuel_level?.fuel_level_liters ?? null
    const { data: abnData, isLoading: isLoadingAbn } = useQuery({
        queryKey: ['vehicle-abnormalities', vehicle?.id],
        queryFn: () => api.getVehicleAbnormalities(Number(vehicle!.id), { per_page: 10 }),
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
                                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="text-sm font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Current Level</p>
                            <p className="text-sm font-semibold">{(levelPercent ?? 0).toFixed(1)}%</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Liters Remaining</p>
                            <p className="text-sm font-semibold">{(levelLiters ?? 0).toFixed(1)} L</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Tank Capacity</p>
                            <p className="text-sm font-semibold">{vehicle?.fuel_level?.tank_capacity ?? vehicle?.attributes?.fuel_capacity} L</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Last Updated</p>
                            <p className="text-sm font-semibold">
                                {vehicle?.fuel_level?.last_updated ? format(new Date(vehicle.fuel_level.last_updated), 'MMM d, hh:mm a') : '—'}
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Data Quality</p>
                            <p className="text-sm font-semibold">
                                {vehicle?.fuel_level?.data_quality_score != null ? `${Math.round(vehicle.fuel_level.data_quality_score * 100)}%` : '—'}
                            </p>
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
                                                            <p className="flex justify-between gap-4"><span>Level:</span> <span className="font-mono text-emerald-400">{(d.fuel_level_percent ?? 0).toFixed(1)}%</span></p>
                                                            <p className="flex justify-between gap-4"><span>Volume:</span> <span className="font-mono text-emerald-400">{(d.fuel_level_liters ?? 0).toFixed(1)} L</span></p>
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
                                                    {abn.attributes.difference > 0 ? '+' : ''}{(abn.attributes.difference ?? 0).toFixed(1)} {abn.attributes.unit}
                                                </p>
                                                <Badge variant="outline" className="text-[9px] font-bold py-0 h-4">
                                                    {((abn.attributes.confidence ?? 0) * 100).toFixed(0)}% confidence
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

export default function LiveMonitorPage() {
    const [search, setSearch] = useState('')
    const [selectedVehicle, setSelectedVehicle] = useState<FuelVehicle | null>(null)
    const observerTarget = React.useRef<HTMLDivElement>(null)
    const { token } = useAuthStore()
    const live = useFuelLiveSync()

    const { data: execKpis } = useQuery({
        queryKey: ['fuel-executive-kpis-monitor'],
        queryFn: () => analyticsApi.getFuelExecutiveKpis(),
        enabled: !!token,
        refetchInterval: 60_000,
    })

    const kpis = execKpis ?? null

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ['fuel-vehicles-infinite', search],
        queryFn: ({ pageParam = 1 }) => api.getFuelVehicles({
            page: pageParam,
            per_page: 12,
            search: search || undefined
        }),
        // Baseline REST refresh — this page previously had none at all; the WS
        // overlay (`live`, applied at render below) lowers perceived latency
        // between these polls, same as the Real-time Tracking tab.
        refetchInterval: 15_000,
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
            const current = lastPage.data.pagination.current_page
            const last = lastPage.data.pagination.last_page
            return current < last ? current + 1 : undefined
        },
    })

    const vehicles = data?.pages.flatMap((page: any) => page.data.vehicles) ?? []
    const hasAnyVehicle = vehicles.length > 0 || isLoading || !!search

    // Intersection Observer for Infinite Scroll
    React.useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            { threshold: 0.1 }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Live Fuel Monitor</h1>
                    <p className="text-slate-500 mt-1">Real-time fuel levels and abnormality detection.</p>
                </div>
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search plate, make, model..."
                        className="pl-9 bg-slate-50 border-slate-200 h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Executive KPI Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Fuel Cost This Month */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel Cost (Month)</p>
                            <Fuel className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <p className="text-xl font-black text-slate-900">
                            {kpis?.total_fuel_cost_this_month != null
                                ? `₦${Number(kpis.total_fuel_cost_this_month).toLocaleString()}`
                                : '—'}
                        </p>
                        {kpis?.cost_vs_last_month_percent != null && (
                            <div className={cn(
                                'flex items-center gap-1 mt-1.5',
                                kpis.cost_vs_last_month_percent <= 0 ? 'text-emerald-600' : 'text-rose-600'
                            )}>
                                {kpis.cost_vs_last_month_percent <= 0
                                    ? <TrendingDown className="h-3 w-3" />
                                    : <TrendingUp className="h-3 w-3" />}
                                <span className="text-[10px] font-bold">
                                    {Math.abs(kpis.cost_vs_last_month_percent).toFixed(1)}% vs last month
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Theft Incidents */}
                <Card className={cn(
                    'shadow-sm',
                    kpis?.theft_incidents_this_month > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Theft Incidents</p>
                            <ShieldCheck className={cn('h-3.5 w-3.5', kpis?.theft_incidents_this_month > 0 ? 'text-rose-500' : 'text-emerald-500')} />
                        </div>
                        <p className={cn(
                            'text-xl font-black',
                            kpis?.theft_incidents_this_month > 0 ? 'text-rose-600' : 'text-slate-900'
                        )}>
                            {kpis?.theft_incidents_this_month ?? '—'}
                        </p>
                        {kpis?.theft_vs_last_month_percent != null && (
                            <div className={cn(
                                'flex items-center gap-1 mt-1.5',
                                kpis.theft_vs_last_month_percent <= 0 ? 'text-emerald-600' : 'text-rose-600'
                            )}>
                                {kpis.theft_vs_last_month_percent <= 0
                                    ? <TrendingDown className="h-3 w-3" />
                                    : <TrendingUp className="h-3 w-3" />}
                                <span className="text-[10px] font-bold">
                                    {kpis.theft_vs_last_month_percent === 0
                                        ? 'No change vs last month'
                                        : `${Math.abs(kpis.theft_vs_last_month_percent).toFixed(1)}% vs last month`}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Reconciliation Match Rate */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Rate</p>
                            <GitCompare className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <p className="text-xl font-black text-slate-900">
                            {kpis?.reconciliation_match_rate_percent != null
                                ? `${kpis.reconciliation_match_rate_percent}%`
                                : '—'}
                        </p>
                        {kpis?.unmatched_transactions_count != null && (
                            <p className={cn(
                                'text-[10px] font-bold mt-1.5',
                                kpis.unmatched_transactions_count > 0 ? 'text-amber-600' : 'text-emerald-600'
                            )}>
                                {kpis.unmatched_transactions_count} unmatched transaction{kpis.unmatched_transactions_count !== 1 ? 's' : ''}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Fleet Efficiency */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet Efficiency</p>
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <p className="text-xl font-black text-slate-900">
                            {kpis?.avg_fleet_efficiency_l100 != null
                                ? `${Number(kpis.avg_fleet_efficiency_l100).toFixed(1)} L/100km`
                                : '—'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                            Avg fleet consumption
                        </p>
                    </CardContent>
                </Card>
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
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {vehicles.map((v: FuelVehicle) => {
                            const override = live[Number(v.id)]
                            const level = override?.fuelPercent ?? v.fuel_level?.fuel_level_percent ?? null
                            const liters = override?.fuelLiters ?? v.fuel_level?.fuel_level_liters ?? null
                            const online = override?.isOnline ?? v.attributes.device_online

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
                                                {liters?.toFixed(1) ?? '—'} L <span className="text-slate-400 font-normal">/ {v.fuel_level?.tank_capacity ?? v.attributes.fuel_capacity} L</span>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Infinite Scroll Sentinel */}
                    <div 
                        ref={observerTarget} 
                        className="flex justify-center py-10 border-t border-slate-50"
                    >
                        {isFetchingNextPage ? (
                            <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Syncing Assets...</span>
                            </div>
                        ) : hasNextPage ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Scroll to Load More</span>
                        ) : vehicles.length > 0 ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">End of Fleet</span>
                        ) : null}
                    </div>
                </div>
            )}

            <VehicleDetailDialog vehicle={selectedVehicle} live={live} onClose={() => setSelectedVehicle(null)} />
        </div>
    )
}
