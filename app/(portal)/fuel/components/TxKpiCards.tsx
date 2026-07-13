'use client'

import { FuelIcon, DollarSign, Tag, Receipt, Clock, TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TxKpis, TxKpiTrend } from './useFuelTransactions'

interface KpiCardProps {
    title: string
    value: string
    icon: LucideIcon
    iconClass: string
    /** Optional caption shown beneath the value. */
    sub?: string
    trend?: TxKpiTrend
}

function TrendBadge({ trend }: { trend: TxKpiTrend }) {
    if (trend.trend === 'neutral' || trend.changePercent === 0) {
        return <span className="text-[11px] font-medium text-slate-400">No change vs previous period</span>
    }
    const isUp = trend.trend === 'up'
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.changePercent).toFixed(1)}% vs previous period
        </span>
    )
}

function KpiCard({ title, value, icon: Icon, iconClass, sub, trend }: KpiCardProps) {
    return (
        <Card className="rounded-2xl border-slate-100 p-3 shadow-none">
            <div className="flex items-center gap-3">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconClass)}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-500">{title}</p>
                    <p className="whitespace-nowrap text-xl font-bold tracking-tight text-slate-900">{value}</p>
                    {sub && <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{sub}</p>}
                    {trend && <div className="mt-0.5">{<TrendBadge trend={trend} />}</div>}
                </div>
            </div>
        </Card>
    )
}

const fmtNaira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function KpiCardSkeleton() {
    return (
        <Card className="rounded-2xl border-slate-100 p-3 shadow-none">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-2.5 w-16 animate-pulse rounded bg-slate-100" />
                </div>
            </div>
        </Card>
    )
}

export function TxKpiCards({ kpis, isLoading }: { kpis: TxKpis; isLoading?: boolean }) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                {Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <KpiCard
                title="Total Fuel Purchased"
                value={`${kpis.totalFuelPurchasedLiters.toLocaleString()} L`}
                icon={FuelIcon}
                iconClass="bg-blue-50 text-blue-500"
                sub={`${kpis.totalRefills} refills`}
                trend={kpis.trends?.totalFuelPurchased}
            />
            <KpiCard
                title="Total Cost"
                value={fmtNaira(kpis.totalCostNaira)}
                icon={DollarSign}
                iconClass="bg-emerald-50 text-emerald-500"
                trend={kpis.trends?.totalCost}
            />
            <KpiCard
                title="Avg. Price / Litre"
                value={fmtNaira(kpis.avgPricePerLiter)}
                icon={Tag}
                iconClass="bg-purple-50 text-purple-500"
                trend={kpis.trends?.avgPricePerLiter}
            />
            <KpiCard
                title="Total Transactions"
                value={`${kpis.totalTransactions}`}
                icon={Receipt}
                iconClass="bg-orange-50 text-orange-500"
                trend={kpis.trends?.totalTransactions}
            />
            <KpiCard
                title="Pending Approval"
                value={`${kpis.pendingApprovalCount}`}
                icon={Clock}
                iconClass="bg-amber-50 text-amber-500"
                trend={kpis.trends?.pendingApproval}
            />
        </div>
    )
}
