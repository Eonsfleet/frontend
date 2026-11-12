'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AnalyticsFilterBar } from '@/components/analytics/shell/AnalyticsFilterBar'
import { FreshnessBar } from '@/components/analytics/overview/FreshnessBar'
import { KpiCard } from '@/components/analytics/kit/KpiCard'
import { Segmented } from '@/components/analytics/kit/Segmented'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { useInView } from '@/hooks/analytics/useInView'
import { useReportCatalog } from '@/hooks/analytics/useOverviewQueries'
import {
    useAvailabilitySnapshot,
    useAvailabilityTrend,
    useFleetSummary,
    useFleetTrips,
    useTrackerHealth,
    useVehicleAlarms,
} from '@/hooks/analytics/useFleetQueries'
import { evaluateWidget } from '@/lib/analytics/applicability'
import { buildReportLink } from '@/lib/analytics/reportLinks'
import { formatDate, formatDuration, formatNumber } from '@/components/analytics/telemetry/format'
import { cn } from '@/lib/utils'
import type { ActivitySource } from '@/types/analytics'
import { Donut, VehicleBars, type BarRow, type Slice } from './charts'

const PERIODS = ['7d', '30d'] as const
const idle = { isPending: false, isError: false, error: null, refetch: () => undefined }

/** The backend names a vehicle whose status it cannot resolve "status_" or "status_<id>". */
const pretty = (slug: string) =>
    /^status_\d*$/.test(slug) ? 'Unknown status' : slug.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** What "active" meant for this period, in the backend's own terms. */
export const ACTIVITY_MEANING: Record<ActivitySource, string> = {
    gps_odometer: 'A vehicle counts as active if it moved at least once in the period (GPS odometer).',
    vehicle_locations: 'A vehicle counts as active if it reported a location in the period.',
    trips: 'A vehicle counts as active if it had a trip in the period.',
    status_snapshot: 'No GPS or trip activity was recorded in this period, so this shows vehicles that are active today. It does not depend on the period.',
}

type Metric = 'trips' | 'trip_time' | 'idle' | 'alarms'

const METRICS: { id: Metric; label: string; format: (n: number) => string }[] = [
    { id: 'trips', label: 'Trips', format: (n) => n.toLocaleString('en-GB') },
    { id: 'trip_time', label: 'Trip time', format: (n) => formatDuration(n) },
    { id: 'idle', label: 'Idle time', format: (n) => formatDuration(n) },
    { id: 'alarms', label: 'Alarms', format: (n) => n.toLocaleString('en-GB') },
]

/**
 * The Fleet tab: fleet and GPS in one page, charts first and no tables. The
 * cards that come from the older fleet endpoints (activity, status today,
 * active over time) cover the whole fleet; the tracker-store cards (trips,
 * trackers, vehicle bars) honor the vehicle, driver and cluster filters, and
 * each card says which it does. Distance is left out until its units are
 * verified. Lists live in Reports, linked from each card.
 */
export function FleetV2() {
    const { filters } = useAnalyticsFilters()
    const [metric, setMetric] = useState<Metric>('trips')

    const summaryEval = useMemo(() => evaluateWidget('fleet-summary', filters), [filters])
    const snapshotEval = useMemo(() => evaluateWidget('fleet-availability', filters), [filters])
    const trendEval = useMemo(() => evaluateWidget('fleet-trend', filters), [filters])
    const tripsEval = useMemo(() => evaluateWidget('fleet-trips', filters), [filters])
    const trackersEval = useMemo(() => evaluateWidget('fleet-trackers', filters), [filters])
    const barsEval = useMemo(() => evaluateWidget('fleet-alarms', filters), [filters])

    const summary = useFleetSummary(filters, summaryEval.range === 'applied')
    const snapshot = useAvailabilitySnapshot()
    const trips = useFleetTrips(filters, tripsEval.range === 'applied')
    const trackers = useTrackerHealth(filters, true)
    const catalog = useReportCatalog()

    const link = (type: string) => buildReportLink(type, catalog.data, filters)
    const utilizationLink = useMemo(() => buildReportLink('fleet.utilization-report', catalog.data, filters), [catalog.data, filters])

    const { ref: trendRef, seen: trendSeen } = useInView<HTMLDivElement>()
    const trend = useAvailabilityTrend(filters, trendSeen && trendEval.range === 'applied')
    const { ref: barsRef, seen: barsSeen } = useInView<HTMLDivElement>()
    const alarms = useVehicleAlarms(filters, barsSeen && metric === 'alarms' && barsEval.range === 'applied')

    const s = summary.data
    const totals = trips.data?.extra.totals
    const tripMeta = trips.data?.meta

    const statusSlices: Slice[] = Object.entries(snapshot.data?.by_status ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([status, count], i) => ({ label: pretty(status), value: count, color: `var(--an-chart-${(i % 5) + 1})` }))

    const trackerTotals = trackers.data?.extra.totals
    const trackerSlices: Slice[] = trackerTotals
        ? [
              { label: 'Online', value: trackerTotals.online, color: 'var(--an-good)' },
              { label: 'Offline', value: trackerTotals.offline, color: 'var(--an-bad)' },
          ]
        : []

    const bars: BarRow[] = useMemo(() => {
        const vehicles = trips.data?.extra.vehicles ?? []
        if (metric === 'alarms') {
            return (alarms.data?.data ?? [])
                .filter((r) => r.key !== null && r.total > 0)
                .map((r) => ({ id: r.key as number, label: r.label ?? `Vehicle ${r.key}`, value: r.total }))
        }
        const pick = (v: (typeof vehicles)[number]) => (metric === 'trips' ? v.trips : metric === 'trip_time' ? v.duration_s : v.idle_s)
        return vehicles.filter((v) => pick(v) > 0).map((v) => ({ id: v.vehicle_id, label: v.vehicle ?? `Vehicle ${v.vehicle_id}`, value: pick(v) }))
    }, [trips.data, alarms.data, metric])

    const selected = METRICS.find((m) => m.id === metric)!
    const barsQuery = !barsSeen ? idle : metric === 'alarms' ? alarms : trips

    return (
        <div className="space-y-5">
            <AnalyticsFilterBar compare={false} presets={PERIODS} custom={false} />
            <FreshnessBar />

            <div className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame
                    title="Fleet activity"
                    evaluation={summaryEval}
                    query={summary}
                    isEmpty={!!s && s.total_vehicles === 0}
                    emptyText="No vehicles yet."
                    link={utilizationLink}
                >
                    {s && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <KpiCard label="Vehicles" value={formatNumber(s.total_vehicles, 0)} />
                                <KpiCard label="Active in period" value={formatNumber(s.active_vehicles, 0)} note={`${formatNumber(s.utilization_rate_pct, 1)}% of the fleet`} />
                                <KpiCard label="Trackers reporting" value={formatNumber(s.devices_reporting, 0)} note={`${formatNumber(s.reporting_rate_pct, 1)}% of the fleet`} />
                            </div>
                            <p className={cn('rounded-md px-2.5 py-2 text-xs', s.activity_source === 'status_snapshot' ? 'bg-an-warn-soft text-an-warn' : 'bg-an-surface-muted text-an-muted')}>
                                {ACTIVITY_MEANING[s.activity_source]} {formatDate(s.period.start)} to {formatDate(s.period.end)}.
                            </p>
                            <Link href="/analytics/fleet/working-hours" className="inline-flex items-center gap-1 text-xs font-medium text-an-accent hover:underline">
                                Utilization against working hours <ChevronRight className="h-3 w-3" aria-hidden />
                            </Link>
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame
                    title="Trips and driving"
                    evaluation={tripsEval}
                    query={trips}
                    isEmpty={!!totals && totals.trips === 0}
                    emptyText="No trips recorded in this period."
                    link={link('gps.trips')}
                >
                    {totals && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <KpiCard label="Trips" value={formatNumber(totals.trips, 0)} />
                                <KpiCard label="Trip time" value={formatDuration(totals.duration_s)} />
                                <KpiCard label="Idle time" value={formatDuration(totals.idle_s)} />
                            </div>
                            {tripMeta?.partial && (
                                <p className="rounded-md bg-an-warn-soft px-2.5 py-1.5 text-xs text-an-warn">
                                    Only data from {formatDate(tripMeta.available_from ?? tripMeta.from)} is kept, so earlier days are missing.
                                </p>
                            )}
                        </div>
                    )}
                </WidgetFrame>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <WidgetFrame
                    title="Fleet status today"
                    evaluation={snapshotEval}
                    query={snapshot}
                    isEmpty={!!snapshot.data && snapshot.data.total === 0}
                    emptyText="No vehicles yet."
                >
                    <Donut slices={statusSlices} centerLabel="vehicles" ariaLabel="Vehicles by status today" />
                </WidgetFrame>

                <WidgetFrame
                    title="Tracker health"
                    evaluation={trackersEval}
                    query={trackers}
                    isEmpty={!!trackerTotals && trackerTotals.trackers === 0}
                    emptyText="No trackers yet."
                    link={link('gps.devices')}
                >
                    <Donut slices={trackerSlices} centerLabel="trackers" ariaLabel="Trackers online and offline now" />
                </WidgetFrame>

                <div ref={trendRef}>
                    <WidgetFrame
                        title="Share of the fleet active over time"
                        evaluation={trendEval}
                        query={trendSeen ? trend : idle}
                        isEmpty={!trendSeen || trend.data?.activity_source === 'status_snapshot' || (!!trend.data && trend.data.trend.length === 0)}
                        emptyText={!trendSeen ? 'Loads when scrolled into view.' : 'No GPS or trip activity was recorded in this period, so there is no trend to draw.'}
                        className="h-full"
                    >
                        {trend.data && (
                            <div className="space-y-2">
                                <div className="h-40 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trend.data.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                            <CartesianGrid vertical={false} stroke="var(--an-border)" />
                                            <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} minTickGap={24} />
                                            <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                                            <Tooltip formatter={(v) => [`${v}%`, 'Active']} />
                                            <Area type="monotone" dataKey="availability_pct" name="Active" stroke="var(--an-chart-1)" fill="var(--an-chart-1)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-an-muted">
                                    Share of today&apos;s {trend.data.total_vehicles.toLocaleString('en-GB')} vehicles that were active in each period.
                                </p>
                            </div>
                        )}
                    </WidgetFrame>
                </div>
            </div>

            <div ref={barsRef}>
                <WidgetFrame
                    title={`Busiest vehicles by ${selected.label.toLowerCase()}`}
                    evaluation={barsEval}
                    query={barsQuery}
                    isEmpty={!barsSeen || (!barsQuery.isPending && !(barsQuery as { isError?: boolean }).isError && bars.length === 0)}
                    emptyText={!barsSeen ? 'Loads when scrolled into view.' : 'Nothing recorded for this metric in this period.'}
                    link={metric === 'alarms' ? link('events.counts') : link('gps.trips')}
                    badge={<Segmented label="Metric" options={METRICS} value={metric} onChange={setMetric} />}
                >
                    <VehicleBars rows={bars} format={selected.format} metricLabel={selected.label.toLowerCase()} />
                    {bars.length > 10 && <p className="mt-1 text-xs text-an-muted">Top 10 of {bars.length} vehicles.</p>}
                </WidgetFrame>
            </div>
        </div>
    )
}
