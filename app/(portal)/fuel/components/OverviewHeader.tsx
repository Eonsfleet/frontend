'use client'

import { Calendar, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FuelTabs } from './FuelTabs'

interface OverviewHeaderProps {
    rangeLabel: string
}

export function OverviewHeader({ rangeLabel }: OverviewHeaderProps) {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Management</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Real-time fuel monitoring, analytics and cost management.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                    >
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {rangeLabel}
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none">
                        <SlidersHorizontal className="h-4 w-4" /> Filters
                    </Button>
                </div>
            </div>

            <FuelTabs active="Overview" />
        </div>
    )
}
