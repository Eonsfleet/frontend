'use client'

import React, { ReactNode, useState } from 'react'
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useVehiclesDropdown } from '@/hooks/useVehiclesDropdown'
import { exportTelemetryReport, type LitresSource, type ReportFilters, type ReportMeta } from '@/lib/api/telemetryReports'
import { dash, formatDate, formatNumber } from './format'
import { useReportFilters } from './useReportFilters'

const PERIODS = [
    { value: '1d', label: 'Today' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '60d', label: '60D' },
]

/**
 * Period (or a custom date range), vehicle, and export, for every telemetry
 * report. Children are report-specific filters, shown on the same bar.
 */
export function ReportToolbar({ reportType, children, showVehicle = true, exportExtra }: {
    reportType?: string
    children?: ReactNode
    showVehicle?: boolean
    exportExtra?: Record<string, unknown>
}) {
    const { filters, set, value } = useReportFilters()
    const { data: vehicles } = useVehiclesDropdown(showVehicle)
    const [exporting, setExporting] = useState(false)
    const custom = Boolean(value('start_date'))

    const runExport = async (format: 'csv' | 'excel' | 'pdf') => {
        if (!reportType) return
        setExporting(true)
        try {
            await exportTelemetryReport(reportType, format, { ...filters, ...exportExtra })
            toast.success('Export downloaded')
        } catch {
            toast.error('Export failed')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 shadow-sm">
            <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                <Calendar className="h-3 w-3 text-slate-400 ml-1.5 mr-0.5" />
                {PERIODS.map(p => (
                    <button
                        key={p.value}
                        onClick={() => set({ filter: p.value, start_date: null, end_date: null })}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                            !custom && filters.filter === p.value ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-400 hover:text-slate-600',
                        )}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-1 text-xs">
                <input
                    type="date"
                    aria-label="From"
                    value={value('start_date') ?? ''}
                    onChange={e => set({ start_date: e.target.value || null, end_date: value('end_date') ?? e.target.value, filter: null })}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                    type="date"
                    aria-label="To"
                    value={value('end_date') ?? ''}
                    onChange={e => set({ end_date: e.target.value || null, filter: null })}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
                />
            </div>
            {showVehicle && (
                <select
                    aria-label="Vehicle"
                    value={value('vehicle_id') ?? ''}
                    onChange={e => set({ vehicle_id: e.target.value || null })}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs max-w-[200px]"
                >
                    <option value="">All vehicles</option>
                    {(vehicles?.data ?? []).map(v => (
                        <option key={v.id} value={v.id}>{v.attributes.registration_number?.toUpperCase()}</option>
                    ))}
                </select>
            )}
            {children}
            {reportType && (
                <div className="ml-auto flex items-center gap-1">
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Download className="h-3.5 w-3.5 text-slate-400" />}
                    {(['csv', 'excel', 'pdf'] as const).map(f => (
                        <button
                            key={f}
                            disabled={exporting}
                            onClick={() => runExport(f)}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

/** The reporting store keeps 60 days: say so instead of showing a short range as quiet driving. */
export function PartialNotice({ meta, children }: { meta?: ReportMeta; children?: ReactNode }) {
    if (!meta?.partial) return null
    return (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
                Telemetry is kept for 60 days. This report starts on {formatDate(meta.available_from)}; nothing before that date is available.
                {children}
            </span>
        </div>
    )
}

/** Litres with where they came from; estimates are never shown as plain numbers. */
export function Litres({ litres, source }: { litres: number | null; source: LitresSource }) {
    if (litres === null) return <span className="text-slate-400">{dash}</span>
    return (
        <span className="inline-flex items-center gap-1.5">
            {formatNumber(litres, 2, 'L')}
            {source && (
                <Badge variant="outline" className={cn('text-[9px] font-bold', source === 'Sensor' ? 'border-emerald-300 text-emerald-700' : 'border-slate-300 text-slate-500')}>
                    {source}
                </Badge>
            )}
        </span>
    )
}

export interface Column<T> {
    key: string
    header: string
    className?: string
    render: (row: T) => ReactNode
}

/** A paged report table; the page lives in the URL with the other filters. */
export function ReportTable<T>({ columns, rows, meta, isLoading, isError, empty = 'Nothing recorded in this period.', rowKey }: {
    columns: Column<T>[]
    rows?: T[]
    meta?: ReportMeta
    isLoading?: boolean
    /** The report could not be loaded: say so, instead of "nothing recorded". */
    isError?: boolean
    empty?: string
    rowKey: (row: T, index: number) => string | number
}) {
    const { set } = useReportFilters()

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map(c => (
                                <TableHead key={c.key} className={cn('text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap', c.className)}>
                                    {c.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="py-12 text-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 inline" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && isError && (rows ?? []).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="py-12 text-center text-sm text-red-600" role="alert">
                                    This report could not be loaded. Try again in a moment; the data is not missing.
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && !isError && (rows ?? []).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">{empty}</TableCell>
                            </TableRow>
                        )}
                        {!isLoading && (rows ?? []).map((row, i) => (
                            <TableRow key={rowKey(row, i)}>
                                {columns.map(c => (
                                    <TableCell key={c.key} className={cn('text-xs whitespace-nowrap', c.className)}>{c.render(row)}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                    <span>{meta.total.toLocaleString()} rows · page {meta.page} of {meta.last_page}</span>
                    <div className="flex gap-1">
                        <button aria-label="Previous page" disabled={meta.page <= 1} onClick={() => set({ page: meta.page - 1 })} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button aria-label="Next page" disabled={meta.page >= meta.last_page} onClick={() => set({ page: meta.page + 1 })} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/** A small figure for the top of a report. */
export function Figure({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
            {note && <p className="text-[10px] text-slate-400 mt-1">{note}</p>}
        </div>
    )
}

/** The page title used across the telemetry reports. */
export function ReportHeader({ title, accent, subtitle }: { title: string; accent: string; subtitle: string }) {
    return (
        <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                {title} <span className="text-blue-600">{accent}</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
    )
}

export type { ReportFilters }
