'use client'

import { useMemo, useState } from 'react'
import {
    ChevronLeft, ChevronRight, Loader2, MapPin, Search,
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
    onCreateRule: () => void
    onAcknowledge: (id: string) => void
    onResolve: (id: string) => void
    onDelete: (id: string) => void
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
    unauthorized_drain: { icon: Moon, class: 'bg-blue-50 text-[#0055FF]' },
    sensor_error: { icon: Cpu, class: 'bg-blue-50 text-[#0055FF]' },
    refill: { icon: FuelIcon, class: 'bg-blue-50 text-[#0055FF]' },
}

export function AlertsTable({
    alerts,
    activeId,
    onSelect,
    onCreateRule,
    onAcknowledge,
    onResolve,
    onDelete,
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
        { key: 'all', label: 'All Alerts', count: counts.all, icon: TriangleAlert, color: 'text-[#0055FF]' },
        { key: 'critical', label: 'Critical', count: counts.critical, color: 'text-rose-500' },
        { key: 'warning', label: 'Warning', count: counts.warning, color: 'text-amber-500' },
        { key: 'info', label: 'Info', count: counts.info, color: 'text-[#0055FF]' },
    ]

    return (
        <Card className="flex h-full min-h-[620px] flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-none">
            <div className="flex flex-col gap-3 bg-slate-50/70 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {pills.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setSev(p.key)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200',
                                sev === p.key ? 'bg-[#0055FF] text-white' : 'text-slate-500 hover:bg-white hover:text-slate-800',
                            )}
                        >
                            {p.icon && <p.icon className={cn('h-3.5 w-3.5', sev === p.key ? 'text-white' : p.color)} />}
                            {p.label}
                            <span className={cn('font-bold', sev === p.key ? 'text-white' : 'text-slate-400')}>{p.count}</span>
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
                            className="h-9 w-full border-0 bg-white pl-8 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 sm:w-64"
                        />
                    </div>
                    {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#0055FF]" />}
                </div>
            </div>

            <div className="relative min-h-0 flex-1 bg-white">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-4 bg-gradient-to-b from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-5 bg-gradient-to-l from-white to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-5 bg-gradient-to-t from-white to-transparent" />
                <div className="fuel-record-scroll h-full overflow-auto overscroll-contain">
                    <table className="w-full min-w-[1060px] table-fixed text-left text-[13px]">
                        <colgroup>
                            <col className="w-[300px]" />
                            <col className="w-[180px]" />
                            <col className="w-[150px]" />
                            <col className="w-[120px]" />
                            <col className="w-[120px]" />
                            <col className="w-[250px]" />
                            <col className="w-[140px]" />
                            <col className="w-[80px]" />
                        </colgroup>
                        <thead className="sticky top-0 z-30 bg-white/95 backdrop-blur">
                            <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                <th className="px-4 py-3.5">Alert</th>
                                <th className="px-4 py-3.5">Vehicle</th>
                                <th className="px-4 py-3.5">Type</th>
                                <th className="px-4 py-3.5">Severity</th>
                                <th className="px-4 py-3.5">Time</th>
                                <th className="px-4 py-3.5">Location</th>
                                <th className="px-4 py-3.5">Status</th>
                                <th className="sticky right-0 z-40 bg-white/95 px-4 py-3.5 text-right backdrop-blur">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-[#0055FF]" />
                                            Loading alerts
                                        </span>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400">No alerts.</td></tr>
                            ) : (
                                filtered.map((a, index) => {
                                    const ai = ALERT_ICON[a.type]
                                    const AlertIcon = ai.icon
                                    const active = a.id === activeId
                                    const isEvenRow = index % 2 === 1
                                    return (
                                        <tr
                                            key={a.id}
                                            onClick={() => onSelect(a.id)}
                                            className={cn(
                                                'group cursor-pointer align-middle transition-colors duration-200 hover:bg-slate-50/80',
                                                active ? 'bg-blue-50/70' : 'even:bg-slate-50/35',
                                            )}
                                        >
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', ai.class)}>
                                                        <AlertIcon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-slate-900">{a.title}</div>
                                                        <div className="truncate text-[11px] text-slate-400">{a.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-semibold text-slate-900">{a.vehicle}</div>
                                                <div className="text-[11px] text-slate-400">{a.model}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold', TYPE_META[a.type].badge)}>{TYPE_META[a.type].label}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold', SEVERITY_META[a.severity].badge)}>{SEVERITY_META[a.severity].label}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="text-slate-700">{a.time}</div>
                                                <div className="text-[11px] text-slate-400">{a.date}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex min-w-0 items-center gap-1 text-slate-600">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> {a.location}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold', STATUS_META[a.status].badge)}>{STATUS_META[a.status].label}</span>
                                            </td>
                                            <td
                                                className={cn(
                                                    'sticky right-0 z-10 px-4 py-3.5',
                                                    active
                                                        ? 'bg-blue-50/95'
                                                        : isEvenRow
                                                          ? 'bg-slate-50/95 group-hover:bg-slate-50/95'
                                                          : 'bg-white/95 group-hover:bg-slate-50/95',
                                                )}
                                            >
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
            </div>

            <div className="flex flex-col gap-3 bg-slate-50/70 px-4 py-3 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                    <span className="font-medium text-slate-700">{start}-{end}</span> of {pagination?.total ?? filtered.length} alerts
                    <span className="ml-2 text-slate-400">Page {pagination?.current ?? 1} of {pagination?.lastPage ?? 1}</span>
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-40"
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
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-40"
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
