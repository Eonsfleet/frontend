'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as reports from '@/lib/api/telemetryReports'
import type { StopRow } from '@/lib/api/telemetryReports'
import { GpsReportTabs } from '@/components/analytics/telemetry/GpsReportTabs'
import { Column, Figure, PartialNotice, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDateTime, formatDuration, formatPlace, mapLink } from '@/components/analytics/telemetry/format'

const columns: Column<StopRow>[] = [
    { key: 'vehicle', header: 'Vehicle', render: r => <span className="font-bold">{r.vehicle ?? dash}</span> },
    { key: 'driver', header: 'Driver', render: r => r.driver ?? <span className="text-slate-400">Not assigned</span> },
    { key: 'arrived', header: 'Arrived', render: r => formatDateTime(r.arrived_at) },
    { key: 'departed', header: 'Departed', render: r => (r.departed_at ? formatDateTime(r.departed_at) : <span className="text-slate-400">Still there</span>) },
    { key: 'duration', header: 'Duration', render: r => formatDuration(r.duration_s) },
    { key: 'idle', header: 'Idle', render: r => formatDuration(r.idle_s) },
    { key: 'geofence', header: 'Geofence', render: r => r.geofence?.name ?? dash },
    {
        key: 'place', header: 'Place', render: r => {
            const link = mapLink(r.place)
            return link ? <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{formatPlace(r.place)}</a> : dash
        },
    },
    { key: 'in_trip', header: 'During a trip', render: r => (r.in_trip === null ? dash : r.in_trip ? 'Yes' : 'No') },
]

function StopsReport() {
    const { filters } = useReportFilters()
    const { data, isLoading } = useQuery({ queryKey: ['telemetry-stops', filters], queryFn: () => reports.getStops(filters) })
    const t = data?.extra.totals

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Stops" accent="Report" subtitle="Where vehicles stopped, for how long, and inside which geofence" />
            <GpsReportTabs />
            <ReportToolbar reportType="gps.stops" />
            <PartialNotice meta={data?.meta} />
            <div className="grid grid-cols-3 gap-4">
                <Figure label="Stops" value={t ? t.stops.toLocaleString() : dash} />
                <Figure label="Time stopped" value={formatDuration(t?.duration_s)} />
                <Figure label="Idling while stopped" value={formatDuration(t?.idle_s)} />
            </div>
            <ReportTable columns={columns} rows={data?.data} meta={data?.meta} isLoading={isLoading} rowKey={r => r.id} empty="No stops recorded in this period." />
        </div>
    )
}

export default function StopsPage() {
    return (
        <Suspense>
            <StopsReport />
        </Suspense>
    )
}
