'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import * as reports from '@/lib/api/telemetryReports'
import type { TrackerRow } from '@/lib/api/telemetryReports'
import { GpsReportTabs } from '@/components/analytics/telemetry/GpsReportTabs'
import { Column, Figure, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDateTime, formatDuration } from '@/components/analytics/telemetry/format'

const columns: Column<TrackerRow>[] = [
    { key: 'vehicle', header: 'Vehicle', render: r => <span className="font-bold">{r.vehicle ?? <span className="text-slate-400">Not fitted</span>}</span> },
    { key: 'imei', header: 'IMEI', render: r => <span className="font-mono">{r.imei}</span> },
    { key: 'status', header: 'Status', render: r => (r.online ? <Badge className="bg-emerald-100 text-emerald-800">Online</Badge> : <Badge className="bg-red-100 text-red-800">Offline</Badge>) },
    {
        key: 'connection', header: 'Connection', render: r => (r.connection === null ? dash : (
            <span title={r.connection_changed_at ? `Since ${formatDateTime(r.connection_changed_at)}` : undefined}>
                {r.connection === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
        )),
    },
    { key: 'last_report', header: 'Last report', render: r => formatDateTime(r.last_report_at) },
    { key: 'last_fix', header: 'Last GPS fix', render: r => formatDateTime(r.last_fix_at) },
    { key: 'offline', header: 'Offline in period', render: r => (r.offline_s ? `${formatDuration(r.offline_s)} (${r.offline_count}×)` : dash) },
    { key: 'external', header: 'External power', render: r => r.external_voltage ?? dash },
    { key: 'battery', header: 'Battery', render: r => r.battery_voltage ?? dash },
    { key: 'power', header: 'Power', render: r => r.power ?? dash },
    { key: 'sleep', header: 'Sleep mode', render: r => r.sleep_mode ?? dash },
    { key: 'model', header: 'Model', render: r => r.model ?? dash },
    { key: 'protocol', header: 'Protocol', render: r => r.protocol ?? dash },
]

function TrackersReport() {
    const { filters } = useReportFilters()
    const { data, isLoading } = useQuery({ queryKey: ['telemetry-trackers', filters], queryFn: () => reports.getTrackers(filters) })
    const t = data?.extra.totals

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Tracker" accent="Status" subtitle="Reporting, connection, power and offline time per tracker • offline first" />
            <GpsReportTabs />
            <ReportToolbar reportType="gps.devices" />
            <div className="grid grid-cols-3 gap-4">
                <Figure label="Trackers" value={t ? t.trackers.toLocaleString() : dash} />
                <Figure label="Online" value={t ? t.online.toLocaleString() : dash} />
                <Figure label="Offline" value={t ? t.offline.toLocaleString() : dash} />
            </div>
            <ReportTable columns={columns} rows={data?.data} meta={data?.meta} isLoading={isLoading} rowKey={r => r.device_id} empty="No trackers." />
            <p className="text-[10px] text-slate-400">
                Connection is the tracker&apos;s link to the telemetry platform, a separate fact from reporting: a parked tracker can be connected and quiet.
            </p>
        </div>
    )
}

export default function TrackersPage() {
    return (
        <Suspense>
            <TrackersReport />
        </Suspense>
    )
}
