'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, Truck, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SignalBars } from './SignalBars'
import type { RealtimeVehicle } from './useFuelRealtime'
import type { VehicleMovement } from './useFuelOverview'

interface RealtimeVehicleRailProps {
    vehicles: RealtimeVehicle[]
    activeId: number | null
    onSelect: (id: number) => void
    isLoading?: boolean
}

type StatusFilter = 'all' | VehicleMovement

const STATUS_META: Record<VehicleMovement, { label: string; text: string; dot: string }> = {
    moving: { label: 'Moving', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    parked: { label: 'Parked', text: 'text-slate-500', dot: 'bg-slate-400' },
    idle: { label: 'Idle', text: 'text-amber-600', dot: 'bg-amber-500' },
    offline: { label: 'Offline', text: 'text-rose-600', dot: 'bg-rose-500' },
}

function fuelBarColor(pct: number | null): string {
    if (pct == null) return 'bg-slate-300'
    if (pct <= 20) return 'bg-rose-500'
    if (pct <= 40) return 'bg-amber-500'
    return 'bg-emerald-500'
}
function fuelTextColor(pct: number | null): string {
    if (pct == null) return 'text-slate-400'
    if (pct <= 20) return 'text-rose-600'
    if (pct <= 40) return 'text-amber-600'
    return 'text-emerald-600'
}

export function RealtimeVehicleRail({ vehicles, activeId, onSelect, isLoading }: RealtimeVehicleRailProps) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<StatusFilter>('all')
    const [filterMenuOpen, setFilterMenuOpen] = useState(false)
    const filterRef = useRef<HTMLDivElement>(null)

    // Close the filter dropdown on outside click.
    useEffect(() => {
        if (!filterMenuOpen) return
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [filterMenuOpen])

    const counts = useMemo(() => ({
        all: vehicles.length,
        moving: vehicles.filter((v) => v.status === 'moving').length,
        parked: vehicles.filter((v) => v.status === 'parked').length,
        idle: vehicles.filter((v) => v.status === 'idle').length,
        offline: vehicles.filter((v) => v.status === 'offline').length,
    }), [vehicles])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return vehicles.filter((v) => {
            if (filter !== 'all' && v.status !== filter) return false
            if (!q) return true
            return v.registration.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
        })
    }, [vehicles, search, filter])

    const tabs: { key: StatusFilter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: counts.all },
        { key: 'moving', label: 'Moving', count: counts.moving },
        { key: 'parked', label: 'Parked', count: counts.parked },
        { key: 'idle', label: 'Idle', count: counts.idle },
        { key: 'offline', label: 'Offline', count: counts.offline },
    ]

    return (
        <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-none">
            <div className="bg-slate-50/70 px-4 py-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                    Vehicles <span className="text-slate-400">({vehicles.length})</span>
                </h2>
            </div>

            <div className="mt-2 flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search vehicle..."
                        className="h-9 border-0 bg-slate-50 pl-8 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                        aria-label="Search vehicles"
                    />
                </div>
                <div className="relative" ref={filterRef}>
                    <button
                        type="button"
                        aria-label="Filter vehicles"
                        aria-expanded={filterMenuOpen}
                        onClick={() => setFilterMenuOpen((open) => !open)}
                        className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors duration-200',
                            filter !== 'all'
                                ? 'border-0 bg-blue-50 text-[#0055FF]'
                                : 'border-0 bg-white text-slate-500 hover:bg-slate-50',
                        )}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </button>
                    {filterMenuOpen && (
                        <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg bg-white py-1 shadow-lg">
                            {tabs.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => { setFilter(t.key); setFilterMenuOpen(false) }}
                                    className={cn(
                                        'flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-slate-50',
                                        filter === t.key ? 'text-[#0055FF]' : 'text-slate-600',
                                    )}
                                >
                                    <span>{t.label} ({t.count})</span>
                                    {filter === t.key && <Check className="h-3.5 w-3.5" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Status tabs — horizontally scrollable so they never overflow the rail */}
            <div className="mt-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setFilter(t.key)}
                        aria-current={filter === t.key ? 'true' : undefined}
                        className={cn(
                            'shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] transition-colors duration-200',
                            filter === t.key ? 'bg-[#0055FF] font-semibold text-white' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                        )}
                    >
                        {t.label} ({t.count})
                    </button>
                ))}
            </div>
            </div>

            <div className="fuel-record-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                            <div className="h-9 w-9 animate-pulse rounded-md bg-slate-100" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                                <div className="h-2 w-16 animate-pulse rounded bg-slate-100" />
                            </div>
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <p className="px-2 py-10 text-center text-sm text-slate-400">No vehicles match.</p>
                ) : (
                    filtered.map((v) => {
                        const active = v.id === activeId
                        const status = STATUS_META[v.status]
                        return (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => onSelect(v.id)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-200',
                                    active
                                        ? 'border-l-2 border-[#0055FF] bg-blue-50/60'
                                        : 'border-l-2 border-transparent hover:bg-slate-50',
                                )}
                            >
                                {/* Vehicle: image + name + chassis */}
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                    <Truck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">{v.registration}</p>
                                    <p className="truncate text-[11px] text-slate-400">{v.model}</p>
                                </div>

                                {/* Fuel: percent, progress, litres */}
                                <div className="w-20 shrink-0">
                                    <div className="flex items-baseline justify-between">
                                        <span className={cn('text-xs font-bold', fuelTextColor(v.fuelPercent))}>{v.fuelPercent ?? '—'}%</span>
                                    </div>
                                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div className={cn('h-full rounded-full', fuelBarColor(v.fuelPercent))} style={{ width: `${v.fuelPercent ?? 0}%` }} />
                                    </div>
                                    <span className="text-[10px] text-slate-400">{v.fuelLiters ?? '—'} L</span>
                                </div>

                                {/* Status + signal */}
                                <div className="flex w-14 shrink-0 flex-col items-end gap-1">
                                    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', status.text)}>
                                        <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} /> {status.label}
                                    </span>
                                    <SignalBars strength={v.signal} />
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </Card>
    )
}
