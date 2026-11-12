'use client'

import { useMemo, useState } from 'react'
import { QueryError } from '@/components/shared/QueryError'
import type { FuelOverviewParams } from '@/lib/api/fuelPage'
import { FuelTabs } from './components/FuelTabs'
import { OverviewFilters, type OverviewFilterState } from './components/overview/OverviewFilters'
import { BudgetCard, KpiCards, LossSignalsCard, QualityStrip } from './components/overview/OverviewCards'
import { BreakdownCards, NeedsActionCard, OutliersCard, TrendCard } from './components/overview/OverviewTables'
import { compareLabel, defaultCompare, periodFor } from './components/overview/period'
import { useFuelOverviewSummary } from './components/overview/useFuelOverviewSummary'
import { useFuelClusters } from './components/useFuelClusters'

const initial = (): OverviewFilterState => ({ preset: 'mtd', customFrom: '', customTo: '', compare: defaultCompare('mtd') })

export default function FuelOverviewPage() {
    const [filters, setFilters] = useState<OverviewFilterState>(initial)
    const { clusters } = useFuelClusters()

    const params = useMemo<FuelOverviewParams>(() => {
        const { from, to } = periodFor(filters.preset, new Date(), { from: filters.customFrom, to: filters.customTo })
        return { from, to, compare: filters.compare, cluster_id: filters.cluster_id, type: filters.type, make: filters.make, model: filters.model }
    }, [filters])
    // A half-typed custom range is not a request yet.
    const ready = filters.preset !== 'custom' || (filters.customFrom !== '' && filters.customTo !== '')
    const query = useFuelOverviewSummary(params, ready)
    const data = query.data

    // Filter options come from what is loaded, plus the chosen values so they never vanish from their own lists.
    const options = useMemo(() => {
        const rows = data?.by_type ?? []
        const uniq = (xs: Array<string | null | undefined>) => [...new Set(xs.filter((x): x is string => !!x))].sort()
        return {
            types: uniq([...rows.map((r) => r.type), filters.type]),
            makes: uniq([...rows.map((r) => r.make), filters.make]),
            models: uniq([...rows.map((r) => r.model), filters.model]),
        }
    }, [data, filters.type, filters.make, filters.model])

    const change = (next: OverviewFilterState) => {
        // Changing the period resets the comparison to what suits it; a chosen comparison otherwise stays.
        setFilters(next.preset !== filters.preset ? { ...next, compare: defaultCompare(next.preset) } : next)
    }

    return (
        <div className="space-y-5 pb-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Overview</h1>
                <p className="mt-1 text-sm text-slate-500">What the fleet used and spent, where it went, what looks wrong and what needs doing today.</p>
            </div>

            <FuelTabs active="Overview" />

            <OverviewFilters value={filters} onChange={change} clusters={clusters} {...options} />

            {query.isError && !data ? (
                <QueryError message="Failed to load fuel overview." />
            ) : !data ? (
                <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading fuel overview…</p>
            ) : (
                <>
                    <p className="text-sm text-slate-500">
                        {data.period.from} to {data.period.to} · compared {compareLabel(data.previous_period.basis, data.period.days).replace('vs ', 'with ')} ({data.previous_period.from} to {data.previous_period.to})
                    </p>
                    <QualityStrip quality={data.quality} />
                    <KpiCards data={data} compare={compareLabel(data.previous_period.basis, data.period.days)} />
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <BudgetCard budget={data.budget} />
                        <LossSignalsCard loss={data.loss} />
                    </div>
                    <NeedsActionCard needsAction={data.needs_action} />
                    <BreakdownCards data={data} />
                    <OutliersCard outliers={data.outliers} />
                    <TrendCard trend={data.trend} />
                </>
            )}
        </div>
    )
}
