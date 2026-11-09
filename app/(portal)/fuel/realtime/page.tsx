'use client'

import { useState } from 'react'
import { Activity, Fuel, Radio, RefreshCw, TriangleAlert } from 'lucide-react'
import { FuelTabs } from '../components/FuelTabs'
import { RealtimeVehicleRail } from '../components/RealtimeVehicleRail'
import { RealtimeMap } from '../components/RealtimeMap'
import { VehicleDetailPanel } from '../components/VehicleDetailPanel'
import { RealtimeTrendCard } from '../components/RealtimeTrendCard'
import { RecentFuelEventsCard } from '../components/RecentFuelEventsCard'
import { useFuelRealtime } from '../components/useFuelRealtime'
import { cn } from '@/lib/utils'
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
        kpis,
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
    } =
        useFuelRealtime(selectedId, levelTrendFilter, eventsPage, rateTrendFilter)

    const plate = detail?.registration ?? 'All Vehicles'
    const handleVehicleSelect = (id: number) => {
        setSelectedId(id)
        setEventsPage(1)
    }

    return (
        <div className="space-y-5 pb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Real-time Fuel Tracking</h1>
                    <p className="mt-1 text-sm text-slate-500">Monitor live fuel levels, connected vehicles, locations, and fuel events from supported devices.</p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[12px] font-semibold text-[#0055FF]">
                    <RefreshCw className="h-4 w-4" />
                    Auto refresh: 10s vehicles · 60s events
                </div>
            </div>

            <FuelTabs active="Real-time Tracking" />

            <div className="grid gap-2 rounded-2xl bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
                <RealtimeStat label="Online Vehicles" value={`${kpis.online}/${kpis.total}`} icon={Radio} tone="blue" />
                <RealtimeStat label="Online Rate" value={`${kpis.onlinePercent}%`} icon={Activity} tone="emerald" />
                <RealtimeStat label="Low Fuel" value={kpis.lowFuelCount.toLocaleString()} icon={TriangleAlert} tone="amber" />
                <RealtimeStat label="Total Fuel" value={`${kpis.totalFuelLiters.toLocaleString()} L`} icon={Fuel} tone="blue" />
            </div>

            <div
                className={cn(
                    'grid min-h-0 grid-cols-1 gap-4 xl:h-[620px]',
                    detail ? 'xl:grid-cols-[320px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[320px_minmax(0,1fr)]',
                )}
            >
                <div className="h-[420px] min-h-0 min-w-0 sm:h-[500px] xl:h-full">
                    <RealtimeVehicleRail
                        vehicles={vehicles}
                        activeId={activeId}
                        onSelect={handleVehicleSelect}
                        isLoading={isLoading}
                    />
                </div>
                <div className="h-[420px] min-h-0 min-w-0 sm:h-[500px] xl:h-full">
                    <RealtimeMap vehicles={vehicles} activeId={activeId} onSelect={handleVehicleSelect} />
                </div>
                {detail && (
                    <div className="h-[420px] min-h-0 min-w-0 sm:h-[500px] xl:h-full">
                        <VehicleDetailPanel detail={detail} onClose={() => {
                            setSelectedId(null)
                            setEventsPage(1)
                        }} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
                <RealtimeTrendCard
                    title="Fuel Level Trend"
                    unit={fuelLevelTrendUnit}
                    data={fuelLevelTrend}
                    color="#0055FF"
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
        </div>
    )
}

function RealtimeStat({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string
    value: string
    icon: typeof Activity
    tone: 'blue' | 'emerald' | 'amber' | 'slate'
}) {
    const toneClass = {
        blue: 'bg-blue-50 text-[#0055FF]',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        slate: 'bg-slate-100 text-slate-600',
    }[tone]

    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-0.5 truncate text-lg font-bold text-slate-900">{value}</p>
            </div>
        </div>
    )
}
