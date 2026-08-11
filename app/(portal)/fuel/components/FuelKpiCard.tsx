'use client'

import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Sparkline } from './Sparkline'

export type KpiAccent = 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'slate'

const ACCENT: Record<KpiAccent, { icon: string; spark: string }> = {
    green: { icon: 'bg-emerald-50 text-emerald-600', spark: '#10b981' },
    blue: { icon: 'bg-blue-50 text-[#0055FF]', spark: '#0055FF' },
    purple: { icon: 'bg-indigo-50 text-indigo-600', spark: '#4f46e5' },
    orange: { icon: 'bg-amber-50 text-amber-600', spark: '#f59e0b' },
    red: { icon: 'bg-rose-50 text-rose-600', spark: '#ef4444' },
    slate: { icon: 'bg-slate-100 text-slate-600', spark: '#64748b' },
}

interface FuelKpiCardProps {
    title: string
    value: string
    icon: LucideIcon
    accent: KpiAccent
    trend?: { value: string; isPositive: boolean; label?: string }
    subtitle?: string
    sparkline?: number[]
}

export function FuelKpiCard({ title, value, icon: Icon, accent, trend, subtitle, sparkline }: FuelKpiCardProps) {
    const a = ACCENT[accent]
    return (
        <Card className="rounded-2xl border-0 bg-white p-5 shadow-none">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-500 truncate">{title}</p>
                    <p className="mt-1 whitespace-nowrap text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                </div>
                <div className={cn('h-12 w-12 shrink-0 rounded-xl flex items-center justify-center', a.icon)}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>

            {trend && (
                <p className="mt-2 flex items-center gap-1 text-xs font-medium">
                    <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {trend.isPositive ? '↑' : '↓'} {trend.value}
                    </span>
                    {trend.label && <span className="truncate text-slate-400">{trend.label}</span>}
                </p>
            )}
            {!trend && subtitle && <p className="mt-2 text-xs font-medium text-slate-400">{subtitle}</p>}

            {sparkline && (
                <div className="mt-3 -mx-1">
                    <Sparkline data={sparkline} color={a.spark} />
                </div>
            )}
        </Card>
    )
}
