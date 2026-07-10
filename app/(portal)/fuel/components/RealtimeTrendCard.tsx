'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { TrendPoint } from './useFuelRealtime'

interface RealtimeTrendCardProps {
    title: string
    unit: string
    data: TrendPoint[]
    color: string
    /** Right-side pills, e.g. vehicle plate + range/Live. */
    filters: string[]
    formatValue: (v: number) => string
}

function TrendTooltip({
    active,
    payload,
    label,
    formatValue,
}: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
    formatValue: (v: number) => string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-medium text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-900">{formatValue(payload[0].value)}</p>
        </div>
    )
}

export function RealtimeTrendCard({ title, unit, data, color, filters, formatValue }: RealtimeTrendCardProps) {
    const gradientId = `rt-trend-${title.replace(/\W/g, '')}`
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">
                    {title} <span className="font-medium text-slate-400">({unit})</span>
                </h2>
                <div className="flex items-center gap-2">
                    {filters.map((f) => (
                        <button
                            key={f}
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                        >
                            {f} <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={5} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                        <Tooltip content={<TrendTooltip formatValue={formatValue} />} cursor={{ stroke: color, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}
