'use client'

import { X, Truck, FuelIcon, MapPin, Loader2 } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { MiniLocationMap } from './MiniLocationMap'
import { SEVERITY_META, type FuelAlertRow, type AlertTrendPoint } from './useFuelAlerts'

interface AlertDetailPanelProps {
    alert: FuelAlertRow | null
    trend: AlertTrendPoint[]
    isTrendLoading?: boolean
    onClose?: () => void
    onAcknowledge?: () => void
    onResolve?: () => void
}

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-100 p-2.5">
            <p className="text-[10px] font-medium text-slate-400">{label}</p>
            <div className="mt-1">{children}</div>
        </div>
    )
}

function TrendTip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-lg">
            <p className="text-[10px] font-medium text-slate-400">{label}</p>
            <p className="text-[12px] font-bold text-slate-900">{payload[0].value} L</p>
        </div>
    )
}

export function AlertDetailPanel({ alert, trend, isTrendLoading, onClose, onAcknowledge, onResolve }: AlertDetailPanelProps) {
    if (!alert) {
        return (
            <Card className="flex h-full items-center justify-center rounded-2xl border-slate-100 p-6 text-center text-sm text-slate-400 shadow-none">
                Select an alert to see details.
            </Card>
        )
    }

    const barColor = alert.fuelPercent <= 20 ? 'bg-rose-500' : alert.fuelPercent <= 40 ? 'bg-amber-500' : 'bg-emerald-500'

    return (
        <Card className="flex flex-col rounded-2xl border-slate-100 p-4 shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                        <FuelIcon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">{alert.title}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', SEVERITY_META[alert.severity].badge)}>
                        {SEVERITY_META[alert.severity].label}
                    </span>
                </div>
                <button type="button" onClick={onClose} aria-label="Close details" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Vehicle card — image | chassis+model | details, all on one row */}
            <div className="mt-3 flex items-center gap-3">
                <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <Truck className="h-7 w-7" />
                </div>
                <div className="min-w-0 shrink-0">
                    <p className="truncate text-sm font-bold text-slate-900">{alert.vehicle}</p>
                    <p className="truncate text-[11px] text-slate-400">{alert.model}</p>
                </div>
                <dl className="min-w-0 flex-1 space-y-0.5 text-[11px]">
                    <div className="flex justify-between gap-2"><dt className="text-slate-400">Driver</dt><dd className="truncate font-medium text-slate-600">{alert.driver}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-400">Group</dt><dd className="truncate font-medium text-slate-600">{alert.group}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="shrink-0 text-slate-400">Last Updated</dt><dd className="truncate font-medium text-slate-600">{alert.lastUpdated}</dd></div>
                </dl>
            </div>

            {/* 3 stat cells */}
            <div className="mt-3 grid grid-cols-3 gap-2">
                <StatCell label="Fuel Level">
                    <p className="text-sm font-bold text-slate-900">{alert.fuelPercent}%</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full', barColor)} style={{ width: `${alert.fuelPercent}%` }} />
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{alert.fuelLiters} L</p>
                </StatCell>
                <StatCell label="Fuel Capacity">
                    <p className="text-sm font-bold text-slate-900">{alert.fuelCapacity} L</p>
                </StatCell>
                <StatCell label="Fuel Consumption">
                    <p className="text-sm font-bold text-slate-900">{alert.consumptionLph} L/h</p>
                </StatCell>
            </div>

            {/* Live location */}
            <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-900">Live Location</h3>
                <div className="mt-2">
                    <MiniLocationMap lat={alert.lat} lng={alert.lng} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {alert.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                    </span>
                </div>
            </div>

            {/* Fuel level trend */}
            <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-900">Fuel Level Trend (Today)</h3>
                <div className="mt-2 h-36">
                    {isTrendLoading ? (
                        <div className="flex h-full items-center justify-center text-slate-300">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : trend.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-[12px] text-slate-400">
                            No trend data for this vehicle.
                        </div>
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="alertTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={2} />
                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={34} />
                            <Tooltip content={<TrendTip />} cursor={{ stroke: '#fca5a5', strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2.5} fill="url(#alertTrend)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    onClick={onAcknowledge}
                    disabled={alert.status !== 'new'}
                    className="h-9 flex-1 rounded-lg bg-blue-600 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                    Acknowledge
                </button>
                <button
                    type="button"
                    onClick={onResolve}
                    disabled={alert.status === 'resolved'}
                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                >
                    Resolve
                </button>
            </div>
        </Card>
    )
}
