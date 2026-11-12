'use client'

import { useMemo, useState } from 'react'
import { QueryError } from '@/components/shared/QueryError'
import type { FuelAnalyticsParams } from '@/lib/api/fuelPage'
import { FuelTabs } from '../components/FuelTabs'
import { AnalyticsFilters, type AnalyticsFilterState } from '../components/analytics/AnalyticsFilters'
import { AnalyticsKpis, LevelHistory, UsageCharts } from '../components/analytics/AnalyticsCards'
import { DrainsTable, RefillsTable, VehicleTable } from '../components/analytics/AnalyticsTables'
import { useFuelAnalytics } from '../components/analytics/useFuelAnalytics'
import { periodFor } from '../components/overview/period'
import { useFuelClusters } from '../components/useFuelClusters'

const initial = (): AnalyticsFilterState => ({ preset: 'last30', customFrom: '', customTo: '', vehicleIds: [] })

export default function FuelAnalyticsPage() {
    const [filters, setFilters] = useState<AnalyticsFilterState>(initial)
    const { clusters } = useFuelClusters()

    const params = useMemo<FuelAnalyticsParams>(() => {
        const { from, to } = periodFor(filters.preset, new Date(), { from: filters.customFrom, to: filters.customTo })
        return { from, to, vehicle_ids: filters.vehicleIds.length ? filters.vehicleIds : undefined, cluster_id: filters.cluster_id, bucket: filters.bucket }
    }, [filters])
    // A half-typed custom range is not a request yet.
    const ready = filters.preset !== 'custom' || (filters.customFrom !== '' && filters.customTo !== '')
    const query = useFuelAnalytics(params, ready)
    const data = query.data

    return (
        <div className="space-y-5 pb-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Analytics</h1>
                <p className="mt-1 text-sm text-slate-500">Fuel used, efficiency, refills and tank level over time, for the whole fleet or the vehicles you choose.</p>
            </div>

            <FuelTabs active="Analytics" />

            <AnalyticsFilters value={filters} onChange={setFilters} clusters={clusters} />

            {query.isError && !data ? (
                <QueryError message="Failed to load fuel analytics." />
            ) : !data ? (
                <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading fuel analytics…</p>
            ) : (
                <>
                    <p className="text-sm text-slate-500">
                        {data.period.from} to {data.period.to} · {data.vehicles} vehicle{data.vehicles === 1 ? '' : 's'}
                        {query.isFetching && ' · updating…'}
                    </p>
                    <AnalyticsKpis data={data} />
                    <LevelHistory data={data} />
                    <UsageCharts data={data} />
                    <RefillsTable refills={data.refills} />
                    <DrainsTable drains={data.drains} />
                    <VehicleTable rows={data.by_vehicle} />
                </>
            )}
        </div>
    )
}
