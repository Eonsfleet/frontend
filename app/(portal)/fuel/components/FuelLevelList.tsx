'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Navigation, Search, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RealtimeFuelVehicle, SilentFuelVehicle } from '@/lib/api/fuelPage'
import { formatAge, formatHoursToEmpty, formatLitres, formatNumber } from '@/lib/fuel-format'
import { QualityBadge } from './shared/QualityBadge'
import { FreshnessLabel } from './shared/FreshnessLabel'
import { LOW_FUEL_PERCENT, type BoardSort } from './useFuelBoard'

const SORTS: Array<{ value: BoardSort; label: string }> = [
    { value: 'range', label: 'Runs dry soonest' },
    { value: 'level', label: 'Lowest level' },
    { value: 'stale', label: 'Stalest reading' },
    { value: 'registration', label: 'Registration' },
]

/** What the burn means in words: a number, steady, or not enough readings yet. */
export function burnText(v: RealtimeFuelVehicle): string {
    if (v.burn_basis === null) return 'Burn —'
    if (v.burn_litres_per_hour === 0 || v.burn_percent_per_hour === 0) return 'Level steady'
    if (v.burn_litres_per_hour != null) return `Burn ${formatNumber(v.burn_litres_per_hour, 1, 'L/h')}`
    if (v.burn_percent_per_hour != null) return `Burn ${formatNumber(v.burn_percent_per_hour, 1, '%/h')}`
    return 'Burn —'
}

function LevelBar({ percent }: { percent: number | null }) {
    const low = percent != null && percent <= LOW_FUEL_PERCENT
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={percent == null ? 'Level unknown' : `Level ${Math.round(percent)} percent`}>
            <div className={cn('h-full rounded-full', low ? 'bg-red-500' : percent != null && percent <= 40 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.max(0, Math.min(100, percent ?? 0))}%` }} />
        </div>
    )
}

export function FuelLevelRow({ v, selected, onSelect, large }: { v: RealtimeFuelVehicle; selected: boolean; onSelect: (id: number) => void; large?: boolean }) {
    const low = v.level_percent != null && v.level_percent <= LOW_FUEL_PERCENT
    return (
        <button
            type="button"
            onClick={() => onSelect(v.vehicle_id)}
            aria-pressed={selected}
            className={cn(
                'block w-full rounded-xl border bg-white p-3 text-left transition-colors hover:border-blue-300',
                selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100',
                large && 'p-4',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className={cn('truncate font-semibold text-slate-900', large ? 'text-lg' : 'text-sm')}>{v.registration_number ?? `Vehicle ${v.vehicle_id}`}</p>
                    <p className="truncate text-xs text-slate-500">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</p>
                </div>
                <FreshnessLabel freshness={v.freshness} ageMinutes={v.age_minutes} />
            </div>

            <div className="mt-2 flex items-center gap-2">
                <div className="flex-1"><LevelBar percent={v.level_percent} /></div>
                <span className={cn('w-10 text-right font-bold tabular-nums', low ? 'text-red-600' : 'text-slate-900', large ? 'text-lg' : 'text-sm')}>
                    {v.level_percent == null ? '—' : `${Math.round(v.level_percent)}%`}
                </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600">
                <span className="tabular-nums">{formatLitres(v.level_litres, v.basis)}</span>
                <QualityBadge quality={v.basis} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{burnText(v)}</span>
                <span>Empty in {formatHoursToEmpty(v.hours_to_empty)}</span>
                {v.range_km != null && <span>≈ {formatNumber(v.range_km, 0, 'km')} range</span>}
                <span className="inline-flex items-center gap-1">
                    <Navigation className="h-3 w-3" aria-hidden />
                    {v.location == null ? 'No position' : v.location.moving == null ? 'Position old' : v.location.moving ? `Moving${v.location.speed_kph ? ` ${v.location.speed_kph} km/h` : ''}` : 'Parked'}
                </span>
                {v.open_alerts > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-red-600"><TriangleAlert className="h-3 w-3" aria-hidden />{v.open_alerts} open</span>
                )}
            </div>
        </button>
    )
}

export function FuelLevelList({ vehicles, silent, selectedId, onSelect, sort, onSortChange, search, onSearchChange, isLoading, large = false }: {
    vehicles: RealtimeFuelVehicle[]
    silent: SilentFuelVehicle[]
    selectedId: number | null
    onSelect: (id: number) => void
    sort: BoardSort
    onSortChange: (s: BoardSort) => void
    search: string
    onSearchChange: (s: string) => void
    isLoading: boolean
    large?: boolean
}) {
    const [showSilent, setShowSilent] = useState(false)

    return (
        <div className="flex h-full min-h-0 flex-col rounded-2xl bg-white p-3">
            {!large && (
                <div className="mb-3 flex gap-2">
                    <label className="relative flex-1">
                        <span className="sr-only">Search vehicles</span>
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
                        <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search vehicle" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm" />
                    </label>
                    <label>
                        <span className="sr-only">Sort</span>
                        <select value={sort} onChange={(e) => onSortChange(e.target.value as BoardSort)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
                            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </label>
                </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {isLoading && <p className="p-4 text-center text-sm text-slate-500">Loading fuel levels…</p>}
                {!isLoading && vehicles.length === 0 && (
                    <p className="p-4 text-center text-sm text-slate-500">No vehicle has reported a fuel level in the last 24 hours.</p>
                )}
                {vehicles.map((v) => <FuelLevelRow key={v.vehicle_id} v={v} selected={v.vehicle_id === selectedId} onSelect={onSelect} large={large} />)}

                {silent.length > 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-2">
                        <button type="button" onClick={() => setShowSilent((s) => !s)} aria-expanded={showSilent} className="flex w-full items-center gap-1.5 text-left text-sm font-medium text-slate-600">
                            {showSilent ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            No fuel reading in 24 h · {silent.length}
                        </button>
                        {showSilent && (
                            <ul className="mt-2 space-y-1">
                                {silent.map((s) => (
                                    <li key={s.vehicle_id} className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="font-medium text-slate-700">{s.registration_number ?? `Vehicle ${s.vehicle_id}`}</span>
                                        <span>
                                            {s.reason === 'sensor_silent' ? 'Tracker reporting, no fuel level' : s.reason === 'device_silent' ? 'Tracker silent' : null}
                                            {s.reason ? ' · ' : ''}last reading {formatAge(s.age_minutes)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
