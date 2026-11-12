'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { formatDate, formatDuration, localDate } from '@/components/analytics/telemetry/format'
import type { EventTrendRow, TripRow } from '@/lib/api/telemetryReports'
import type { ExpiringDocument, InspectionRow } from '@/types/analytics'

const TZ = 'Africa/Lagos'
const CHART_COLORS = ['var(--an-chart-1)', 'var(--an-chart-2)', 'var(--an-chart-3)', 'var(--an-chart-4)', 'var(--an-chart-5)']
const pretty = (key: string) => key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

// ── Events over time, stacked by category ────────────────────────────────────

/** Events per day (per week beyond a month), each bar split by category. The legend repeats the totals as text. */
export function EventsStacked({ points }: { points: EventTrendRow[] }) {
    const categories = useMemo(() => [...new Set(points.flatMap((p) => Object.keys(p.by_category)))].sort(), [points])
    const data = useMemo(() => points.map((p) => ({ period: p.period, ...Object.fromEntries(categories.map((c) => [c, p.by_category[c as keyof typeof p.by_category] ?? 0])) })), [points, categories])
    const totals = useMemo(() => categories.map((c) => [c, points.reduce((sum, p) => sum + (p.by_category[c as keyof typeof p.by_category] ?? 0), 0)] as const), [points, categories])

    return (
        <div className="space-y-2">
            <div className="h-56 w-full" role="img" aria-label="Events per period by category">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--an-border)" />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} minTickGap={24} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                        <Tooltip cursor={{ fill: 'var(--an-surface-muted)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={(v) => pretty(String(v))} />
                        {categories.map((c, i) => (
                            <Bar key={c} dataKey={c} name={c} stackId="events" fill={CHART_COLORS[i % CHART_COLORS.length]} isAnimationActive={false} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <ul className="sr-only">
                {totals.map(([c, n]) => (
                    <li key={c}>
                        {pretty(c)}: {n}
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ── Trip timeline: one row per day, a bar per trip at the time of day it ran ─

const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Minutes since local midnight (Lagos) for an ISO time. */
export function minutesOfDay(iso: string): number {
    const [h, m] = hm.format(new Date(iso)).split(':').map(Number)
    return h * 60 + m
}

interface DayTrips {
    date: string
    trips: { id: string; from: number; to: number; label: string }[]
}

/** Groups finished trips by the Lagos day they started; a trip past midnight stops at the end of its day. */
export function groupTripsByDay(trips: TripRow[]): DayTrips[] {
    const days = new Map<string, DayTrips>()
    for (const t of trips) {
        if (!t.started_at || !t.ended_at) continue
        const date = localDate(new Date(t.started_at))
        const from = minutesOfDay(t.started_at)
        const sameDay = localDate(new Date(t.ended_at)) === date
        const to = sameDay ? Math.max(minutesOfDay(t.ended_at), from + 1) : 24 * 60
        const day = days.get(date) ?? { date, trips: [] }
        day.trips.push({ id: t.id, from, to, label: `${hm.format(new Date(t.started_at))} to ${hm.format(new Date(t.ended_at))}, ${formatDuration(t.duration_s)}` })
        days.set(date, day)
    }
    return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * When a driver was driving: each row is a day, each bar a trip placed at its
 * time of day. It shows shift pattern, long days and gaps at a glance. The
 * rows scroll inside the card; open trips (no end yet) are left out.
 */
export function TripTimeline({ trips }: { trips: TripRow[] }) {
    const days = useMemo(() => groupTripsByDay(trips), [trips])

    return (
        <div className="space-y-2">
            <div className="flex pl-24 text-[10px] text-an-muted" aria-hidden>
                {[0, 6, 12, 18, 24].map((h) => (
                    <span key={h} className="flex-1 first:text-left last:text-right [&:not(:first-child):not(:last-child)]:text-center">
                        {String(h).padStart(2, '0')}:00
                    </span>
                ))}
            </div>
            <div role="region" aria-label="Trip timeline" tabIndex={0} className="max-h-72 overflow-y-auto rounded-lg border border-an-border px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent">
                <ul className="space-y-1.5">
                    {days.map((day) => (
                        <li key={day.date} className="flex items-center gap-2">
                            <span className="w-22 shrink-0 text-xs tabular-nums text-an-muted" style={{ width: '5.5rem' }}>
                                {formatDate(day.date)}
                            </span>
                            <div className="relative h-4 flex-1 rounded bg-an-surface-muted" aria-hidden>
                                {day.trips.map((t) => (
                                    <span
                                        key={t.id}
                                        title={t.label}
                                        className="absolute top-0 h-4 rounded-sm"
                                        style={{ left: `${(t.from / 1440) * 100}%`, width: `${Math.max(((t.to - t.from) / 1440) * 100, 0.6)}%`, background: 'var(--an-chart-1)' }}
                                    />
                                ))}
                            </div>
                            <span className="sr-only">
                                {formatDate(day.date)}: {day.trips.length} trips, {day.trips.map((t) => t.label).join('; ')}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

// ── Inspections: one square per day ──────────────────────────────────────────

/** Every date from `start` to `end` inclusive (YYYY-MM-DD). */
export function datesBetween(start: string, end: string): string[] {
    const out: string[] = []
    for (let t = new Date(`${start}T12:00:00Z`).getTime(), stop = new Date(`${end}T12:00:00Z`).getTime(); t <= stop; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10))
    return out
}

/**
 * Pre-trip inspections across a period: a square per day that is empty when
 * nobody inspected, green when inspections were done and amber when some of
 * them recorded defects. A square's meaning is also in its tooltip and in the
 * text list.
 */
export function InspectionStrip({ rows, start, end }: { rows: InspectionRow[]; start: string; end: string }) {
    const byDay = useMemo(() => {
        const map = new Map<string, { inspections: number; defects: number | null }>()
        for (const r of rows) {
            const cur = map.get(r.date) ?? { inspections: 0, defects: 0 }
            map.set(r.date, { inspections: cur.inspections + r.inspections, defects: cur.defects === null || r.with_defects === null ? null : cur.defects + r.with_defects })
        }
        return map
    }, [rows])
    const days = useMemo(() => datesBetween(start, end), [start, end])

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1" role="img" aria-label="Inspections per day">
                {days.map((d) => {
                    const day = byDay.get(d)
                    const state = !day ? 'none' : day.defects && day.defects > 0 ? 'defects' : 'done'
                    return (
                        <span
                            key={d}
                            title={`${formatDate(d)}: ${day ? `${day.inspections} inspections${day.defects ? `, ${day.defects} with defects` : ''}` : 'no inspections'}`}
                            className={cn('h-4 w-4 rounded-sm', state === 'none' && 'bg-an-surface-muted', state === 'done' && 'bg-an-good', state === 'defects' && 'bg-an-warn')}
                        />
                    )
                })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-an-muted">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-an-surface-muted" aria-hidden /> None</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-an-good" aria-hidden /> Inspected</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-an-warn" aria-hidden /> With defects</span>
            </div>
            <ul className="sr-only">
                {days.filter((d) => byDay.has(d)).map((d) => (
                    <li key={d}>
                        {formatDate(d)}: {byDay.get(d)!.inspections} inspections
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ── Document expiry ──────────────────────────────────────────────────────────

const EXPIRY_BUCKETS = [
    { id: 'expired', label: 'Expired', test: (d: number) => d < 0 },
    { id: 'week', label: 'Within 7 days', test: (d: number) => d >= 0 && d <= 7 },
    { id: 'two', label: '8 to 14 days', test: (d: number) => d >= 8 && d <= 14 },
    { id: 'month', label: '15 days or more', test: (d: number) => d >= 15 },
] as const

/** Counts documents into expiry buckets, split by whether a driver or a vehicle owns them. Grouping only: every count is from the rows the backend sent. */
export function bucketExpiry(docs: ExpiringDocument[]) {
    return EXPIRY_BUCKETS.map((b) => {
        const inBucket = docs.filter((d) => b.test(d.days_left))
        return { bucket: b.label, Drivers: inBucket.filter((d) => d.owner_type === 'driver').length, Vehicles: inBucket.filter((d) => d.owner_type === 'vehicle').length }
    })
}

/** Drivers' and vehicles' documents by how soon they expire, with the soonest listed in a scrolling box. */
export function ExpiryChart({ docs }: { docs: ExpiringDocument[] }) {
    const data = useMemo(() => bucketExpiry(docs), [docs])

    return (
        <div className="space-y-3">
            <div className="h-44 w-full" role="img" aria-label="Documents by time to expiry">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--an-border)" />
                        <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                        <Tooltip cursor={{ fill: 'var(--an-surface-muted)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Drivers" stackId="docs" fill="var(--an-chart-1)" isAnimationActive={false} />
                        <Bar dataKey="Vehicles" stackId="docs" fill="var(--an-chart-2)" isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div role="region" aria-label="Documents by expiry date" tabIndex={0} className="max-h-48 overflow-y-auto rounded-lg border border-an-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent">
                <ul className="divide-y divide-an-border">
                    {docs.map((d) => (
                        <li key={`${d.owner_type}-${d.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-an-text">{d.owner ?? `${pretty(d.owner_type)} ${d.owner_id}`}</span>
                                <span className="block truncate text-xs text-an-muted">
                                    {pretty(d.owner_type)} · {d.title ?? pretty(d.category ?? 'Document')}
                                </span>
                            </span>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', d.status === 'expired' ? 'bg-an-bad-soft text-an-bad' : 'bg-an-warn-soft text-an-warn')}>
                                {d.days_left < 0 ? `Expired ${Math.abs(d.days_left)} d ago` : d.days_left === 0 ? 'Expires today' : `${d.days_left} d left`}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
