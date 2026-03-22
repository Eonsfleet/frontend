'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { Calendar, Download, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as reportsApi from '@/lib/api/reports'
import { toast } from 'sonner'

const FILTER_OPTIONS = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
]

interface AnalyticsFilterBarProps {
    reportType?: string          // if provided, shows export button
    defaultFilter?: string
}

function FilterBarInner({ reportType, defaultFilter = '30d' }: AnalyticsFilterBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentFilter = searchParams.get('filter') ?? defaultFilter

    const updateFilter = (filter: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('filter', filter)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
        if (!reportType) return
        try {
            toast.loading('Preparing export...')
            const blob = await reportsApi.exportReport({ report_type: reportType, format, filter: currentFilter as any })
            const ext = format === 'excel' ? 'xlsx' : format
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${reportType}-${currentFilter}.${ext}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.dismiss()
            toast.success('Export downloaded')
        } catch {
            toast.dismiss()
            toast.error('Export failed')
        }
    }

    return (
        <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 shadow-sm">
            {/* Period tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                <Calendar className="h-3 w-3 text-slate-400 ml-1.5 mr-0.5" />
                {FILTER_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => updateFilter(opt.value)}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                            currentFilter === opt.value
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'text-slate-400 hover:text-slate-600'
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                {FILTER_OPTIONS.find(o => o.value === currentFilter)?.label === '7D' ? 'Last 7 Days'
                    : currentFilter === '30d' ? 'Last 30 Days'
                    : currentFilter === '90d' ? 'Last 90 Days'
                    : 'Last 12 Months'}
            </span>

            {/* Export buttons */}
            {reportType && (
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => handleExport('excel')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all"
                    >
                        <Download className="h-3 w-3" />
                        Excel
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all"
                    >
                        <Download className="h-3 w-3" />
                        PDF
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-all"
                    >
                        <Download className="h-3 w-3" />
                        CSV
                    </button>
                </div>
            )}
        </div>
    )
}

export function AnalyticsFilterBar(props: AnalyticsFilterBarProps) {
    return (
        <Suspense fallback={
            <div className="p-3 bg-white border border-slate-200 rounded-2xl h-12 animate-pulse shadow-sm" />
        }>
            <FilterBarInner {...props} />
        </Suspense>
    )
}

// Hook for pages to read current filter from URL
export function useAnalyticsFilter(defaultFilter: string = '30d') {
    const searchParams = useSearchParams()
    return (searchParams.get('filter') ?? defaultFilter) as '7d' | '30d' | '90d' | '1y'
}
