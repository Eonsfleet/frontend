'use client'

import { TriangleAlert, FuelIcon, Droplets, Battery, Cpu, Bell, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AlertKpis } from './useFuelAlerts'

interface KpiCardProps {
    title: string
    value: number
    icon: LucideIcon
    iconClass: string
    sub?: string
    trend?: { value: string; isPositive: boolean }
    highlight?: boolean
}

function KpiCard({ title, value, icon: Icon, iconClass, sub, trend, highlight }: KpiCardProps) {
    return (
        <Card
            className={cn(
                'rounded-2xl border-0 p-4 shadow-none',
                highlight ? 'bg-rose-50/70' : 'bg-white',
            )}
        >
            <div className="flex items-start gap-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconClass)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-[12px] font-semibold', highlight ? 'text-rose-600' : 'text-slate-500')}>{title}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                    {trend ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium">
                            <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                                {trend.isPositive ? '↑' : '↓'} {trend.value}
                            </span>
                            <span className="text-slate-400">vs yesterday</span>
                        </p>
                    ) : (
                        sub && <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{sub}</p>
                    )}
                </div>
            </div>
        </Card>
    )
}

function AlertKpiSkeleton() {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-none">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-50" />
        </div>
    )
}

export function AlertKpiCards({ kpis, isLoading }: { kpis: AlertKpis; isLoading?: boolean }) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                {Array.from({ length: 6 }).map((_, i) => <AlertKpiSkeleton key={i} />)}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <KpiCard title="Critical Alerts" value={kpis.critical} icon={TriangleAlert} iconClass="bg-rose-100 text-rose-600" sub="Require immediate attention" highlight />
            <KpiCard title="Low Fuel" value={kpis.lowFuel} icon={FuelIcon} iconClass="bg-amber-50 text-amber-500" sub="Fuel level below threshold" />
            <KpiCard title="Suspected Theft" value={kpis.suspectedTheft} icon={Droplets} iconClass="bg-amber-50 text-amber-500" sub="Unusual fuel drain detected" />
            <KpiCard title="Unauthorized Drain" value={kpis.unauthorizedDrain} icon={Battery} iconClass="bg-blue-50 text-[#0055FF]" sub="Outside idle time drain" />
            <KpiCard title="Fuel Sensor Error" value={kpis.sensorError} icon={Cpu} iconClass="bg-blue-50 text-[#0055FF]" sub="Sensor data issue" />
            <KpiCard title="All Alerts" value={kpis.total} icon={Bell} iconClass="bg-blue-50 text-[#0055FF]" sub="All backend alert logs" />
        </div>
    )
}
