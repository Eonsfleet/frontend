'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/analytics/kit/KpiCard'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { Donut, type Slice } from '@/components/analytics/fleet/charts'
import { EventsStacked, ExpiryChart, InspectionStrip, TripTimeline } from './charts'
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { useInView } from '@/hooks/analytics/useInView'
import { useAlarmTrend } from '@/hooks/analytics/useOverviewQueries'
import { useDocumentExpiry, useDriverEvents, useDriverIncidents, useDriverTelemetry, useDriverTripRows, useDriverVehicleUsage, useInspections, TIMELINE_TRIP_LIMIT } from '@/hooks/analytics/useDriverQueries'
import { getDriverById } from '@/lib/api/drivers'
import { evaluateWidget } from '@/lib/analytics/applicability'
import { resolveDates } from '@/lib/analytics/filters'
import { formatDuration, formatNumber } from '@/components/analytics/telemetry/format'

const idle = { isPending: false, isError: false, error: null, refetch: () => undefined }

/**
 * One driver's page: who they are, what they did in the period, how they
 * drove, and where their documents and inspections stand. It appears when the
 * Drivers tab is filtered to exactly one driver. The cards after the first row
 * load only when scrolled near.
 */
export function DriverFocus({ driverId }: { driverId: number }) {
    const { filters, update } = useAnalyticsFilters()
    const evalTelemetry = useMemo(() => evaluateWidget('drivers-telemetry', filters), [filters])
    const evalTrend = useMemo(() => evaluateWidget('driver-events-trend', filters), [filters])
    const evalTimeline = useMemo(() => evaluateWidget('driver-timeline', filters), [filters])
    const evalUsage = useMemo(() => evaluateWidget('drivers-vehicle-usage', filters), [filters])
    const evalInspections = useMemo(() => evaluateWidget('drivers-inspections', filters), [filters])
    const evalExpiry = useMemo(() => evaluateWidget('drivers-expiry', filters), [filters])
    const applied = evalTelemetry.range === 'applied'

    const profile = useQuery({ queryKey: ['driver', driverId], queryFn: () => getDriverById(driverId), staleTime: 10 * 60_000 })
    const telemetry = useDriverTelemetry(filters, applied)
    const events = useDriverEvents(filters, null, applied)
    const incidents = useDriverIncidents(true)

    const { ref: midRef, seen: midSeen } = useInView<HTMLDivElement>()
    const trend = useAlarmTrend(filters, midSeen && applied)
    const timeline = useDriverTripRows(filters, midSeen && applied)
    const usage = useDriverVehicleUsage(filters, midSeen && applied)

    const { ref: lowRef, seen: lowSeen } = useInView<HTMLDivElement>()
    const expiry = useDocumentExpiry([driverId], lowSeen)
    const inspections = useInspections(filters, lowSeen && applied)

    const person = profile.data?.data
    const name = person?.attributes.full_name || `Driver ${driverId}`
    const row = telemetry.data?.data.find((r) => r.driver_id === driverId)
    const eventTotal = events.data?.data.find((r) => r.key === driverId)?.total ?? 0
    const incidentCount = incidents.data?.find((r) => r.driver_id === driverId)?.incident_count ?? 0

    const usageSlices: Slice[] = (usage.data?.data ?? [])
        .filter((r) => r.driver_id === driverId && r.duration_s > 0)
        .sort((a, b) => b.duration_s - a.duration_s)
        .map((r, i) => ({ label: r.vehicle ?? `Vehicle ${r.vehicle_id}`, value: r.duration_s, color: `var(--an-chart-${(i % 5) + 1})` }))

    const { start, end } = resolveDates(filters.range)
    const tripRows = timeline.data?.data ?? []

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-an-border bg-an-surface p-4">
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-an-text">{name}</h2>
                    <p className="text-sm text-an-muted">
                        {[person?.attributes.status, person?.relationships.cluster?.name].filter(Boolean).join(' · ') || 'Driver'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/drivers/${driverId}`} className="inline-flex items-center gap-1 text-sm font-medium text-an-accent hover:underline">
                        Open driver profile <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <Button variant="outline" size="sm" className="gap-1.5 border-an-border" onClick={() => update({ driverIds: [] })}>
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All drivers
                    </Button>
                </div>
            </div>

            <WidgetFrame title="This driver in the period" evaluation={evalTelemetry} query={telemetry} isEmpty={!!telemetry.data && !row} emptyText="No trips recorded for this driver in this period.">
                {row && (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        <KpiCard label="Trips" value={formatNumber(row.trips, 0)} />
                        <KpiCard label="Trip time" value={formatDuration(row.duration_s)} />
                        <KpiCard label="Idle time" value={formatDuration(row.idle_s)} />
                        <KpiCard label="Days driven" value={formatNumber(row.active_days, 0)} />
                        <KpiCard label="Alarms and events" value={events.isPending ? null : formatNumber(eventTotal, 0)} />
                        <KpiCard label="Incidents, 90 days" value={incidents.isPending ? null : formatNumber(incidentCount, 0)} tone={incidentCount > 0 ? 'warn' : 'default'} />
                    </div>
                )}
            </WidgetFrame>

            <div ref={midRef} className="grid gap-4 lg:grid-cols-3">
                <WidgetFrame
                    title="Alarms and events over time"
                    evaluation={evalTrend}
                    query={midSeen ? trend : idle}
                    isEmpty={!midSeen || (!!trend.data && trend.data.data.length === 0)}
                    emptyText={midSeen ? 'No alarms or events in this period.' : 'Loads when scrolled into view.'}
                    className="lg:col-span-2"
                >
                    <EventsStacked points={trend.data?.data ?? []} />
                </WidgetFrame>

                <WidgetFrame
                    title="Time in each vehicle"
                    evaluation={evalUsage}
                    query={midSeen ? usage : idle}
                    isEmpty={!midSeen || (!!usage.data && usageSlices.length === 0)}
                    emptyText={midSeen ? 'No trips in any vehicle in this period.' : 'Loads when scrolled into view.'}
                >
                    <Donut slices={usageSlices} ariaLabel="Trip time by vehicle" format={formatDuration} />
                </WidgetFrame>

                <WidgetFrame
                    title="When this driver drove"
                    evaluation={evalTimeline}
                    query={midSeen ? timeline : idle}
                    isEmpty={!midSeen || (!!timeline.data && tripRows.length === 0)}
                    emptyText={midSeen ? 'No trips in this period.' : 'Loads when scrolled into view.'}
                    className="lg:col-span-3"
                >
                    <TripTimeline trips={tripRows} />
                    {timeline.data && timeline.data.meta.total > TIMELINE_TRIP_LIMIT && (
                        <p className="mt-2 text-xs text-an-warn">Showing the latest {TIMELINE_TRIP_LIMIT} of {timeline.data.meta.total} trips.</p>
                    )}
                </WidgetFrame>
            </div>

            <div ref={lowRef} className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame
                    title="Documents: this driver and their vehicles"
                    evaluation={evalExpiry}
                    query={lowSeen ? expiry : idle}
                    isEmpty={!lowSeen || (!!expiry.data && expiry.data.data.length === 0)}
                    emptyText={lowSeen ? 'Nothing has expired or is about to expire.' : 'Loads when scrolled into view.'}
                >
                    {expiry.data && (
                        <div className="space-y-2">
                            <ExpiryChart docs={expiry.data.data} />
                            {expiry.data.meta.truncated && <p className="text-xs text-an-warn">Showing the first {expiry.data.meta.limit} documents.</p>}
                            {!expiry.data.meta.superseded_filtered && (
                                <p className="text-xs text-an-muted">A renewed document may still show as expired if its old record was not retired.</p>
                            )}
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame
                    title="Pre-trip inspections"
                    evaluation={evalInspections}
                    query={lowSeen ? inspections : idle}
                    isEmpty={!lowSeen || (!!inspections.data && inspections.data.data.length === 0)}
                    emptyText={lowSeen ? 'No pre-trip inspections in this period.' : 'Loads when scrolled into view.'}
                >
                    {inspections.data && <InspectionStrip rows={inspections.data.data} start={start} end={end} />}
                </WidgetFrame>
            </div>
        </div>
    )
}
