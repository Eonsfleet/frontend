'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AnalyticsFilterBar } from '@/components/analytics/shell/AnalyticsFilterBar'
import { FreshnessBar } from '@/components/analytics/overview/FreshnessBar'
import { KpiCard } from '@/components/analytics/kit/KpiCard'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { Donut, RankedBars, type BarRow, type Slice } from '@/components/analytics/fleet/charts'
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { useInView } from '@/hooks/analytics/useInView'
import { useIncidentSummary, useIncidentTrend } from '@/hooks/analytics/useOverviewQueries'
import { useIncidentPriorities, useIncidentResolution, useIncidentTypes, useIncidentVehicles } from '@/hooks/analytics/useIncidentQueries'
import { evaluateWidget } from '@/lib/analytics/applicability'
import { formatNumber } from '@/components/analytics/telemetry/format'

const PERIODS = ['7d', '30d', '90d', '1y'] as const
const idle = { isPending: false, isError: false, error: null, refetch: () => undefined }
const count = (n: number) => n.toLocaleString('en-GB')
const days = (n: number) => `${formatNumber(n, 1)} days`
const pretty = (key: string | null) => (key ? key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Unspecified')

/**
 * The Incidents tab, rebuilt as charts. Only "over time" follows the period; every
 * other card is all-time and says so, because the backend reads no period for them.
 * There are no vehicle, driver or cluster filters on these endpoints, and a
 * driver-role user is shown only their own incidents. The resolution figure is the
 * time from creation to the last update, not a true time to resolve (the backend
 * keeps no resolved date), and the card says that too.
 */
export function IncidentsV2() {
    const { filters } = useAnalyticsFilters()

    const summaryEval = useMemo(() => evaluateWidget('incident-summary', filters), [filters])
    const trendEval = useMemo(() => evaluateWidget('incidents-trend', filters), [filters])
    const typesEval = useMemo(() => evaluateWidget('incidents-types', filters), [filters])
    const priorityEval = useMemo(() => evaluateWidget('incidents-priority', filters), [filters])
    const resolutionEval = useMemo(() => evaluateWidget('incidents-resolution', filters), [filters])
    const vehiclesEval = useMemo(() => evaluateWidget('incidents-vehicles', filters), [filters])

    const summary = useIncidentSummary(true)
    const trend = useIncidentTrend(filters, trendEval.range === 'applied')

    const { ref: midRef, seen: midSeen } = useInView<HTMLDivElement>()
    const types = useIncidentTypes(midSeen)
    const priorities = useIncidentPriorities(midSeen)

    const { ref: lowRef, seen: lowSeen } = useInView<HTMLDivElement>()
    const resolution = useIncidentResolution(lowSeen)
    const vehicles = useIncidentVehicles(lowSeen)

    const s = summary.data
    // `open` is everything not closed, resolved, dismissed or cancelled (and includes escalated), so what is left of the total is cancelled.
    const statusSlices: Slice[] = s
        ? [
              { label: 'Open', value: s.open, color: 'var(--an-chart-4)' },
              { label: 'Resolved', value: s.resolved, color: 'var(--an-good)' },
              { label: 'Closed', value: s.closed, color: 'var(--an-chart-1)' },
              { label: 'Dismissed', value: s.dismissed, color: 'var(--an-muted)' },
              { label: 'Cancelled', value: Math.max(0, s.total - s.open - s.resolved - s.closed - s.dismissed), color: 'var(--an-chart-5)' },
          ].filter((x) => x.value > 0)
        : []

    const points = (trend.data?.labels ?? []).map((label, i) => ({ label, count: trend.data?.data[i] ?? 0 }))

    const typeSlices: Slice[] = (types.data ?? []).map((t, i) => ({ label: pretty(t.type), value: t.count, color: `var(--an-chart-${(i % 5) + 1})` }))
    const prioritySlices: Slice[] = (priorities.data ?? []).map((p, i) => ({ label: pretty(p.priority), value: p.count, color: `var(--an-chart-${(i % 5) + 1})` }))

    const resolutionBars: BarRow[] = (resolution.data?.by_type ?? [])
        .filter((r) => r.avg_days !== null)
        .map((r) => ({ id: '', label: pretty(r.type), value: r.avg_days as number }))
    const vehicleBars: BarRow[] = (vehicles.data ?? []).map((v) => ({ id: v.vehicle_id, label: v.registration_number ?? `Vehicle ${v.vehicle_id}`, value: v.incident_count }))

    return (
        <div className="space-y-5">
            <AnalyticsFilterBar entities={false} compare={false} presets={PERIODS} custom={false} />
            <FreshnessBar />

            <div className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame title="Incidents by status" evaluation={summaryEval} query={summary} isEmpty={!!s && s.total === 0} emptyText="No incidents recorded.">
                    {s && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <KpiCard label="Total" value={formatNumber(s.total, 0)} />
                                <KpiCard label="Open" value={formatNumber(s.open, 0)} tone={s.open > 0 ? 'warn' : 'default'} note="Includes escalated" />
                                <KpiCard label="Escalated" value={formatNumber(s.escalated, 0)} tone={s.escalated > 0 ? 'bad' : 'default'} />
                            </div>
                            <Donut slices={statusSlices} centerLabel="incidents" ariaLabel="Incidents by status" />
                            <Link href="/incidents" className="inline-block text-xs font-medium text-an-accent hover:underline">
                                Open all incidents
                            </Link>
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame
                    title="Incidents over time"
                    evaluation={trendEval}
                    query={trend}
                    isEmpty={!!trend.data && points.length === 0}
                    emptyText="No incidents in this period."
                >
                    <div className="space-y-2">
                        <div className="h-64 w-full" role="img" aria-label="Incidents per period">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="var(--an-border)" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} minTickGap={24} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                                    <Tooltip cursor={{ fill: 'var(--an-surface-muted)' }} />
                                    <Bar dataKey="count" name="Incidents" fill="var(--an-chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-an-muted">Periods with no incidents are not shown.</p>
                        <ul className="sr-only">
                            {points.map((p) => (
                                <li key={p.label}>
                                    {p.label}: {p.count}
                                </li>
                            ))}
                        </ul>
                    </div>
                </WidgetFrame>
            </div>

            <div ref={midRef} className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame
                    title="Incidents by type"
                    evaluation={typesEval}
                    query={midSeen ? types : idle}
                    isEmpty={!midSeen || (!!types.data && typeSlices.length === 0)}
                    emptyText={midSeen ? 'No incidents recorded.' : 'Loads when scrolled into view.'}
                >
                    <Donut slices={typeSlices} centerLabel="incidents" ariaLabel="Incidents by type" />
                </WidgetFrame>
                <WidgetFrame
                    title="Incidents by priority"
                    evaluation={priorityEval}
                    query={midSeen ? priorities : idle}
                    isEmpty={!midSeen || (!!priorities.data && prioritySlices.length === 0)}
                    emptyText={midSeen ? 'No incidents recorded.' : 'Loads when scrolled into view.'}
                >
                    <Donut slices={prioritySlices} centerLabel="incidents" ariaLabel="Incidents by priority" />
                </WidgetFrame>
            </div>

            <div ref={lowRef} className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame
                    title="Time from report to last update"
                    evaluation={resolutionEval}
                    query={lowSeen ? resolution : idle}
                    isEmpty={!lowSeen || (!!resolution.data && resolution.data.overall_avg_days === null)}
                    emptyText={lowSeen ? 'No incident has been resolved or closed yet.' : 'Loads when scrolled into view.'}
                >
                    {resolution.data && resolution.data.overall_avg_days !== null && (
                        <div className="space-y-3">
                            <KpiCard label="Average, resolved and closed incidents" value={days(resolution.data.overall_avg_days)} />
                            <RankedBars rows={resolutionBars} format={days} metricLabel="days" hrefFor={() => ''} subject="incident types" />
                            <p className="text-xs text-an-muted">
                                Measured from when an incident was reported to its last update. The system keeps no resolved date, so a later edit makes an incident look slower to resolve.
                            </p>
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame
                    title="Vehicles with the most incidents"
                    evaluation={vehiclesEval}
                    query={lowSeen ? vehicles : idle}
                    isEmpty={!lowSeen || (!!vehicles.data && vehicleBars.length === 0)}
                    emptyText={lowSeen ? 'No incident is linked to a vehicle.' : 'Loads when scrolled into view.'}
                >
                    <RankedBars rows={vehicleBars} format={count} metricLabel="incidents" hrefFor={(id) => `/vehicles/${id}`} subject="vehicles" />
                </WidgetFrame>
            </div>
        </div>
    )
}
