'use client'

import { FuelIcon, AlertTriangle, ChevronLeft, ChevronRight, Loader2, Timer, Info, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { FuelEvent, FuelEventsPagination } from './useFuelRealtime'

const EVENT_META: Record<FuelEvent['kind'], { icon: LucideIcon; iconClass: string }> = {
    refill_started: { icon: FuelIcon, iconClass: 'bg-emerald-50 text-emerald-500' },
    refill_completed: { icon: FuelIcon, iconClass: 'bg-emerald-50 text-emerald-500' },
    low: { icon: AlertTriangle, iconClass: 'bg-rose-50 text-rose-500' },
    drain: { icon: AlertTriangle, iconClass: 'bg-rose-50 text-rose-500' },
    idle: { icon: Timer, iconClass: 'bg-amber-50 text-amber-500' },
    other: { icon: Info, iconClass: 'bg-slate-100 text-slate-500' },
}

interface RecentFuelEventsCardProps {
    events: FuelEvent[]
    isLoading?: boolean
    isRefreshing?: boolean
    pagination?: FuelEventsPagination | null
    onPageChange?: (page: number) => void
}

export function RecentFuelEventsCard({ events, isLoading, isRefreshing, pagination, onPageChange }: RecentFuelEventsCardProps) {
    const start = pagination && pagination.total > 0 ? (pagination.current - 1) * pagination.perPage + 1 : 0
    const end = pagination ? Math.min(pagination.current * pagination.perPage, pagination.total) : events.length
    const canGoPrevious = !!pagination && pagination.current > 1
    const canGoNext = !!pagination && pagination.current < pagination.lastPage

    return (
        <Card className="flex h-[292px] min-h-0 flex-col rounded-2xl border-0 bg-white p-5 shadow-none">
            <div className="flex shrink-0 items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">Recent Fuel Events</h2>
                <div className="flex items-center gap-2">
                    {isRefreshing && (
                        <Loader2 className="h-4 w-4 animate-spin text-[#0055FF]" aria-label="Refreshing events" />
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="text-slate-400 transition-colors hover:text-slate-600"
                                aria-label="About recent fuel events"
                            >
                                <Info className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-56 text-center">
                            Shows all recent fuel events by default. Select a vehicle to see only that vehicle&apos;s events.
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <ul className="fuel-record-scroll mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {isLoading && (
                    <li className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-[#0055FF]" />
                        Loading events
                    </li>
                )}
                {!isLoading && events.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No recent events.</li>}
                {!isLoading && events.map((e) => {
                    const meta = EVENT_META[e.kind]
                    const Icon = meta.icon
                    return (
                        <li key={e.id} className="flex items-center gap-3">
                            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.iconClass)}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-slate-900">{e.title}</p>
                                <p className="truncate text-[11px] text-slate-400">{e.time}</p>
                            </div>
                            <span className="shrink-0 text-[11px] font-medium text-slate-500">{e.detail}</span>
                        </li>
                    )
                })}
            </ul>

            {pagination && (
                <div className="mt-3 flex shrink-0 items-center justify-between gap-3 bg-slate-50 px-3 py-2">
                    <span className="text-[11px] font-medium text-slate-400">
                        Showing {start}-{end} of {pagination.total}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-40"
                            disabled={!canGoPrevious || isLoading || isRefreshing}
                            onClick={() => pagination && onPageChange?.(pagination.current - 1)}
                            aria-label="Previous fuel events page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-10 text-center text-[11px] font-semibold text-slate-500">
                            {pagination.current}/{pagination.lastPage}
                        </span>
                        <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-40"
                            disabled={!canGoNext || isLoading || isRefreshing}
                            onClick={() => pagination && onPageChange?.(pagination.current + 1)}
                            aria-label="Next fuel events page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </Card>
    )
}
