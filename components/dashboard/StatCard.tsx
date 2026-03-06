'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        label: string
        isPositive: boolean
    }
    className?: string
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
    return (
        <Card className={cn('overflow-hidden', className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-blue-600" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                {(description || trend) && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        {trend && (
                            <span
                                className={cn(
                                    'font-medium',
                                    trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                                )}
                            >
                                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                            </span>
                        )}
                        <span className="truncate">{trend ? trend.label : description}</span>
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
