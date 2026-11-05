'use client'

import { useMemo, useState } from 'react'
import { AnalyticsFilterBar } from '@/components/analytics/shell/AnalyticsFilterBar'
import { FreshnessBar } from '@/components/analytics/overview/FreshnessBar'
import { KpiCard } from '@/components/analytics/kit/KpiCard'
import { Segmented } from '@/components/analytics/kit/Segmented'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { RankedBars, type BarRow } from '@/components/analytics/fleet/charts'
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { useInView } from '@/hooks/analytics/useInView'
import { useReportCatalog } from '@/hooks/analytics/useOverviewQueries'
import { useDocumentExpiry, useDriverEvents, useDriverIncidents, useDriverTelemetry, useDriverTrips, useInspections } from '@/hooks/analytics/useDriverQueries'
import { DRIVER_LIST_LIMIT } from '@/lib/api/analyticsDrivers'
import { evaluateWidget } from '@/lib/analytics/applicability'
import { resolveDates, serializeFilters } from '@/lib/analytics/filters'
import { buildReportLink } from '@/lib/analytics/reportLinks'
import { formatDuration, formatNumber } from '@/components/analytics/telemetry/format'
import { DriverFocus } from './DriverFocus'
import { ExpiryChart, InspectionStrip } from './charts'

const PERIODS = ['7d', '30d'] as const
const idle = { isPending: false, isError: false, error: null, refetch: () => undefined }
const count = (n: number) => n.toLocaleString('en-GB')

/** Event categories the backend filters on (EventCategory), as the switch offers them. */
const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'speeding', label: 'Speeding' },
    { id: 'driving', label: 'Driving' },
    { id: 'idling', label: 'Idling' },
    { id: 'alarm', label: 'Alarms' },
    { id: 'geofence', label: 'Geofence' },
] as const
type Category = (typeof CATEGORIES)[number]['id']

/** What the driver bars can rank by. The first four come from the tracker store; "Dispatched" is the older trips table. */
const METRICS = [
    { id: 'trips', label: 'Trips', format: count },
    { id: 'trip_time', label: 'Trip time', format: (n: number) => formatDuration(n) },
    { id: 'idle', label: 'Idle time', format: (n: number) => formatDuration(n) },
    { id: 'days', label: 'Days driven', format: count },
    { id: 'dispatched', label: 'Dispatched trips', format: count },
] as const
type Metric = (typeof METRICS)[number]['id']

/**
 * The Drivers tab. With no driver chosen (or several) it compares drivers; with
 * exactly one driver chosen it becomes that driver's own page. Charts only, and
 * every card says which period and filters it really uses. A composite driver
 * score, the workload buckets and a fleet-wide compliance donut are not here
 * (see the notes in lib/api/analyticsDrivers.ts); distance is left out until
 * its units are verified.
 */
export function DriversV2() {
    const { filters } = useAnalyticsFilters()
    // One driver in the Drivers filter (or a click on a bar) opens that driver's own page.
    const focusId = filters.driverIds.length === 1 ? filters.driverIds[0] : null

    return (
        <div className="space-y-5">
            <AnalyticsFilterBar compare={false} presets={PERIODS} custom={false} />
            <FreshnessBar />
            {focusId !== null ? <DriverFocus driverId={focusId} /> : <DriversOverview />}
        </div>
    )
}

function DriversOverview() {
    const { filters } = useAnalyticsFilters()
    const [metric, setMetric] = useState<Metric>('trips')
    const [category, setCategory] = useState<Category>('all')

    const tripsEval = useMemo(() => evaluateWidget('drivers-trips', filters), [filters])
    const telemetryEval = useMemo(() => evaluateWidget('drivers-telemetry', filters), [filters])
    const eventsEval = useMemo(() => evaluateWidget('drivers-events', filters), [filters])
    const incidentsEval = useMemo(() => evaluateWidget('drivers-incidents', filters), [filters])
    const expiryEval = useMemo(() => evaluateWidget('drivers-expiry', filters), [filters])
    const inspectionsEval = useMemo(() => evaluateWidget('drivers-inspections', filters), [filters])

    const dispatched = metric === 'dispatched'
    const dispatchedQuery = useDriverTrips(filters, dispatched && tripsEval.range === 'applied')
    const telemetry = useDriverTelemetry(filters, !dispatched && telemetryEval.range === 'applied')
    const events = useDriverEvents(filters, category === 'all' ? null : category, eventsEval.range === 'applied')
    const catalog = useReportCatalog()
    const eventsLink = useMemo(() => buildReportLink('events.list', catalog.data, filters), [catalog.data, filters])

    const { ref: lowerRef, seen: lowerSeen } = useInView<HTMLDivElement>()
    const incidents = useDriverIncidents(lowerSeen)
    const expiry = useDocumentExpiry(filters.driverIds, lowerSeen)
    const inspections = useInspections(filters, lowerSeen && inspectionsEval.range === 'applied')

    // Clicking a bar looks at that driver: the same page, filtered to them.
    const focusHref = (id: number | string) => `/analytics/drivers?${serializeFilters({ ...filters, driverIds: [Number(id)] }).toString()}`

    const selected = METRICS.find((m) => m.id === metric)!
    const driverBars: BarRow[] = useMemo(() => {
        if (dispatched) return (dispatchedQuery.data?.drivers ?? []).filter((d) => d.trips_count > 0).map((d) => ({ id: d.driver_id, label: d.driver_name || `Driver ${d.driver_id}`, value: d.trips_count }))
        const pick = (r: { trips: number; duration_s: number; idle_s: number; active_days: number }) =>
            metric === 'trips' ? r.trips : metric === 'trip_time' ? r.duration_s : metric === 'idle' ? r.idle_s : r.active_days
        return (telemetry.data?.data ?? []).filter((r) => pick(r) > 0).map((r) => ({ id: r.driver_id, label: r.driver ?? `Driver ${r.driver_id}`, value: pick(r) }))
    }, [dispatched, dispatchedQuery.data, telemetry.data, metric])
    const driverQuery = dispatched ? dispatchedQuery : telemetry
    const driverEval = dispatched ? tripsEval : telemetryEval
    const dispatchedCut = dispatched && (dispatchedQuery.data?.drivers.length ?? 0) >= DRIVER_LIST_LIMIT

    // A group with no driver is drawn but has no page to open.
    const eventBars: BarRow[] = (events.data?.data ?? [])
        .filter((r) => r.total > 0)
        .map((r) => ({ id: r.key === null ? '' : r.key, label: r.key === null ? 'No driver assigned' : (r.label ?? `Driver ${r.key}`), value: r.total }))
    const selectedCategory = CATEGORIES.find((c) => c.id === category)!

    const incidentRows = incidents.data ?? []
    const incidentBars: BarRow[] = incidentRows.map((r) => ({ id: r.driver_id, label: r.driver_name || `Driver ${r.driver_id}`, value: r.incident_count }))

    const docs = expiry.data?.data ?? []
    const { start, end } = resolveDates(filters.range)

    return (
        <div className="space-y-5">
            <p className="text-sm text-an-muted">Choose one driver in the Drivers filter, or click a bar, to see that driver&apos;s own page.</p>
            <div className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame
                    title={`Drivers by ${selected.label.toLowerCase()}`}
                    evaluation={driverEval}
                    query={driverQuery}
                    isEmpty={!driverQuery.isPending && !(driverQuery as { isError?: boolean }).isError && driverBars.length === 0}
                    emptyText="Nothing recorded for this metric in this period."
                    badge={<Segmented label="Driver metric" options={[...METRICS]} value={metric} onChange={setMetric} />}
                >
                    <div className="space-y-3">
                        <KpiCard
                            label="Drivers with activity"
                            value={`${count(driverBars.length)}${dispatchedCut ? '+' : ''}`}
                            note={dispatched ? 'Dispatched trips, not tracker trips' : telemetry.data && telemetry.data.totals.unassigned_trips > 0 ? `${count(telemetry.data.totals.unassigned_trips)} trips have no driver assigned` : undefined}
                        />
                        <RankedBars rows={driverBars} format={selected.format} metricLabel={selected.label.toLowerCase()} hrefFor={focusHref} subject="drivers" />
                        {driverBars.length > 10 && <p className="text-xs text-an-muted">Top 10 of {driverBars.length} drivers.</p>}
                        {dispatchedCut && <p className="text-xs text-an-warn">The backend lists up to {DRIVER_LIST_LIMIT} drivers, those with the most distance first, so drivers beyond that are not counted.</p>}
                    </div>
                </WidgetFrame>

                <WidgetFrame
                    title={`${category === 'all' ? 'Alarms and events' : selectedCategory.label} per driver`}
                    evaluation={eventsEval}
                    query={events}
                    isEmpty={!!events.data && eventBars.length === 0}
                    emptyText="No events for this selection in this period."
                    link={eventsLink}
                    badge={<Segmented label="Event category" options={[...CATEGORIES]} value={category} onChange={setCategory} />}
                >
                    <div className="space-y-3">
                        <RankedBars rows={eventBars} format={count} metricLabel="events" hrefFor={focusHref} subject="drivers" />
                        {eventBars.length > 10 && <p className="text-xs text-an-muted">Top 10 of {eventBars.length} drivers.</p>}
                        {events.data?.meta.partial && <p className="rounded-md bg-an-warn-soft px-2.5 py-1.5 text-xs text-an-warn">Earlier days are missing: the backend keeps 60 days.</p>}
                    </div>
                </WidgetFrame>
            </div>

            <div ref={lowerRef} className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame
                    title="Incidents by driver"
                    evaluation={incidentsEval}
                    query={lowerSeen ? incidents : idle}
                    isEmpty={!lowerSeen || (!!incidents.data && incidentBars.length === 0)}
                    emptyText={lowerSeen ? 'No driver has had an incident in the last 90 days.' : 'Loads when scrolled into view.'}
                >
                    <div className="space-y-3">
                        <KpiCard label="Drivers with incidents" value={formatNumber(incidentRows.length, 0)} note="Whatever period is chosen, this is the last 90 days" />
                        <RankedBars rows={incidentBars} format={count} metricLabel="incidents" hrefFor={focusHref} subject="drivers" />
                        {incidentBars.length > 10 && <p className="text-xs text-an-muted">Top 10 of {incidentBars.length} drivers.</p>}
                    </div>
                </WidgetFrame>

                <WidgetFrame
                    title="Document expiry: drivers and vehicles"
                    evaluation={expiryEval}
                    query={lowerSeen ? expiry : idle}
                    isEmpty={!lowerSeen || (!!expiry.data && docs.length === 0)}
                    emptyText={lowerSeen ? 'Nothing has expired or is about to expire.' : 'Loads when scrolled into view.'}
                >
                    {expiry.data && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <KpiCard label="Expired" value={formatNumber(expiry.data.totals.driver.expired + expiry.data.totals.vehicle.expired, 0)} tone={expiry.data.totals.driver.expired + expiry.data.totals.vehicle.expired > 0 ? 'bad' : 'default'} note="Drivers' and vehicles' documents" />
                                <KpiCard label="Expiring in 30 days" value={formatNumber(expiry.data.totals.driver.expiring + expiry.data.totals.vehicle.expiring, 0)} tone="warn" />
                            </div>
                            <ExpiryChart docs={docs} />
                            {expiry.data.meta.truncated && <p className="text-xs text-an-warn">Showing the first {expiry.data.meta.limit} documents, soonest first. The counts above cover all of them.</p>}
                            {!expiry.data.meta.superseded_filtered && <p className="text-xs text-an-muted">A renewed document may still show as expired if its old record was not retired.</p>}
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame
                    title="Pre-trip inspections"
                    evaluation={inspectionsEval}
                    query={lowerSeen ? inspections : idle}
                    isEmpty={!lowerSeen || (!!inspections.data && inspections.data.data.length === 0)}
                    emptyText={lowerSeen ? 'No pre-trip inspections in this period.' : 'Loads when scrolled into view.'}
                    className="lg:col-span-2"
                >
                    {inspections.data && (
                        <div className="space-y-3">
                            <KpiCard
                                label="Inspections"
                                value={formatNumber(inspections.data.totals.inspections, 0)}
                                note={`${formatNumber(inspections.data.totals.drivers, 0)} ${inspections.data.totals.drivers === 1 ? 'driver' : 'drivers'}${inspections.data.totals.with_defects !== null ? `, ${formatNumber(inspections.data.totals.with_defects, 0)} with defects` : ''}`}
                            />
                            <InspectionStrip rows={inspections.data.data} start={start} end={end} />
                        </div>
                    )}
                </WidgetFrame>
            </div>
        </div>
    )
}
