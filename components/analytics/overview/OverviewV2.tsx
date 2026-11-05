'use client'

import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { AnalyticsFilterBar } from '@/components/analytics/shell/AnalyticsFilterBar'
import { AlarmsPanel } from './AlarmsPanel'
import { AlertsPanel } from './AlertsPanel'
import { AnomaliesPanel } from './AnomaliesPanel'
import { FreshnessBar } from './FreshnessBar'
import { HealthPanel } from './HealthPanel'
import { IncidentsPanel, TripsCard } from './IncidentsPanel'
import { DeviceStatusTile, FleetStatusTile } from './StatusTiles'

/**
 * The rebuilt Overview. Above the fold: health, fleet and device status, active
 * alerts, and alarms (about six requests). Everything below starts loading only
 * when scrolled near. Money and distance cards are not here until the backend
 * unit contracts are verified.
 */
export function OverviewV2() {
    const { filters } = useAnalyticsFilters()

    return (
        <div className="space-y-5">
            <AnalyticsFilterBar />
            <FreshnessBar />

            <div className="grid gap-4 lg:grid-cols-3">
                <HealthPanel filters={filters} />
                <div className="space-y-4">
                    <FleetStatusTile filters={filters} />
                    <DeviceStatusTile filters={filters} />
                </div>
                <AlertsPanel filters={filters} />
            </div>

            <AlarmsPanel filters={filters} />

            <div className="grid gap-4 lg:grid-cols-2">
                <AnomaliesPanel filters={filters} />
                <div className="space-y-4">
                    <IncidentsPanel filters={filters} />
                    <TripsCard filters={filters} />
                </div>
            </div>
        </div>
    )
}
