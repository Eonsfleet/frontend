'use client'

import { cn } from '@/lib/utils'
import type { CompareBasis } from '@/lib/api/fuelPage'
import { PERIOD_LABELS, type PeriodPreset } from './period'

export interface OverviewFilterState {
    preset: PeriodPreset
    customFrom: string
    customTo: string
    compare: CompareBasis
    cluster_id?: number
    type?: string
    make?: string
    model?: string
}

interface Props {
    value: OverviewFilterState
    onChange: (next: OverviewFilterState) => void
    clusters: Array<{ id: number; name: string }>
    types: string[]
    makes: string[]
    models: string[]
}

const select = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'

export function OverviewFilters({ value, onChange, clusters, types, makes, models }: Props) {
    const set = (patch: Partial<OverviewFilterState>) => onChange({ ...value, ...patch })

    return (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Overview filters">
            <label>
                <span className="sr-only">Period</span>
                <select value={value.preset} onChange={(e) => set({ preset: e.target.value as PeriodPreset })} className={select}>
                    {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
                </select>
            </label>
            {value.preset === 'custom' && (
                <>
                    <label className="text-sm text-slate-600">
                        <span className="sr-only">From</span>
                        <input type="date" aria-label="From" value={value.customFrom} max={value.customTo} onChange={(e) => set({ customFrom: e.target.value })} className={select} />
                    </label>
                    <label className="text-sm text-slate-600">
                        <span className="sr-only">To</span>
                        <input type="date" aria-label="To" value={value.customTo} min={value.customFrom} onChange={(e) => set({ customTo: e.target.value })} className={select} />
                    </label>
                </>
            )}
            <label>
                <span className="sr-only">Compare with</span>
                <select value={value.compare} onChange={(e) => set({ compare: e.target.value as CompareBasis })} className={select}>
                    <option value="last_month">Compare: same days last month</option>
                    <option value="previous">Compare: previous period</option>
                </select>
            </label>

            <span className={cn('mx-1 hidden h-6 w-px bg-slate-200 sm:block')} aria-hidden />

            <label>
                <span className="sr-only">Cluster</span>
                <select value={value.cluster_id ?? ''} onChange={(e) => set({ cluster_id: e.target.value ? Number(e.target.value) : undefined })} className={select}>
                    <option value="">All clusters</option>
                    {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </label>
            <label>
                <span className="sr-only">Vehicle type</span>
                <select value={value.type ?? ''} onChange={(e) => set({ type: e.target.value || undefined })} className={select}>
                    <option value="">All types</option>
                    {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
            </label>
            <label>
                <span className="sr-only">Make</span>
                <select value={value.make ?? ''} onChange={(e) => set({ make: e.target.value || undefined, model: undefined })} className={select}>
                    <option value="">All makes</option>
                    {makes.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
            </label>
            <label>
                <span className="sr-only">Model</span>
                <select value={value.model ?? ''} onChange={(e) => set({ model: e.target.value || undefined })} className={select}>
                    <option value="">All models</option>
                    {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
            </label>
        </div>
    )
}
