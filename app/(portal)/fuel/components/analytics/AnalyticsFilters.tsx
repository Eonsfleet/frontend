'use client'

import { PERIOD_LABELS, type PeriodPreset } from '../overview/period'
import { VehicleMultiSelect } from '../VehicleMultiSelect'

export interface AnalyticsFilterState {
    preset: PeriodPreset
    customFrom: string
    customTo: string
    vehicleIds: number[]
    cluster_id?: number
    bucket?: 'day' | 'week' | 'month'
}

const select = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'

export function AnalyticsFilters({
    value,
    onChange,
    clusters,
}: {
    value: AnalyticsFilterState
    onChange: (next: AnalyticsFilterState) => void
    clusters: Array<{ id: number; name: string }>
}) {
    const set = (patch: Partial<AnalyticsFilterState>) => onChange({ ...value, ...patch })

    return (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Analytics filters">
            <label>
                <span className="sr-only">Period</span>
                <select value={value.preset} onChange={(e) => set({ preset: e.target.value as PeriodPreset })} className={select}>
                    {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
                </select>
            </label>
            {value.preset === 'custom' && (
                <>
                    <input type="date" aria-label="From" value={value.customFrom} max={value.customTo || undefined} onChange={(e) => set({ customFrom: e.target.value })} className={select} />
                    <input type="date" aria-label="To" value={value.customTo} min={value.customFrom || undefined} onChange={(e) => set({ customTo: e.target.value })} className={select} />
                </>
            )}
            <label>
                <span className="sr-only">Group by</span>
                <select value={value.bucket ?? ''} onChange={(e) => set({ bucket: (e.target.value || undefined) as AnalyticsFilterState['bucket'] })} className={select}>
                    <option value="">Group: automatic</option>
                    <option value="day">Group: by day</option>
                    <option value="week">Group: by week</option>
                    <option value="month">Group: by month</option>
                </select>
            </label>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
            <label>
                <span className="sr-only">Cluster</span>
                <select value={value.cluster_id ?? ''} onChange={(e) => set({ cluster_id: e.target.value ? Number(e.target.value) : undefined })} className={select}>
                    <option value="">All clusters</option>
                    {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </label>
            <VehicleMultiSelect value={value.vehicleIds} onChange={(ids) => set({ vehicleIds: ids })} allLabel="All vehicles" />
        </div>
    )
}
