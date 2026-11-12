'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import * as reports from '@/lib/api/telemetryReports'
import type { UtilizationRow } from '@/lib/api/telemetryReports'
import { Column, Figure, PartialNotice, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDuration, formatNumber } from '@/components/analytics/telemetry/format'

const BAND = {
    under: { label: 'Under-used', style: 'bg-amber-100 text-amber-800' },
    normal: { label: 'Normal', style: 'bg-slate-100 text-slate-600' },
    over: { label: 'Over-used', style: 'bg-red-100 text-red-800' },
} as const

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const hours = (h: UtilizationRow['working_hours']) =>
    `${h.start}–${h.end}${h.days.length < 7 ? ` · ${h.days.map(d => DAYS[d]).join(', ')}` : ''}`

const columns: Column<UtilizationRow>[] = [
    { key: 'vehicle', header: 'Vehicle', render: r => <Link href={`/vehicles/${r.vehicle_id}`} className="font-bold text-blue-600 hover:underline">{r.vehicle ?? r.vehicle_id}</Link> },
    {
        key: 'utilization', header: 'Utilization', render: r => (r.utilization_pct === null ? dash : (
            <span className="inline-flex items-center gap-2">
                <span className="relative h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                    <span className="absolute inset-y-0 left-0 bg-blue-600" style={{ width: `${Math.min(100, r.utilization_pct)}%` }} />
                </span>
                {formatNumber(r.utilization_pct, 1)}%
            </span>
        )),
    },
    { key: 'band', header: 'Band', render: r => (r.band ? <Badge className={cn(BAND[r.band].style)}>{BAND[r.band].label}</Badge> : dash) },
    { key: 'hours', header: 'Working hours', render: r => <span title={r.working_hours.own ? "This vehicle's own hours" : "The organization's hours"}>{hours(r.working_hours)}{r.working_hours.own && ' *'}</span> },
    { key: 'engine', header: 'Engine on (in hours)', render: r => formatDuration(r.engine_in_hours_s) },
    { key: 'after', header: 'After hours', render: r => (r.after_hours_s > 0 ? <span className="text-amber-700">{formatDuration(r.after_hours_s)}</span> : dash) },
    { key: 'parked', header: 'Parked', render: r => formatDuration(r.parked_s) },
    { key: 'idle', header: 'Idle', render: r => (r.idle_measurable ? formatDuration(r.idle_s) : <span className="text-slate-400" title="This tracker reports no ignition">Not measurable</span>) },
    { key: 'days', header: 'Days used', render: r => `${r.days_used} / ${r.working_days}` },
    { key: 'trips', header: 'Trips', render: r => r.trips },
    { key: 'distance', header: 'Distance', render: r => formatNumber(r.distance_km, 0, 'km') },
    { key: 'avg', header: 'Avg trip', render: r => formatNumber(r.avg_trip_km, 1, 'km') },
    { key: 'offline', header: 'Tracker offline', render: r => (r.offline_s > 0 ? formatDuration(r.offline_s) : dash) },
]

function WorkingHoursUtilization() {
    const { filters } = useReportFilters('30d')
    const { data, isLoading, isError } = useQuery({ queryKey: ['utilization-report', filters], queryFn: () => reports.getUtilizationReport(filters) })
    const t = data?.extra.totals
    const th = data?.extra.thresholds

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Utilization" accent="by Working Hours" subtitle="Engine time inside each vehicle's working hours • least used first" />
            <ReportToolbar reportType="fleet.utilization-report" />
            <PartialNotice meta={data?.meta} />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Figure label="Fleet utilization" value={t?.utilization_pct !== undefined && t?.utilization_pct !== null ? `${formatNumber(t.utilization_pct, 1)}%` : dash} />
                <Figure label="Under-used" value={t ? t.under : dash} note={th ? `Below ${th.under_pct}%` : undefined} />
                <Figure label="Over-used" value={t ? t.over : dash} note={th ? `Above ${th.over_pct}%` : undefined} />
                <Figure label="After-hours driving" value={formatDuration(t?.after_hours_s)} />
                <Figure label="Distance" value={formatNumber(t?.distance_km, 0, 'km')} note={t ? `${t.trips.toLocaleString()} trips` : undefined} />
            </div>
            <ReportTable columns={columns} rows={data?.data} meta={data?.meta} isLoading={isLoading} isError={isError} rowKey={r => r.vehicle_id} empty="No vehicles with trackers." />
            <p className="text-[10px] text-slate-400">
                * The vehicle&apos;s own working hours. Organization hours, working days and the under- and over-used thresholds are set in{' '}
                <Link href="/settings/fleet-rules" className="text-blue-600 hover:underline">Fleet Rules</Link>; maintenance downtime is in the fleet utilization overview.
            </p>
        </div>
    )
}

export default function WorkingHoursUtilizationPage() {
    return (
        <Suspense>
            <WorkingHoursUtilization />
        </Suspense>
    )
}
