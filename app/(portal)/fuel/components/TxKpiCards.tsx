'use client'

import { FuelIcon, DollarSign, Tag, Receipt, Fuel, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TxKpis } from './useFuelTransactions'

interface KpiCardProps {
    title: string
    value: string
    icon: LucideIcon
    iconClass: string
    trend: { value: string; isPositive: boolean; label: string }
}

function KpiCard({ title, value, icon: Icon, iconClass, trend }: KpiCardProps) {
    return (
        <Card className="rounded-2xl border-slate-100 p-3 shadow-none">
            <div className="flex items-center gap-3">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconClass)}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-500">{title}</p>
                    <p className="whitespace-nowrap text-xl font-bold tracking-tight text-slate-900">{value}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium">
                        <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                            {trend.isPositive ? '↑' : '↓'} {trend.value}
                        </span>
                        <span className="truncate text-slate-400">{trend.label}</span>
                    </p>
                </div>
            </div>
        </Card>
    )
}

const fmtNaira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function TxKpiCards({ kpis }: { kpis: TxKpis }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <KpiCard
                title="Total Fuel Purchased"
                value={`${kpis.totalFuelPurchasedLiters.toLocaleString()} L`}
                icon={FuelIcon}
                iconClass="bg-blue-50 text-blue-500"
                trend={{ value: '8.6%', isPositive: true, label: 'vs prev.' }}
            />
            <KpiCard
                title="Total Cost"
                value={fmtNaira(kpis.totalCostNaira)}
                icon={DollarSign}
                iconClass="bg-emerald-50 text-emerald-500"
                trend={{ value: '6.4%', isPositive: true, label: 'vs prev.' }}
            />
            <KpiCard
                title="Avg. Price / Litre"
                value={fmtNaira(kpis.avgPricePerLiter)}
                icon={Tag}
                iconClass="bg-purple-50 text-purple-500"
                trend={{ value: '2.3%', isPositive: false, label: 'vs prev.' }}
            />
            <KpiCard
                title="Total Transactions"
                value={`${kpis.totalTransactions}`}
                icon={Receipt}
                iconClass="bg-orange-50 text-orange-500"
                trend={{ value: '4.8%', isPositive: true, label: 'vs prev.' }}
            />
            <KpiCard
                title="Total Refills"
                value={`${kpis.totalRefills}`}
                icon={Fuel}
                iconClass="bg-blue-50 text-blue-500"
                trend={{ value: '5.1%', isPositive: true, label: 'vs prev.' }}
            />
        </div>
    )
}
