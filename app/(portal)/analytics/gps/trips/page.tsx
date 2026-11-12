'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import * as reports from '@/lib/api/telemetryReports'
import type { TripRow } from '@/lib/api/telemetryReports'
import { GpsReportTabs } from '@/components/analytics/telemetry/GpsReportTabs'
import { Column, Figure, Litres, PartialNotice, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDateTime, formatDuration, formatNumber, formatPlace, mapLink } from '@/components/analytics/telemetry/format'

const QUALITY: Record<string, string> = {
    odometer: 'Odometer', gps_path: 'GPS', gps_path_sparse: 'GPS (sparse)', gps_path_gaps: 'GPS (gaps)', gps_path_odometer_disagrees: 'GPS (odometer disagrees)', none: 'Unknown',
}

const place = (p: TripRow['start']) => {
    const link = mapLink(p)
    return link ? <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{formatPlace(p)}</a> : dash
}

const columns: Column<TripRow>[] = [
    { key: 'vehicle', header: 'Vehicle', render: r => <span className="font-bold">{r.vehicle ?? dash}</span> },
    { key: 'driver', header: 'Driver', render: r => r.driver ?? <span className="text-slate-400">Not assigned</span> },
    { key: 'start', header: 'Start', render: r => formatDateTime(r.started_at) },
    { key: 'end', header: 'End', render: r => (r.state === 'open' ? <Badge variant="outline">In progress</Badge> : formatDateTime(r.ended_at)) },
    { key: 'duration', header: 'Duration', render: r => formatDuration(r.duration_s) },
    {
        key: 'distance', header: 'Distance', render: r => (
            <span title={r.distance_quality ? QUALITY[r.distance_quality] ?? r.distance_quality : undefined}>
                {formatNumber(r.distance_km, 1, 'km')}
                {r.distance_quality && !['odometer', 'gps_path'].includes(r.distance_quality) && <span className="ml-1 text-amber-600">*</span>}
            </span>
        ),
    },
    { key: 'max_speed', header: 'Max speed', render: r => formatNumber(r.max_speed_kmh, 0, 'km/h') },
    { key: 'idle', header: 'Idle', render: r => (r.idle_measurable ? formatDuration(r.idle_s) : <span className="text-slate-400" title="This tracker reports no ignition">Not measurable</span>) },
    { key: 'stops', header: 'Stops', render: r => r.stops ?? dash },
    { key: 'fuel', header: 'Fuel', render: r => <Litres litres={r.litres} source={r.litres_source} /> },
    { key: 'speeding', header: 'Speeding', render: r => (r.speeding_count > 0 ? <Badge className="bg-amber-100 text-amber-800">{r.speeding_count}</Badge> : 0) },
    { key: 'harsh', header: 'Harsh', render: r => (r.harsh_count > 0 ? <Badge className="bg-red-100 text-red-800">{r.harsh_count}</Badge> : 0) },
    { key: 'from', header: 'From', render: r => place(r.start) },
    { key: 'to', header: 'To', render: r => place(r.end) },
]

function TripsReport() {
    const { filters } = useReportFilters()
    const { data, isLoading, isError } = useQuery({ queryKey: ['telemetry-trips', filters], queryFn: () => reports.getTrips(filters) })
    const totals = data?.extra.totals

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Trip" accent="Summary" subtitle="Every trip the trackers recorded • distance, time, fuel and driving events" />
            <GpsReportTabs />
            <ReportToolbar reportType="gps.trips" />
            <PartialNotice meta={data?.meta} />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Figure label="Trips" value={totals ? totals.trips.toLocaleString() : dash} />
                <Figure label="Distance" value={formatNumber(totals?.distance_km, 0, 'km')} />
                <Figure label="Driving time" value={formatDuration(totals ? totals.duration_s - totals.idle_s : null)} />
                <Figure label="Idle time" value={formatDuration(totals?.idle_s)} note="Trackers without ignition are not counted" />
                <Figure label="Fuel" value={totals ? <Litres litres={totals.litres} source={totals.litres_source} /> : dash} />
            </div>
            <ReportTable columns={columns} rows={data?.data} meta={data?.meta} isLoading={isLoading} isError={isError} rowKey={r => r.id} empty="No trips recorded in this period." />
            <p className="text-[10px] text-slate-400">* Distance from a sparse or gappy GPS path may be low.</p>
        </div>
    )
}

export default function TripsReportPage() {
    return (
        <Suspense>
            <TripsReport />
        </Suspense>
    )
}
