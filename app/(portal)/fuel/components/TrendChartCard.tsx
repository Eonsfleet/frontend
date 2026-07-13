'use client'

import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { TrendPoint } from './useFuelOverview'

export interface TrendFilterOption {
    label: string
    value: string
}

interface TrendChartCardProps {
    title: string
    data: TrendPoint[]
    color: string
    /** Formats the tooltip value, e.g. `(v) => \`${v} L\``. */
    formatValue: (v: number) => string
    filter?: string
    filterOptions?: TrendFilterOption[]
    onFilterChange?: (filter: string) => void
    granularity?: string
    isLoading?: boolean
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

export function TrendChartCard({ title, data, color, formatValue, filter, filterOptions = [], onFilterChange, granularity, isLoading }: TrendChartCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const gradientId = `trend-${title.replace(/\W/g, '')}`
    const activeFilterLabel = filterOptions.find((option) => option.value === filter)?.label ?? granularity ?? filterOptions[0]?.label ?? 'Filter'
    const canFilter = filterOptions.length > 0 && onFilterChange != null

    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                <div className="relative">
                    <button
                        type="button"
                        aria-expanded={isMenuOpen}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                        onClick={() => canFilter && setIsMenuOpen((open) => !open)}
                    >
                        {activeFilterLabel} <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    {canFilter && isMenuOpen && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            {filterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className="block w-full px-3 py-1.5 text-left text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                    onClick={() => {
                                        onFilterChange?.(option.value)
                                        setIsMenuOpen(false)
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="relative mt-4 h-56">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 shadow-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            Loading
                        </span>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={false}
                            interval={Math.max(0, Math.ceil(data.length / 6) - 1)}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={false}
                            width={44}
                        />
                        <Tooltip content={<TrendTooltip formatValue={formatValue} />} cursor={{ stroke: color, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2.5}
                            fill={`url(#${gradientId})`}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}
