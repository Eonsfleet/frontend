'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { QueryError } from '@/components/shared/QueryError'
import { OverviewHeader } from './components/OverviewHeader'
import { KpiSection } from './components/KpiSection'
import { RealtimeTrackingCard } from './components/RealtimeTrackingCard'
import { VehicleListCard } from './components/VehicleListCard'
import { FuelDistributionCard } from './components/FuelDistributionCard'
import { LowFuelAlertsCard } from './components/LowFuelAlertsCard'
import { TrendChartCard } from './components/TrendChartCard'
import { TopConsumersCard } from './components/TopConsumersCard'
import { SummaryMetrics } from './components/SummaryMetrics'
import { useFuelOverview, useFuelTrends, type FuelOverviewRange } from './components/useFuelOverview'
import type { MapMarkerPoint, FeaturedVehicle } from './components/FuelTrackingMap'

/** Default the range to the current month. */
function defaultRange(): FuelOverviewRange {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') }
}

export default function FuelOverviewPage() {
    const [range] = useState<FuelOverviewRange>(defaultRange)

    const {
        kpi,
        vehicles,
        distribution,
        lowFuelAlerts,
        topConsumers,
        summary,
        theftIncidents,
        isLoading,
        isError,
    } = useFuelOverview(range)
    const trends = useFuelTrends(range)

    const rangeLabel = useMemo(() => {
        const s = new Date(range.startDate)
        const e = new Date(range.endDate)
        return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
    }, [range])

    // Map markers come from theft/abnormality incidents that carry coordinates.
    const markers = useMemo<MapMarkerPoint[]>(
        () =>
            theftIncidents
                .filter((i) => i.location?.lat != null && i.location?.lng != null)
                .map((i) => ({ id: i.alert_id, lat: i.location.lat, lng: i.location.lng })),
        [theftIncidents],
    )

    // Feature the highest-fuel online vehicle in the overlay card.
    const featured = useMemo<FeaturedVehicle | null>(() => {
        const candidate =
            vehicles.find((v) => v.online && v.fuelPercent != null) ??
            vehicles.find((v) => v.fuelPercent != null) ??
            vehicles[0]
        if (!candidate) return null
        return {
            registration: candidate.registration,
            status: candidate.online ? 'Moving' : 'Parked',
            fuelPercent: candidate.fuelPercent,
            fuelLiters: candidate.fuelLiters,
            consumptionLph: 3.2,
            location: '—',
            lastUpdated: format(new Date(), 'hh:mm a'),
        }
    }, [vehicles])

    return (
        <div className="space-y-6">
            <OverviewHeader rangeLabel={rangeLabel} />

            {isError ? (
                <QueryError message="Failed to load fuel overview." />
            ) : (
                <>
                    {/* KPI summary */}
                    <KpiSection kpi={kpi} isLoading={isLoading} />

                    {/* Main dashboard: 12-col → map(6) / list(3) / right(3) */}
                    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-5">
                            <RealtimeTrackingCard markers={markers} featured={featured} vehicles={vehicles} />
                        </div>
                        <div className="lg:col-span-4">
                            <VehicleListCard vehicles={vehicles} isLoading={isLoading} />
                        </div>
                        <div className="flex flex-col gap-3 lg:col-span-3">
                            <FuelDistributionCard bands={distribution} total={kpi.totalVehicles} />
                            <LowFuelAlertsCard alerts={lowFuelAlerts} className="flex-1" />
                        </div>
                    </div>

                    {/* Analytics: consumption / efficiency / top consumers */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <TrendChartCard
                            title="Fuel Consumption Trend"
                            data={trends.consumption}
                            color="#3b82f6"
                            formatValue={(v) => `${v.toLocaleString()} L`}
                        />
                        <TrendChartCard
                            title="Fuel Efficiency (km/L)"
                            data={trends.efficiency}
                            color="#8b5cf6"
                            formatValue={(v) => `${v} km/L`}
                        />
                        <TopConsumersCard consumers={topConsumers} />
                    </div>

                    {/* Bottom summary metrics */}
                    <SummaryMetrics data={summary} />
                </>
            )}
        </div>
    )
}
