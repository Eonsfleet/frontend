'use client'

import { Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import * as reports from '@/lib/api/telemetryReports'
import type { EventCategory, EventCountRow, EventRow } from '@/lib/api/telemetryReports'
import { Column, PartialNotice, ReportHeader, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDate, formatDateTime, formatDuration, formatNumber, formatPlace, mapLink } from '@/components/analytics/telemetry/format'

const CATEGORIES: { value: EventCategory; label: string; color: string }[] = [
    { value: 'alarm', label: 'Safety alarms', color: '#dc2626' },
    { value: 'driving', label: 'Harsh driving', color: '#ea580c' },
    { value: 'speeding', label: 'Speeding', color: '#d97706' },
    { value: 'geofence', label: 'Geofences', color: '#2563eb' },
    { value: 'idling', label: 'Idling', color: '#64748b' },
    { value: 'engine', label: 'Engine', color: '#0d9488' },
    { value: 'status', label: 'Tracker status', color: '#7c3aed' },
    { value: 'fuel', label: 'Fuel', color: '#16a34a' },
]

const SEVERITY_STYLE: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-slate-100 text-slate-600',
}

const eventColumns: Column<EventRow>[] = [
    { key: 'time', header: 'Time', render: r => formatDateTime(r.started_at) },
    { key: 'vehicle', header: 'Vehicle', render: r => <span className="font-bold">{r.vehicle ?? dash}</span> },
    { key: 'driver', header: 'Driver', render: r => r.driver ?? <span className="text-slate-400">Not assigned</span> },
    {
        key: 'event', header: 'Event', render: r => (
            <span className="inline-flex items-center gap-1.5">
                {r.title}
                {r.evidence === 'vendor_documented_unconfirmed' && (
                    <Badge variant="outline" className="text-[9px]" title="The platform has not yet confirmed this alarm's meaning on our tracker models">Unconfirmed</Badge>
                )}
            </span>
        ),
    },
    { key: 'severity', header: 'Severity', render: r => (r.severity ? <Badge className={cn('capitalize', SEVERITY_STYLE[r.severity])}>{r.severity}</Badge> : dash) },
    {
        key: 'duration', header: 'Duration', render: r => (r.start_missing
            ? <span className="text-slate-400" title="Its start was not received">Unknown</span>
            : r.ended_at === null && r.duration_s === null ? <Badge variant="outline">Ongoing</Badge> : formatDuration(r.duration_s)),
    },
    { key: 'speed', header: 'Speed / limit', render: r => (r.speed_kmh !== null ? `${formatNumber(r.speed_kmh, 0)}${r.limit_kmh ? ` / ${r.limit_kmh}` : ''} km/h` : dash) },
    { key: 'geofence', header: 'Geofence', render: r => r.geofence?.name ?? dash },
    {
        key: 'place', header: 'Place', render: r => {
            const link = mapLink(r.place)
            return link ? <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{formatPlace(r.place)}</a> : dash
        },
    },
    { key: 'notified', header: 'Alert sent', render: r => (r.notified ? 'Yes' : 'No') },
]

function CountsTable({ rows }: { rows?: EventCountRow[] }) {
    if (!rows || rows.length === 0) return <p className="text-sm text-slate-400 p-4">No events in this period.</p>
    return (
        <div className="divide-y divide-slate-100">
            {rows.slice(0, 10).map(r => (
                <div key={String(r.key)} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div>
                        <p className="font-bold text-slate-800">{r.label ?? dash}</p>
                        <p className="text-slate-400">{Object.values(r.by_kind).map(k => `${k.title} ${k.count}`).join(' · ')}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-slate-900">{r.total}</p>
                        <p className="text-slate-400">{r.per_100_km !== undefined && r.per_100_km !== null ? `${r.per_100_km} per 100 km` : dash}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function AlarmsReport() {
    const { filters, set, value } = useReportFilters()
    const { data: events, isLoading } = useQuery({ queryKey: ['telemetry-events', filters], queryFn: () => reports.getEvents(filters) })
    const scope = { ...filters, page: 1 }
    const { data: counts } = useQuery({ queryKey: ['telemetry-event-counts', scope], queryFn: () => reports.getEventCounts({ ...scope, group_by: 'vehicle' }) })
    const { data: trend } = useQuery({ queryKey: ['telemetry-event-trend', scope], queryFn: () => reports.getEventTrend(scope) })

    const chart = useMemo(() => (trend?.data ?? []).map(t => ({ name: formatDate(t.period), ...t.by_category })), [trend])
    const shown = CATEGORIES.filter(c => chart.some(row => (row as Record<string, unknown>)[c.value] !== undefined))

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <ReportHeader title="Alarms &" accent="Events" subtitle="Safety alarms, harsh driving, speeding, geofences, idling and tracker status" />
            <ReportToolbar reportType="events.list" exportExtra={{ categories: filters.categories, severities: filters.severities }}>
                <select
                    aria-label="Category"
                    value={value('categories') ?? ''}
                    onChange={e => set({ categories: e.target.value || null })}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
                >
                    <option value="">All categories</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select
                    aria-label="Severity"
                    value={value('severities') ?? ''}
                    onChange={e => set({ severities: e.target.value || null })}
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
                >
                    <option value="">All severities</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                </select>
            </ReportToolbar>
            <PartialNotice meta={events?.meta} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        Events per {trend?.extra.interval === 'week' ? 'week' : 'day'}
                    </p>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                {shown.map(c => <Bar key={c.value} dataKey={c.value} name={c.label} stackId="events" fill={c.color} />)}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-4 pt-4 pb-2">Most events by vehicle</p>
                    <CountsTable rows={counts?.data} />
                </div>
            </div>
            <ReportTable columns={eventColumns} rows={events?.data} meta={events?.meta} isLoading={isLoading} rowKey={r => r.id} empty="No events in this period." />
            <p className="text-[10px] text-slate-400">
                &quot;Unconfirmed&quot; marks Teltonika alarms the telemetry platform raises from the vendor&apos;s documented inputs before checking them on our tracker models.
            </p>
        </div>
    )
}

export default function AlarmsPage() {
    return (
        <Suspense>
            <AlarmsReport />
        </Suspense>
    )
}
