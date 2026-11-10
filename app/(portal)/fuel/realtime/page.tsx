'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { QueryError } from '@/components/shared/QueryError'
import { cn } from '@/lib/utils'
import { ageMinutes, formatAge } from '@/lib/fuel-format'
import { FuelTabs } from '../components/FuelTabs'
import { FuelLevelList } from '../components/FuelLevelList'
import { FuelLevelMap } from '../components/FuelLevelMap'
import { FuelVehiclePanel } from '../components/FuelVehiclePanel'
import { sortBoard, useFuelBoard, type BoardSort } from '../components/useFuelBoard'
import { useFuelClusters } from '../components/useFuelClusters'
import { useNow } from '../components/useNow'

const subscribeNever = () => () => undefined

/** Filters the server applies; search is the page's own, on what is already loaded. */
interface Filters {
    cluster_id?: number
    type?: string
}

export default function FuelRealtimePage() {
    const [filters, setFilters] = useState<Filters>({})
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [sort, setSort] = useState<BoardSort>('range')
    const [search, setSearch] = useState('')
    // Wall screens open the page already in TV mode with ?tv=1; a click then overrides the link.
    const urlTv = useSyncExternalStore(subscribeNever, () => new URLSearchParams(window.location.search).get('tv') === '1', () => false)
    const [tvChoice, setTv] = useState<boolean | null>(null)
    const tv = tvChoice ?? urlTv
    const now = useNow()

    const board = useFuelBoard(filters, tv ? 15_000 : 30_000)
    const { clusters } = useFuelClusters()

    useEffect(() => {
        if (!tv) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTv(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [tv])

    // Type options come from what is loaded, plus the chosen one so it never vanishes from its own list.
    const typeOptions = useMemo(() => [...new Set([...board.vehicles.map((v) => v.type), filters.type].filter((t): t is string => !!t))].sort(), [board.vehicles, filters.type])

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase()
        const matches = q === '' ? board.vehicles : board.vehicles.filter((v) =>
            [v.registration_number, v.make, v.model].some((part) => part?.toLowerCase().includes(q)))
        return sortBoard(matches, sort)
    }, [board.vehicles, search, sort])

    const selected = board.vehicles.find((v) => v.vehicle_id === selectedId) ?? null
    const updatedAge = ageMinutes(board.generatedAt, now)

    const strip = (
        <div className={cn('grid gap-2 rounded-2xl bg-white p-3', tv ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-5')}>
            <Stat big={tv} label="Reporting" value={board.summary.reporting} />
            <Stat big={tv} label="Live now" value={board.summary.live} tone="emerald" />
            <Stat big={tv} label="Stale" value={board.summary.stale} tone="amber" />
            <Stat big={tv} label="Low fuel" value={board.summary.low} tone="red" />
            <Stat big={tv} label="Sensor silent" value={board.summary.silent} />
        </div>
    )

    if (tv) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col gap-3 overflow-hidden bg-slate-100 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Fuel levels · live</h1>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>Updated {formatAge(updatedAge)}</span>
                        <button type="button" onClick={() => setTv(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-medium"><Minimize2 className="h-4 w-4" />Exit (Esc)</button>
                    </div>
                </div>
                {strip}
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
                    <FuelLevelList large vehicles={shown.slice(0, 12)} silent={[]} selectedId={null} onSelect={() => undefined} sort={sort} onSortChange={setSort} search="" onSearchChange={() => undefined} isLoading={board.isLoading} />
                    <FuelLevelMap vehicles={board.vehicles} activeId={null} onSelect={() => undefined} />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5 pb-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Real-time Fuel Levels</h1>
                    <p className="mt-1 text-sm text-slate-500">Every vehicle that reported a tank level in the last 24 hours, with how fast it is emptying and how far it can go.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500">{board.isError ? 'Could not refresh' : `Updated ${formatAge(updatedAge)}`}</span>
                    <button type="button" onClick={board.refetch} aria-label="Refresh" className="rounded-lg bg-white p-2 text-slate-600 hover:bg-slate-50"><RefreshCw className={cn('h-4 w-4', board.isFetching && 'animate-spin')} /></button>
                    <button type="button" onClick={() => setTv(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"><Maximize2 className="h-4 w-4" />TV mode</button>
                </div>
            </div>

            <FuelTabs active="Real-time Tracking" />

            <div className="flex flex-wrap gap-2">
                <label className="text-sm">
                    <span className="sr-only">Cluster</span>
                    <select value={filters.cluster_id ?? ''} onChange={(e) => setFilters((f) => ({ ...f, cluster_id: e.target.value ? Number(e.target.value) : undefined }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <option value="">All clusters</option>
                        {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                <label className="text-sm">
                    <span className="sr-only">Vehicle type</span>
                    <select value={filters.type ?? ''} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <option value="">All vehicle types</option>
                        {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
            </div>

            {strip}

            {board.isError && !board.vehicles.length ? (
                <QueryError message="Failed to load live fuel levels." />
            ) : (
                <div className={cn('grid min-h-0 grid-cols-1 gap-4 xl:h-[640px]', selected ? 'xl:grid-cols-[360px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[360px_minmax(0,1fr)]')}>
                    <div className="h-[520px] min-h-0 xl:h-full">
                        <FuelLevelList vehicles={shown} silent={board.silent} selectedId={selectedId} onSelect={setSelectedId} sort={sort} onSortChange={setSort} search={search} onSearchChange={setSearch} isLoading={board.isLoading} />
                    </div>
                    <div className="h-[360px] min-h-0 xl:h-full">
                        <FuelLevelMap vehicles={shown} activeId={selectedId} onSelect={setSelectedId} />
                    </div>
                    {selected && (
                        <div className="min-h-0 xl:h-full">
                            <FuelVehiclePanel vehicle={selected} onClose={() => setSelectedId(null)} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function Stat({ label, value, tone, big }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red'; big?: boolean }) {
    const colour = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900'
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className={cn('font-bold tabular-nums', colour, big ? 'text-4xl' : 'text-xl')}>{value.toLocaleString()}</p>
        </div>
    )
}
