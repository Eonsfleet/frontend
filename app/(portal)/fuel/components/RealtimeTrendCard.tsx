'use client'

import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { TrendPoint } from './useFuelRealtime'

interface RealtimeTrendCardProps {
    title: string
    unit: string
    data: TrendPoint[]
    color: string
    /** Right-side pills, e.g. vehicle plate + range/Live. */
    filters: string[]
    formatValue: (v: number | null) => string
    filterOptions?: Array<{ label: string; value: string }>
    selectedFilter?: string
    onFilterChange?: (filter: string) => void
    isLoading?: boolean
}

function TrendTooltip({
    active,
    payload,
    label,
    formatValue,
}: {
    active?: boolean
    payload?: Array<{ value: number | null }>
    label?: string
    formatValue: (v: number | null) => string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-medium text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-900">{formatValue(payload[0].value)}</p>
        </div>
    )
}

export function RealtimeTrendCard({ title, unit, data, color, filters, formatValue, filterOptions = [], selectedFilter, onFilterChange, isLoading }: RealtimeTrendCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const gradientId = `rt-trend-${title.replace(/\W/g, '')}`
    const activeFilterLabel = filterOptions.find((option) => option.value === selectedFilter)?.label
    const staticFilters = activeFilterLabel ? [...filters, activeFilterLabel] : filters
    const xAxisInterval = data.length <= 8 ? 0 : data.length <= 24 ? 5 : 6

    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">
                    {title} <span className="font-medium text-slate-400">({unit})</span>
                </h2>
                <div className="flex items-center gap-2">
                    {staticFilters.map((f, index) => {
                        const isFilterButton = index === staticFilters.length - 1 && filterOptions.length > 0 && onFilterChange
                        return (
                            <div key={`${f}-${index}`} className="relative">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                                    onClick={() => isFilterButton && setIsMenuOpen((open) => !open)}
                                >
                                    {f} {isFilterButton && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                                </button>
                                {isFilterButton && isMenuOpen && (
                                    <div className="absolute right-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                        {filterOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className="block w-full px-3 py-1.5 text-left text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                                onClick={() => {
                                                    onFilterChange(option.value)
                                                    setIsMenuOpen(false)
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="relative mt-4 h-44">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 shadow-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            Loading
                        </span>
                    </div>
                )}
                {!isLoading && data.length === 0 && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white">
                        <span className="text-[12px] font-medium text-slate-400">No data available for this period</span>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={xAxisInterval} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                        <Tooltip content={<TrendTooltip formatValue={formatValue} />} cursor={{ stroke: color, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}
