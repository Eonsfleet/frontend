'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as reports from '@/lib/api/telemetryReports'
import type { DailyRow } from '@/lib/api/telemetryReports'
import { GpsReportTabs } from '@/components/analytics/telemetry/GpsReportTabs'
import { Column, Figure, Litres, PartialNotice, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDate, formatDuration, formatNumber, formatTime } from '@/components/analytics/telemetry/format'

const columns: Column<DailyRow>[] = [
    { key: 'date', header: 'Date', render: r => formatDate(r.date) },
    { key: 'vehicle', header: 'Vehicle', render: r => <span className="font-bold">{r.vehicle ?? dash}</span> },
    { key: 'distance', header: 'Distance', render: r => formatNumber(r.distance_km, 1, 'km') },
    { key: 'trips', header: 'Trips', render: r => r.trips },
    { key: 'driving', header: 'Driving', render: r => formatDuration(r.driving_s) },
    { key: 'idle', header: 'Idle', render: r => formatDuration(r.idle_s) },
    { key: 'first', header: 'First start', render: r => formatTime(r.first_start_at) },
    { key: 'last', header: 'Last stop', render: r => formatTime(r.last_end_at) },
    { key: 'max', header: 'Max speed', render: r => formatNumber(r.max_speed_kmh, 0, 'km/h') },
    { key: 'speeding', header: 'Speeding', render: r => (r.speeding_count > 0 ? `${r.speeding_count} (${formatDuration(r.speeding_s)})` : 0) },
    { key: 'alarms', header: 'Alarms', render: r => r.alarm_count },
    { key: 'stops', header: 'Stops', render: r => r.stops },
    { key: 'offline', header: 'Offline', render: r => (r.offline_s > 0 ? formatDuration(r.offline_s) : dash) },
    { key: 'fuel', header: 'Fuel', render: r => <Litres litres={r.estimated_litres} source={r.litres_source} /> },
]

function DailyReport() {
    const { filters } = useReportFilters()
    const { data, isLoading, isError } = useQuery({ queryKey: ['telemetry-daily', filters], queryFn: () => reports.getDailyDriving(filters) })
    const t = data?.extra.totals

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Daily" accent="Driving" subtitle="Each vehicle's day • distance, driving and idle time, speeding, alarms" />
            <GpsReportTabs />
            <ReportToolbar reportType="gps.daily" />
            <PartialNotice meta={data?.meta} />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Figure label="Distance" value={formatNumber(t?.distance_km as number | null | undefined, 0, 'km')} />
                <Figure label="Trips" value={t?.trips ?? dash} />
                <Figure label="Driving" value={formatDuration(t?.driving_s as number | null | undefined)} />
                <Figure label="Speeding episodes" value={t?.speeding_count ?? dash} />
                <Figure label="Alarms" value={t?.alarm_count ?? dash} />
            </div>
            <ReportTable columns={columns} rows={data?.data} meta={data?.meta} isLoading={isLoading} isError={isError} rowKey={r => `${r.vehicle_id}-${r.date}`} empty="No driving recorded in this period." />
        </div>
    )
}

export default function DailyDrivingPage() {
    return (
        <Suspense>
            <DailyReport />
        </Suspense>
    )
}
