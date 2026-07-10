'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, SlidersHorizontal, LineChart, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Granularity = 'Daily' | 'Weekly' | 'Monthly'

function Dropdown({ label, icon: Icon }: { label: string; icon?: typeof Calendar }) {
    return (
        <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
        >
            {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            {label}
            <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
    )
}

export function AnalysisToolbar() {
    const [granularity, setGranularity] = useState<Granularity>('Daily')
    const [view, setView] = useState<'chart' | 'table'>('chart')

    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                >
                    <Calendar className="h-4 w-4 text-slate-400" /> May 1 – May 16, 2024
                </button>
                <Dropdown label="All Groups" />
                <Dropdown label="All Vehicles" />
                <Dropdown label="All Drivers" />
                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                >
                    <SlidersHorizontal className="h-4 w-4 text-slate-400" /> More Filters
                </button>
            </div>

            <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                    {(['Daily', 'Weekly', 'Monthly'] as Granularity[]).map((g) => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => setGranularity(g)}
                            className={cn(
                                'rounded-md px-3 py-1 text-[13px] font-medium transition-colors duration-200',
                                granularity === g ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            {g}
                        </button>
                    ))}
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                    <button
                        type="button"
                        onClick={() => setView('chart')}
                        aria-label="Chart view"
                        className={cn('flex h-7 w-7 items-center justify-center rounded-md', view === 'chart' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600')}
                    >
                        <LineChart className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('table')}
                        aria-label="Table view"
                        className={cn('flex h-7 w-7 items-center justify-center rounded-md', view === 'table' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600')}
                    >
                        <Table2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
