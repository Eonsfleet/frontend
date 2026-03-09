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
    stats?: Array<{ label: string, value: number, color?: string }>
    onDrillDown?: () => void
    className?: string
}

export function StatCard({ title, value, icon: Icon, description, trend, stats, onDrillDown, className }: StatCardProps) {
    return (
        <Card className={cn('overflow-hidden hover:shadow-md transition-shadow', className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Icon className="h-4 w-4 text-blue-600" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-slate-900">{value}</div>
                    {trend && (
                        <div className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded-md flex items-center',
                            trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        )}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>

                {stats ? (
                    <div className="mt-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                            {stats.map((s, i) => (
                                <div key={i} className="flex items-center gap-1.5 min-w-0">
                                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.color || "bg-slate-400")} />
                                    <span className="text-[10px] font-bold text-slate-500 truncate">{s.label}: {s.value}</span>
                                </div>
                            ))}
                        </div>
                        {onDrillDown && (
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={onDrillDown}
                                    className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors"
                                >
                                    View Fleet
                                </button>
                                <button className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors">
                                    Map
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    (description || trend) && (
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                            <span className="truncate">{trend ? trend.label : description}</span>
                        </p>
                    )
                )}
            </CardContent>
        </Card>
    )
}
