'use client'

import { useMemo } from 'react'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { evaluateWidget } from '@/lib/analytics/applicability'
import type { AnalyticsFilters } from '@/lib/analytics/filters'
import { useFleetHealth } from '@/hooks/analytics/useOverviewQueries'
import { formatDateTime } from '@/components/analytics/telemetry/format'
import { cn } from '@/lib/utils'
import type { FleetHealthComponents, FleetHealthScore, HealthRating } from '@/types/analytics'

const FACTORS: { key: keyof FleetHealthComponents; label: string; meaning: string; oldBackendCaveat?: string }[] = [
    { key: 'vehicle_active_rate', label: 'Vehicles in service', meaning: 'Share of vehicles that are active or on a trip right now.' },
    {
        key: 'maintenance_compliance',
        label: 'Maintenance on schedule',
        meaning: 'Share of maintenance schedules that are not past their due date.',
        oldBackendCaveat: 'Completed schedules are currently counted as overdue, so this can read low. An organization with no schedules reads 100.',
    },
    { key: 'incident_free_rate', label: 'Vehicles without incidents', meaning: 'Share of vehicles with no incident in the last 30 days.' },
    {
        key: 'fuel_efficiency_score',
        label: 'Fuel efficiency',
        meaning: 'Fuel use over the last 30 days compared with each vehicle’s baseline.',
        oldBackendCaveat: 'Reads 100 when there is no fuel data or no baseline, so 100 does not always mean efficient.',
    },
]

const RATING: Record<HealthRating, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' }
const RATING_TONE: Record<HealthRating, string> = {
    excellent: 'bg-an-good-soft text-an-good',
    good: 'bg-an-good-soft text-an-good',
    fair: 'bg-an-warn-soft text-an-warn',
    poor: 'bg-an-bad-soft text-an-bad',
}

/** Writes the backend's weights, e.g. "30%, 30%, 20% and 20%", in the order the factors are listed. */
const weightsText = (data: FleetHealthScore) =>
    data.weights ? FACTORS.map((f) => `${Math.round((data.weights![f.key] ?? 0) * 100)}%`).join(', ').replace(/, ([^,]*)$/, ' and $1') : null

/**
 * The four factors behind the fleet's health, and the overall score when the
 * backend vouches for it. The corrected backend sends `status`: 'ok' means every
 * factor had data and `score` is real; 'insufficient_data' names the factors it
 * could not measure; 'empty_fleet' means there is nothing to score. An older
 * backend sends no `status`, and its score counted completed schedules as
 * overdue and missing fuel data as perfect, so then only the factors are shown,
 * with those caveats.
 */
export function HealthPanel({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('health', filters), [filters])
    const query = useFleetHealth()
    const data = query.data
    const empty = !!data && (data.status === 'empty_fleet' || data.total_vehicles === 0)
    const verified = data?.status !== undefined
    const missing = new Set(data?.missing ?? [])

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
                    {data.status === 'ok' && data.score !== null && data.rating !== null && (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-an-surface-muted px-4 py-3">
                            <span className="text-4xl font-semibold tabular-nums text-an-text">{Math.round(data.score)}</span>
                            <span className="text-sm text-an-muted">out of 100</span>
                            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', RATING_TONE[data.rating])}>{RATING[data.rating]}</span>
                        </div>
                    )}
                    <ul className="space-y-3">
                        {FACTORS.map((factor) => {
                            const value = data.components[factor.key]
                            return (
                                <li key={factor.key}>
                                    <div className="flex items-baseline justify-between gap-2 text-sm">
                                        <span className="font-medium text-an-text">{factor.label}</span>
                                        {value === null ? (
                                            <span className="text-an-muted">No data</span>
                                        ) : (
                                            <span className="tabular-nums text-an-text">{value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%</span>
                                        )}
                                    </div>
                                    {value !== null && (
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
                                    )}
                                    <p className="mt-1 text-xs text-an-muted">{factor.meaning}</p>
                                    {!verified && factor.oldBackendCaveat && <p className="mt-0.5 text-xs text-an-warn">{factor.oldBackendCaveat}</p>}
                                </li>
                            )
                        })}
                    </ul>
                    <p className="rounded-md bg-an-surface-muted px-2.5 py-2 text-xs text-an-muted">
                        {data.status === 'ok'
                            ? `The overall score weights the four factors ${weightsText(data) ?? 'as the backend defines'}. Updated ${formatDateTime(data.computed_at)}.`
                            : data.status === 'insufficient_data'
                              ? `No overall score yet: there is no data for ${FACTORS.filter((f) => missing.has(f.key)).map((f) => f.label.toLowerCase()).join(' and ') || 'one of the factors'}. Updated ${formatDateTime(data.computed_at)}.`
                              : `An overall score will appear here once its data-quality checks are in place. Updated ${formatDateTime(data.computed_at)}.`}
                    </p>
                </div>
            )}
        </WidgetFrame>
    )
}
