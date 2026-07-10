'use client'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import type { DonutSlice } from './useFuelAnalysis'

interface DonutBreakdownCardProps {
    title: string
    total: number
    slices: DonutSlice[]
    /** How to render each legend row's value, e.g. `(s) => \`${s.value} L (${s.percent}%)\``. */
    formatValue: (s: DonutSlice) => string
}

export function DonutBreakdownCard({ title, total, slices, formatValue }: DonutBreakdownCardProps) {
    return (
        <Card className="flex h-full flex-col rounded-2xl border-slate-100 p-5 shadow-none">
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>

            <div className="mt-4 flex flex-1 flex-wrap items-center justify-center gap-5">
                <div className="relative h-[140px] w-[140px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={slices}
                                dataKey="value"
                                innerRadius={46}
                                outerRadius={68}
                                paddingAngle={2}
                                startAngle={90}
                                endAngle={-270}
                                stroke="none"
                                isAnimationActive={false}
                            >
                                {slices.map((s, i) => (
                                    <Cell key={i} fill={s.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold text-slate-900">{total.toLocaleString()}</span>
                        <span className="text-[10px] font-medium text-slate-400">Total</span>
                    </div>
                </div>

                <ul className="min-w-40 flex-1 space-y-2">
                    {slices.map((s) => (
                        <li key={s.label} className="flex items-center justify-between gap-2 text-[12px]">
                            <span className="flex min-w-0 items-center gap-2 text-slate-600">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                                <span className="truncate">{s.label}</span>
                            </span>
                            <span className="shrink-0 whitespace-nowrap font-medium text-slate-500">{formatValue(s)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    )
}
