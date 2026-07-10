'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, MoreVertical, Truck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { VehicleRow, VehicleMovement } from './useFuelOverview'

interface VehicleListCardProps {
    vehicles: VehicleRow[]
    isLoading?: boolean
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

const STATUS_META: Record<VehicleMovement, { label: string; dot: string; text: string }> = {
    moving: { label: 'Moving', dot: 'bg-emerald-500', text: 'text-emerald-600' },
    idle: { label: 'Idle', dot: 'bg-amber-500', text: 'text-amber-600' },
    offline: { label: 'Offline', dot: 'bg-slate-300', text: 'text-slate-400' },
}

function StatusPill({ status }: { status: VehicleMovement }) {
    const s = STATUS_META[status]
    return (
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', s.text)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} /> {s.label}
        </span>
    )
}

export function VehicleListCard({ vehicles, isLoading }: VehicleListCardProps) {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return vehicles
        return vehicles.filter(
            (v) =>
                v.registration.toLowerCase().includes(q) ||
                v.model.toLowerCase().includes(q) ||
                v.chassis.toLowerCase().includes(q),
        )
    }, [vehicles, search])

    return (
        <Card className="flex h-full flex-col rounded-2xl border-slate-100 p-5 shadow-none">
            {/* Header: title + count, then search + filter on the right */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold text-slate-900">
                    Vehicles <span className="text-slate-400">({vehicles.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-52">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search vehicle..."
                            className="h-9 border-slate-200 bg-slate-50 pl-8 text-sm"
                            aria-label="Search vehicles"
                        />
                    </div>
                    <button
                        type="button"
                        aria-label="Filter vehicles"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors duration-200 hover:bg-slate-50"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* 4-column table */}
            <div className="mt-4 -mx-1 flex-1 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left">
                    <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-1 pb-2 font-bold">Vehicle</th>
                            <th className="px-1 pb-2 font-bold">Fuel Level</th>
                            <th className="px-1 pb-2 font-bold">Location</th>
                            <th className="w-8 px-1 pb-2" aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-1 py-3" colSpan={4}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 animate-pulse rounded-md bg-slate-100" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                                                <div className="h-2 w-16 animate-pulse rounded bg-slate-100" />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-1 py-10 text-center text-sm text-slate-400">
                                    No vehicles match your search.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((v) => (
                                <tr key={v.id} className="align-top">
                                    {/* Column 1 — Vehicle: image + name + chassis */}
                                    <td className="px-1 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">{v.registration}</p>
                                                <p className="truncate text-[11px] text-slate-400">{v.chassis}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Column 2 — Fuel Level: percent, progress bar, litres */}
                                    <td className="px-1 py-3">
                                        <div className="w-28">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={cn('text-sm font-bold', fuelTextColor(v.fuelPercent))}>
                                                    {v.fuelPercent ?? '—'}%
                                                </span>
                                                <span className="text-[10px] text-slate-400">{v.fuelLiters ?? '—'} L</span>
                                            </div>
                                            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={cn('h-full rounded-full transition-all duration-300', fuelBarColor(v.fuelPercent))}
                                                    style={{ width: `${v.fuelPercent ?? 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    {/* Column 3 — Location: address + status */}
                                    <td className="px-1 py-3">
                                        <p className="truncate text-[13px] leading-tight text-slate-600">{v.location ?? '—'}</p>
                                        <StatusPill status={v.status} />
                                    </td>

                                    {/* Column 4 — Action (no title) */}
                                    <td className="px-1 py-3 text-right">
                                        <button
                                            type="button"
                                            aria-label={`Actions for ${v.registration}`}
                                            className="rounded-md p-1 text-slate-300 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-500"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                    type="button"
                    className="text-left text-[13px] font-semibold text-blue-600 transition-colors duration-200 hover:text-blue-700"
                >
                    View all vehicles →
                </button>
            </div>
        </Card>
    )
}
