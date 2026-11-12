'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { PlayCircle } from 'lucide-react'
import * as reports from '@/lib/api/telemetryReports'
import type { RoutePoint } from '@/lib/api/telemetryReports'
import { GpsReportTabs } from '@/components/analytics/telemetry/GpsReportTabs'
import { Column, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDateTime, formatNumber, formatPlace, mapLink } from '@/components/analytics/telemetry/format'

const columns: Column<RoutePoint>[] = [
    { key: 'at', header: 'Time', render: r => formatDateTime(r.at) },
    {
        key: 'place', header: 'Place', render: r => {
            const p = r.lat !== null && r.lon !== null ? { lat: r.lat, lon: r.lon } : null
            const link = mapLink(p)
            return link ? <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{formatPlace(p)}</a> : dash
        },
    },
    { key: 'speed', header: 'Speed', render: r => formatNumber(r.speed_kmh, 0, 'km/h') },
    { key: 'heading', header: 'Heading', render: r => (r.heading === null ? dash : `${r.heading}°`) },
    { key: 'ignition', header: 'Ignition', render: r => r.ignition ?? dash },
    { key: 'satellites', header: 'Satellites', render: r => r.satellites ?? dash },
    { key: 'odometer', header: 'Odometer', render: r => formatNumber(r.odometer_km, 1, 'km') },
    { key: 'fuel', header: 'Fuel level', render: r => (r.fuel_level_liters !== null ? formatNumber(r.fuel_level_liters, 1, 'L') : r.fuel_level_percent !== null ? `${r.fuel_level_percent}%` : dash) },
    {
        key: 'readings', header: 'Readings', render: r => {
            const entries = Object.entries(r.readings ?? {})
            return entries.length === 0 ? dash : <span className="text-slate-500">{entries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')}</span>
        },
    },
]

function RouteHistory() {
    const { filters, value } = useReportFilters('1d')
    const vehicleId = Number(value('vehicle_id') ?? 0)
    const { data, isLoading, error } = useQuery({
        queryKey: ['telemetry-route', filters],
        queryFn: () => reports.getRouteHistory({ ...filters, vehicle_id: vehicleId, per_page: 500 }),
        enabled: vehicleId > 0,
        retry: false,
    })
    const tooLong = isAxiosError(error) && error.response?.status === 422
    const first = data?.data[0]?.at
    const playback = vehicleId > 0 && data?.meta
        ? `/tracking/playback?vehicleId=${vehicleId}&start=${encodeURIComponent(data.meta.from)}&end=${encodeURIComponent(data.meta.to)}`
        : null

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Route" accent="History" subtitle={`A vehicle's GPS points • up to ${reports.ROUTE_MAX_DAYS} days at a time`} />
            <GpsReportTabs />
            <ReportToolbar>
                {playback && first && (
                    <Link href={playback} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                        <PlayCircle className="h-4 w-4" /> Replay on the map
                    </Link>
                )}
            </ReportToolbar>
            {vehicleId === 0 && <p className="text-sm text-slate-500">Choose a vehicle to see its route.</p>}
            {tooLong && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    Route history is shown for up to {reports.ROUTE_MAX_DAYS} days at a time. Pick a shorter range.
                </p>
            )}
            {vehicleId > 0 && !tooLong && (
                <ReportTable columns={columns} rows={data?.data} meta={data?.meta} isLoading={isLoading} isError={!!error} rowKey={(r, i) => `${r.at}-${i}`} empty="No GPS points in this period." />
            )}
        </div>
    )
}

export default function RouteHistoryPage() {
    return (
        <Suspense>
            <RouteHistory />
        </Suspense>
    )
}
