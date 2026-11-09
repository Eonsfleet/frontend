'use client'

import { useMemo } from 'react'
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { KpiCard } from '@/components/analytics/kit/KpiCard'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { evaluateWidget } from '@/lib/analytics/applicability'
import type { AnalyticsFilters } from '@/lib/analytics/filters'
import { useIncidentSummary, useIncidentTrend, useTripCounts } from '@/hooks/analytics/useOverviewQueries'
import { useInView } from '@/hooks/analytics/useInView'
import { formatDate, formatNumber } from '@/components/analytics/telemetry/format'

const idle = { isPending: false, isError: false, error: null, refetch: () => undefined }

/** Incident counts (all time) beside the incidents trend for the chosen period. */
export function IncidentsPanel({ filters }: { filters: AnalyticsFilters }) {
    const trendEval = useMemo(() => evaluateWidget('incidents-trend', filters), [filters])
    const summaryEval = useMemo(() => evaluateWidget('incident-summary', filters), [filters])
    const { ref, seen } = useInView<HTMLDivElement>()
    const summary = useIncidentSummary(seen)
    const trend = useIncidentTrend(filters, seen && trendEval.range === 'applied')

    const points = (trend.data?.labels ?? []).map((label, i) => ({ label, count: trend.data?.data[i] ?? 0 }))

    return (
        <div ref={ref} className="space-y-4">
            <WidgetFrame title="Incidents" evaluation={summaryEval} query={seen ? summary : idle} isEmpty={!seen} emptyText="Loads when scrolled into view.">
                {summary.data && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <KpiCard label="Total" value={formatNumber(summary.data.total, 0)} />
                        <KpiCard label="Open" value={formatNumber(summary.data.open, 0)} tone={summary.data.open > 0 ? 'warn' : 'default'} />
                        <KpiCard label="Resolved" value={formatNumber(summary.data.resolved, 0)} />
                        <KpiCard label="Escalated" value={formatNumber(summary.data.escalated, 0)} tone={summary.data.escalated > 0 ? 'bad' : 'default'} />
                    </div>
                )}
            </WidgetFrame>
            <WidgetFrame
                title="Incidents over time"
                evaluation={trendEval}
                query={seen ? trend : idle}
                isEmpty={!seen || (!!trend.data && points.length === 0)}
                emptyText={seen ? 'No incidents in this period.' : 'Loads when scrolled into view.'}
            >
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="var(--an-border)" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} minTickGap={24} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" name="Incidents" stroke="var(--an-chart-1)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </WidgetFrame>
        </div>
    )
}

/** Trips the trackers recorded. The backend marks a period that starts before its 60-day store as partial. */
export function TripsCard({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('trips', filters), [filters])
    const { ref, seen } = useInView<HTMLDivElement>()
    const query = useTripCounts(filters, seen && evaluation.range === 'applied')
    const data = query.data

    return (
        <div ref={ref}>
            <WidgetFrame title="Trips recorded" evaluation={evaluation} query={seen ? query : idle} isEmpty={!seen} emptyText="Loads when scrolled into view.">
                {data && (
                    <div className="space-y-2">
                        <KpiCard label="Trips recorded by trackers" value={formatNumber(data.device_trips, 0)} />
                        {data.device_trips_partial && (
                            <p className="rounded-md bg-an-warn-soft px-2.5 py-1.5 text-xs text-an-warn">
                                This period starts before the 60 days for which tracker trips are kept, so the count is incomplete.
                            </p>
                        )}
                        <p className="text-xs text-an-muted">
                            {formatDate(data.period.start)} to {formatDate(data.period.end)}
                        </p>
                    </div>
                )}
            </WidgetFrame>
        </div>
    )
}
