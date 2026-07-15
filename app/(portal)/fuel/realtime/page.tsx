'use client'

import { useState } from 'react'
import { QueryError } from '@/components/shared/QueryError'
import { FuelTabs } from '../components/FuelTabs'
import { RealtimeVehicleRail } from '../components/RealtimeVehicleRail'
import { RealtimeMap } from '../components/RealtimeMap'
import { VehicleDetailPanel } from '../components/VehicleDetailPanel'
import { RealtimeTrendCard } from '../components/RealtimeTrendCard'
import { RecentFuelEventsCard } from '../components/RecentFuelEventsCard'
import { useFuelRealtime } from '../components/useFuelRealtime'
import type { FuelLevelTrendFilter, FuelRateTrendFilter } from '@/lib/api/fuel'

const LEVEL_TREND_FILTERS: Array<{ label: string; value: FuelLevelTrendFilter }> = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
]

const RATE_TREND_FILTERS: Array<{ label: string; value: FuelRateTrendFilter }> = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
]

export default function FuelRealtimePage() {
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [levelTrendFilter, setLevelTrendFilter] = useState<FuelLevelTrendFilter>('daily')
    const [rateTrendFilter, setRateTrendFilter] = useState<FuelRateTrendFilter>('daily')
    const [eventsPage, setEventsPage] = useState(1)
    const {
        vehicles,
        activeId,
        detail,
        fuelLevelTrend,
        fuelLevelTrendUnit,
        fuelFlowTrend,
        fuelFlowTrendUnit,
        events,
        eventsPagination,
        isFuelLevelTrendLoading,
        isFuelFlowTrendLoading,
        isEventsLoading,
        isEventsRefreshing,
        isLoading,
        isError,
    } =
        useFuelRealtime(selectedId, levelTrendFilter, eventsPage, rateTrendFilter)

    const plate = detail?.registration ?? 'All Vehicles'
    const handleVehicleSelect = (id: number) => {
        setSelectedId(id)
        setEventsPage(1)
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Real-time Fuel Tracking</h1>
                    <p className="mt-1 text-sm text-slate-500">Monitor live fuel level, consumption and events in real-time.</p>
                </div>
            </div>

            <FuelTabs active="Real-time Tracking" />

            {isError ? (
                <QueryError message="Failed to load real-time tracking." />
            ) : (
                <>
                    {/* Main row: rail | map | detail (detail only shows once a vehicle is picked) */}
                    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
                        <div className="h-[min(560px,calc(100vh-260px))] min-h-[420px] lg:col-span-3">
                            <RealtimeVehicleRail
                                vehicles={vehicles}
                                activeId={activeId}
                                onSelect={handleVehicleSelect}
                                isLoading={isLoading}
                            />
                        </div>
                        <div className={detail ? 'h-[min(560px,calc(100vh-260px))] min-h-[420px] lg:col-span-6' : 'h-[min(560px,calc(100vh-260px))] min-h-[420px] lg:col-span-9'}>
                            <RealtimeMap vehicles={vehicles} activeId={activeId} onSelect={handleVehicleSelect} />
                        </div>
                        {detail && (
                            <div className="h-[min(560px,calc(100vh-260px))] min-h-[420px] lg:col-span-3">
                                <VehicleDetailPanel detail={detail} onClose={() => {
                                    setSelectedId(null)
                                    setEventsPage(1)
                                }} />
                            </div>
                        )}
                    </div>

                    {/* Analytics row */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <RealtimeTrendCard
                            title="Fuel Level Trend"
                            unit={fuelLevelTrendUnit}
                            data={fuelLevelTrend}
                            color="#3b82f6"
                            filters={[plate]}
                            filterOptions={LEVEL_TREND_FILTERS}
                            selectedFilter={levelTrendFilter}
                            onFilterChange={(filter) => setLevelTrendFilter(filter as FuelLevelTrendFilter)}
                            isLoading={isFuelLevelTrendLoading}
                            formatValue={(v) => v == null ? 'No data' : `${v} ${fuelLevelTrendUnit}`}
                            emptyMessage={activeId == null ? 'Select a vehicle to view its fuel level trend' : 'No data available for this period'}
                        />
                        <RealtimeTrendCard
                            title="Fuel Flow Rate"
                            unit={fuelFlowTrendUnit}
                            data={fuelFlowTrend}
                            color="#10b981"
                            filters={[plate]}
                            filterOptions={RATE_TREND_FILTERS}
                            selectedFilter={rateTrendFilter}
                            onFilterChange={(filter) => setRateTrendFilter(filter as FuelRateTrendFilter)}
                            isLoading={isFuelFlowTrendLoading}
                            formatValue={(v) => v == null ? 'No data' : `${v} ${fuelFlowTrendUnit}`}
                            emptyMessage={activeId == null ? 'Select a vehicle to view its fuel flow rate' : 'No data available for this period'}
                        />
                        <RecentFuelEventsCard
                            events={events}
                            isLoading={isEventsLoading}
                            isRefreshing={isEventsRefreshing}
                            pagination={eventsPagination}
                            onPageChange={setEventsPage}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Showing real-time data
                            </span>
                            <span className="text-slate-400">Auto refresh every 60 seconds</span>
                        </div>
                        <span className="inline-flex items-center gap-2">
                            Data accuracy
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                                98.6%
                            </span>
                        </span>
                    </div>
                </>
            )}
        </div>
    )
}
