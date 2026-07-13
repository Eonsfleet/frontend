'use client'

import { useMemo, useState } from 'react'
import {
    ChevronLeft, ChevronRight, Filter, Loader2, MapPin, Search,
    FuelIcon, Droplets, Moon, Cpu, TriangleAlert, type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertRowMenu } from './AlertRowMenu'
import {
    TYPE_META, SEVERITY_META, STATUS_META,
    type FuelAlertRow, type Severity, type AlertType, type AlertPagination,
} from './useFuelAlerts'

interface AlertsTableProps {
    alerts: FuelAlertRow[]
    activeId: string | null
    onSelect: (id: string) => void
    onOpenFilters: () => void
    onCreateRule: () => void
    onAcknowledge: (id: string) => void
    onResolve: (id: string) => void
    onDelete: (id: string) => void
    activeFilterCount?: number
    search?: string
    onSearchChange?: (value: string) => void
    pagination?: AlertPagination
    onPageChange?: (page: number) => void
    isLoading?: boolean
    isFetching?: boolean
    /** Accurate severity totals from the API summary (not just the current page). */
    tabCounts?: { all: number; critical: number; warning: number; info: number }
}

const ALERT_ICON: Record<AlertType, { icon: LucideIcon; class: string }> = {
    low_fuel: { icon: FuelIcon, class: 'bg-amber-50 text-amber-500' },
    fuel_theft: { icon: Droplets, class: 'bg-amber-50 text-amber-500' },
    rapid_drop: { icon: Droplets, class: 'bg-amber-50 text-amber-500' },
    unauthorized_drain: { icon: Moon, class: 'bg-purple-50 text-purple-500' },
    sensor_error: { icon: Cpu, class: 'bg-blue-50 text-blue-500' },
    refill: { icon: FuelIcon, class: 'bg-blue-50 text-blue-500' },
}

export function AlertsTable({
    alerts,
    activeId,
    onSelect,
    onOpenFilters,
    onCreateRule,
    onAcknowledge,
    onResolve,
    onDelete,
    activeFilterCount = 0,
    search = '',
    onSearchChange,
    pagination,
    onPageChange,
    isLoading,
    isFetching,
    tabCounts,
}: AlertsTableProps) {
    const [sev, setSev] = useState<'all' | Severity>('all')

    const counts = useMemo(() => tabCounts ?? ({
        all: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        info: alerts.filter((a) => a.severity === 'info').length,
    }), [alerts, tabCounts])

    const filtered = useMemo(() => (sev === 'all' ? alerts : alerts.filter((a) => a.severity === sev)), [alerts, sev])
    const start = pagination && pagination.total > 0 ? (pagination.current - 1) * pagination.perPage + 1 : 0
    const end = pagination ? Math.min(pagination.current * pagination.perPage, pagination.total) : filtered.length
    const canGoPrevious = !!pagination && pagination.current > 1
    const canGoNext = !!pagination && pagination.current < pagination.lastPage

    const pills: { key: 'all' | Severity; label: string; count: number; icon?: LucideIcon; color?: string }[] = [
        { key: 'all', label: 'All Alerts', count: counts.all, icon: TriangleAlert },
        { key: 'critical', label: 'Critical', count: counts.critical, color: 'text-rose-500' },
        { key: 'warning', label: 'Warning', count: counts.warning, color: 'text-amber-500' },
        { key: 'info', label: 'Info', count: counts.info, color: 'text-blue-500' },
    ]

    return (
        <Card className="flex h-full flex-col rounded-2xl border-slate-100 p-0 shadow-none">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {pills.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setSev(p.key)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200',
                                sev === p.key ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50',
                            )}
                        >
                            {p.icon && <p.icon className={cn('h-3.5 w-3.5', p.color)} />}
                            {p.label}
                            <span className={cn('font-bold', sev === p.key ? 'text-blue-600' : 'text-slate-400')}>{p.count}</span>
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(event) => onSearchChange?.(event.target.value)}
                            placeholder="Search alerts..."
                            className="h-9 w-56 border-slate-200 bg-white pl-8 text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onOpenFilters}
                        className={cn(
                            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium hover:bg-slate-50',
                            activeFilterCount > 0 ? 'border-blue-300 bg-blue-50/60 text-blue-600' : 'border-slate-200 bg-white text-slate-600',
                        )}
                    >
                        Filters <Filter className="h-4 w-4 text-slate-400" />
                        {activeFilterCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{activeFilterCount}</span>
                        )}
                    </button>
                    {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <th className="px-4 py-3">Alert</th>
                            <th className="px-4 py-3">Vehicle</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="w-10 px-4 py-3" aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        Loading alerts
                                    </span>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400">No alerts.</td></tr>
                        ) : (
                            filtered.map((a) => {
                                const ai = ALERT_ICON[a.type]
                                const AlertIcon = ai.icon
                                const active = a.id === activeId
                                return (
                                    <tr
                                        key={a.id}
                                        onClick={() => onSelect(a.id)}
                                        className={cn(
                                            'cursor-pointer align-middle transition-colors',
                                            active ? 'bg-rose-50/40' : 'hover:bg-slate-50/60',
                                        )}
                                    >
                                        <td className={cn('px-4 py-3', active && 'border-l-2 border-rose-500')}>
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', ai.class)}>
                                                    <AlertIcon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate font-semibold text-slate-900">{a.title}</div>
                                                    <div className="truncate text-[11px] text-slate-400">{a.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900">{a.vehicle}</div>
                                            <div className="text-[11px] text-slate-400">{a.model}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', TYPE_META[a.type].badge)}>{TYPE_META[a.type].label}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', SEVERITY_META[a.severity].badge)}>{SEVERITY_META[a.severity].label}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-700">{a.time}</div>
                                            <div className="text-[11px] text-slate-400">{a.date}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 text-slate-600">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {a.location}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_META[a.status].badge)}>{STATUS_META[a.status].label}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <AlertRowMenu
                                                label={a.vehicle}
                                                status={a.status}
                                                onViewDetails={() => onSelect(a.id)}
                                                onAcknowledge={() => onAcknowledge(a.id)}
                                                onResolve={() => onResolve(a.id)}
                                                onCreateRule={onCreateRule}
                                                onDelete={() => onDelete(a.id)}
                                            />
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {start} to {end} of {pagination?.total ?? filtered.length} alerts</span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!canGoPrevious || isFetching}
                        onClick={() => pagination && onPageChange?.(pagination.current - 1)}
                        aria-label="Previous alerts page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-12 text-center text-[12px] font-semibold text-slate-600">
                        {pagination?.current ?? 1}/{pagination?.lastPage ?? 1}
                    </span>
                    <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!canGoNext || isFetching}
                        onClick={() => pagination && onPageChange?.(pagination.current + 1)}
                        aria-label="Next alerts page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </Card>
    )
}
