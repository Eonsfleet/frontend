'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import * as reports from '@/lib/api/telemetryReports'
import type { ScheduledTripRow } from '@/lib/api/telemetryReports'
import { GpsReportTabs } from '@/components/analytics/telemetry/GpsReportTabs'
import { Column, PartialNotice, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDateTime, formatNumber } from '@/components/analytics/telemetry/format'

/** Actual against planned distance: off by more than a quarter is worth a look. */
const variance = (r: ScheduledTripRow) => {
    if (r.planned_distance_km === null || r.actual_distance_km === null || r.planned_distance_km === 0) return null
    return Math.round(((r.actual_distance_km - r.planned_distance_km) / r.planned_distance_km) * 100)
}

const columns: Column<ScheduledTripRow>[] = [
    { key: 'trip', header: 'Trip', render: r => <Link href={`/trips/${r.id}`} className="font-bold text-blue-600 hover:underline">{r.trip_number ?? `#${r.id}`}</Link> },
    { key: 'status', header: 'Status', render: r => (r.status ? <Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge> : dash) },
    { key: 'vehicle', header: 'Vehicle', render: r => r.vehicle ?? dash },
    { key: 'driver', header: 'Driver', render: r => r.driver ?? dash },
    { key: 'planned', header: 'Planned', render: r => `${formatDateTime(r.planned_start_at)} → ${formatDateTime(r.planned_end_at)}` },
    { key: 'actual', header: 'Driven', render: r => (r.actual_start_at ? `${formatDateTime(r.actual_start_at)} → ${formatDateTime(r.actual_end_at)}` : <span className="text-slate-400">No driving recorded</span>) },
    { key: 'planned_km', header: 'Planned km', render: r => formatNumber(r.planned_distance_km, 1) },
    {
        key: 'actual_km', header: 'Driven km', render: r => {
            const v = variance(r)
            return (
                <span>
                    {formatNumber(r.actual_distance_km, 1)}
                    {v !== null && Math.abs(v) > 25 && <span className={v > 0 ? 'ml-1 text-amber-600' : 'ml-1 text-slate-500'}>({v > 0 ? '+' : ''}{v}%)</span>}
                </span>
            )
        },
    },
    { key: 'fuel', header: 'Fuel (est.)', render: r => formatNumber(r.estimated_litres, 2, 'L') },
    { key: 'segments', header: 'Device trips', render: r => r.device_trips.length },
]

function ScheduledTrips() {
    const { filters } = useReportFilters()
    const { data, isLoading } = useQuery({ queryKey: ['telemetry-scheduled', filters], queryFn: () => reports.getScheduledTrips(filters) })

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Scheduled" accent="vs Actual" subtitle="Dispatched trips against what the vehicle's tracker recorded in their window" />
            <GpsReportTabs />
            <ReportToolbar reportType="gps.scheduled-trips" />
            <PartialNotice meta={data?.meta} />
            <ReportTable columns={columns} rows={data?.data} meta={data?.meta} isLoading={isLoading} rowKey={r => r.id} empty="No scheduled trips in this period." />
        </div>
    )
}

export default function ScheduledTripsPage() {
    return (
        <Suspense>
            <ScheduledTrips />
        </Suspense>
    )
}
