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

export default function FuelRealtimePage() {
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const { vehicles, activeId, detail, fuelLevelTrend, fuelFlowTrend, events, isLoading, isError } =
        useFuelRealtime(selectedId)

    const plate = detail?.registration ?? 'Vehicle'

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
                        <div className="lg:col-span-3">
                            <RealtimeVehicleRail
                                vehicles={vehicles}
                                activeId={activeId}
                                onSelect={setSelectedId}
                                isLoading={isLoading}
                            />
                        </div>
                        <div className={detail ? 'lg:col-span-6' : 'lg:col-span-9'}>
                            <RealtimeMap vehicles={vehicles} activeId={activeId} onSelect={setSelectedId} />
                        </div>
                        {detail && (
                            <div className="lg:col-span-3 lg:self-start">
                                <VehicleDetailPanel detail={detail} onClose={() => setSelectedId(null)} />
                            </div>
                        )}
                    </div>

                    {/* Analytics row */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <RealtimeTrendCard
                            title="Fuel Level Trend"
                            unit="L"
                            data={fuelLevelTrend}
                            color="#3b82f6"
                            filters={[plate, 'Last 24 Hours']}
                            formatValue={(v) => `${v} L`}
                        />
                        <RealtimeTrendCard
                            title="Fuel Flow Rate"
                            unit="L/h"
                            data={fuelFlowTrend}
                            color="#10b981"
                            filters={[plate, 'Live']}
                            formatValue={(v) => `${v} L/h`}
                        />
                        <RecentFuelEventsCard events={events} />
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Showing real-time data
                            </span>
                            <span className="text-slate-400">Auto refresh every 10 seconds</span>
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
