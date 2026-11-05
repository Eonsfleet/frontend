'use client'

import { useMemo } from 'react'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { evaluateWidget } from '@/lib/analytics/applicability'
import type { AnalyticsFilters } from '@/lib/analytics/filters'
import { useFleetHealth } from '@/hooks/analytics/useOverviewQueries'
import { formatDateTime } from '@/components/analytics/telemetry/format'
import type { FleetHealthComponents } from '@/types/analytics'

/**
 * The backend's overall score is not shown yet: it counts completed maintenance
 * schedules as overdue, scores missing fuel data as perfect, and gives an empty
 * fleet 70. Flip this when those are corrected on the backend. The four
 * factors below are shown as the backend returns them.
 */
export const OVERALL_SCORE_VERIFIED = false

const FACTORS: { key: keyof FleetHealthComponents; label: string; meaning: string; caveat?: string }[] = [
    { key: 'vehicle_active_rate', label: 'Vehicles in service', meaning: 'Share of vehicles that are active or on a trip right now.' },
    {
        key: 'maintenance_compliance',
        label: 'Maintenance on schedule',
        meaning: 'Share of maintenance schedules that are not past their due date.',
        caveat: 'Completed schedules are currently counted as overdue, so this can read low. An organization with no schedules reads 100.',
    },
    { key: 'incident_free_rate', label: 'Vehicles without incidents', meaning: 'Share of vehicles with no incident in the last 30 days.' },
    {
        key: 'fuel_efficiency_score',
        label: 'Fuel efficiency',
        meaning: 'Fuel use over the last 30 days compared with each vehicle’s baseline.',
        caveat: 'Reads 100 when there is no fuel data or no baseline, so 100 does not always mean efficient.',
    },
]

export function HealthPanel({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('health', filters), [filters])
    const query = useFleetHealth()
    const data = query.data
    const empty = !!data && data.total_vehicles === 0

    return (
        <WidgetFrame
            title="Fleet health"
            evaluation={evaluation}
            query={query}
            isEmpty={empty}
            emptyText="No vehicles yet, so there is nothing to score."
        >
            {data && (
                <div className="space-y-4">
                    <ul className="space-y-3">
                        {FACTORS.map((factor) => {
                            const value = data.components[factor.key]
                            return (
                                <li key={factor.key}>
                                    <div className="flex items-baseline justify-between gap-2 text-sm">
                                        <span className="font-medium text-an-text">{factor.label}</span>
                                        <span className="tabular-nums text-an-text">{value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%</span>
                                    </div>
                                    <div
                                        role="meter"
                                        aria-label={factor.label}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={value}
                                        className="mt-1 h-2 overflow-hidden rounded-full bg-an-surface-muted"
                                    >
                                        <div className="h-full rounded-full bg-an-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                                    </div>
                                    <p className="mt-1 text-xs text-an-muted">{factor.meaning}</p>
                                    {factor.caveat && <p className="mt-0.5 text-xs text-an-warn">{factor.caveat}</p>}
                                </li>
                            )
                        })}
                    </ul>
                    {OVERALL_SCORE_VERIFIED ? null : (
                        <p className="rounded-md bg-an-surface-muted px-2.5 py-2 text-xs text-an-muted">
                            An overall score will appear here once its data-quality checks are in place. Updated {formatDateTime(data.computed_at)}.
                        </p>
                    )}
                </div>
            )}
        </WidgetFrame>
    )
}
