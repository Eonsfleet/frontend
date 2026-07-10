'use client'

import { LucideIcon, Timer, Droplets, ShieldCheck, Leaf, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SummaryMetrics as SummaryMetricsData } from './useFuelOverview'

interface CompactCardProps {
    title: string
    value: string
    icon: LucideIcon
    iconClass: string
    trend?: { value: string; isPositive: boolean; label: string }
    subtitle?: string
}

function CompactCard({ title, value, icon: Icon, iconClass, trend, subtitle }: CompactCardProps) {
    return (
        <Card className="rounded-2xl border-slate-100 p-3.5 shadow-none">
            <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconClass)}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-slate-500">{title}</p>
                    <p className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-900">{value}</p>
                </div>
            </div>
            {trend && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium">
                    <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {trend.isPositive ? '↑' : '↓'} {trend.value}
                    </span>
                    <span className="truncate text-slate-400">{trend.label}</span>
                </p>
            )}
            {!trend && subtitle && <p className="mt-1.5 text-[11px] font-medium text-slate-400">{subtitle}</p>}
        </Card>
    )
}

const fmtNaira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function SummaryMetrics({ data }: { data: SummaryMetricsData }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <CompactCard
                title="Idle Fuel Consumption"
                value={`${data.idleFuelLiters.toFixed(2)} L`}
                icon={Timer}
                iconClass="bg-orange-50 text-orange-500"
                trend={{ value: `${data.idleTrend}%`, isPositive: true, label: 'vs prev.' }}
            />
            <CompactCard
                title="Unauthorized Drain"
                value={`${data.unauthorizedDrainAlerts} Alerts`}
                icon={Droplets}
                iconClass="bg-rose-50 text-rose-500"
                trend={{ value: `${Math.abs(data.unauthorizedDrainTrend)}`, isPositive: data.unauthorizedDrainTrend >= 0, label: 'vs prev.' }}
            />
            <CompactCard
                title="Fuel Theft Prevention"
                value={fmtNaira(data.theftPreventionNaira)}
                icon={ShieldCheck}
                iconClass="bg-emerald-50 text-emerald-500"
                subtitle="This Month"
            />
            <CompactCard
                title="CO₂ Emissions Saved"
                value={`${data.co2SavedKg.toLocaleString()} kg`}
                icon={Leaf}
                iconClass="bg-emerald-50 text-emerald-500"
                subtitle="This Month"
            />
            <CompactCard
                title="Total Savings"
                value={fmtNaira(data.totalSavingsNaira)}
                icon={Wallet}
                iconClass="bg-blue-50 text-blue-500"
                trend={{ value: `${data.totalSavingsTrend}%`, isPositive: true, label: 'vs prev.' }}
            />
        </div>
    )
}
