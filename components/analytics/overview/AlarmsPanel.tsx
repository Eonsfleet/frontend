'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Delta, KpiCard, percentChange } from '@/components/analytics/kit/KpiCard'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { Skeleton } from '@/components/ui/skeleton'
import { evaluateWidget } from '@/lib/analytics/applicability'
import { buildReportLink } from '@/lib/analytics/reportLinks'
import type { AnalyticsFilters } from '@/lib/analytics/filters'
import { useAlarmCounts, useAlarmTrend, useReportCatalog } from '@/hooks/analytics/useOverviewQueries'
import { useInView } from '@/hooks/analytics/useInView'
import { formatDate, formatNumber } from '@/components/analytics/telemetry/format'

const pretty = (key: string) => key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

/**
 * Alarms and events in one card: the total for the period (with the previous
 * period beside it when the comparison is on and the backend can serve it, as
 * it keeps 60 days), events per day (per week beyond a month), and every
 * category in a list that scrolls inside the card. The chart starts loading
 * only when the card is scrolled near. (The marker wraps the whole card: the
 * card body is not mounted until the totals load, so a marker inside it would
 * never be seen.)
 */
export function AlarmsPanel({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('alarms', filters), [filters])
    const applied = evaluation.range === 'applied'
    const current = useAlarmCounts(filters, 'current', applied)
    const previous = useAlarmCounts(filters, 'previous', applied && evaluation.compare === 'applied')
    const catalog = useReportCatalog()
    const { ref: chartRef, seen: chartSeen } = useInView<HTMLDivElement>()
    const trend = useAlarmTrend(filters, chartSeen && applied)

    const rows = current.data?.data ?? []
    const total = rows.reduce((sum, r) => sum + r.total, 0)
    const prevTotal = previous.data ? previous.data.data.reduce((sum, r) => sum + r.total, 0) : null
    const link = useMemo(() => buildReportLink('events.counts', catalog.data, filters), [catalog.data, filters])
    const meta = current.data?.meta
    const categories = [...rows].sort((a, b) => b.total - a.total)
    const max = categories[0]?.total ?? 0
    const points = trend.data?.data ?? []
    const interval = trend.data?.extra.interval === 'week' ? 'week' : 'day'

    return (
        <div ref={chartRef}>
            <WidgetFrame
                title="Alarms and events"
                evaluation={evaluation}
                query={current}
                isEmpty={!!current.data && total === 0}
                emptyText="No alarms or events in this period."
                link={link}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <KpiCard
                            label="Events in period"
                            value={formatNumber(total, 0)}
                            delta={evaluation.compare === 'applied' && previous.data ? <Delta change={percentChange(total, prevTotal)} rise="bad" /> : undefined}
                            note={
                                evaluation.compare === 'unavailable' && evaluation.compareReason
                                    ? `Comparison unavailable: ${evaluation.compareReason}`
                                    : evaluation.compare === 'applied' && prevTotal !== null
                                      ? `${formatNumber(prevTotal, 0)} in the previous period`
                                      : undefined
                            }
                        />
                        {meta?.partial && (
                            <p className="rounded-md bg-an-warn-soft px-2.5 py-1.5 text-xs text-an-warn">
                                Only data from {formatDate(meta.available_from ?? meta.from)} is kept, so earlier days are missing from this count.
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-5">
                        <div className="min-w-0 lg:col-span-3">
                            <h3 className="mb-2 text-xs font-medium text-an-muted">Events per {interval}</h3>
                            {!chartSeen || trend.isPending ? (
                                <Skeleton className="h-56 w-full" />
                            ) : trend.isError ? (
                                <p role="alert" className="rounded-lg bg-an-bad-soft px-3 py-2.5 text-sm text-an-bad">
                                    Could not load the daily chart.
                                </p>
                            ) : points.length === 0 ? (
                                <p className="text-sm text-an-muted">No events to chart in this period.</p>
                            ) : (
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                            <CartesianGrid vertical={false} stroke="var(--an-border)" />
                                            <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} minTickGap={24} />
                                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                                            <Tooltip cursor={{ fill: 'var(--an-surface-muted)' }} />
                                            <Bar dataKey="total" name="Events" fill="var(--an-chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 lg:col-span-2">
                            <h3 className="mb-2 text-xs font-medium text-an-muted">By category</h3>
                            {/* Every category is listed; the box scrolls, so a long list does not stretch the card. */}
                            <div
                                role="region"
                                aria-label="Alarms and events by category"
                                tabIndex={0}
                                className="max-h-56 overflow-y-auto rounded-lg border border-an-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent"
                            >
                                <ul className="space-y-3">
                                    {categories.map((row) => (
                                        <li key={String(row.key)}>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-an-text">{pretty(row.label ?? 'Unknown')}</span>
                                                <span className="tabular-nums text-an-muted">{row.total.toLocaleString('en-GB')}</span>
                                            </div>
                                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-an-surface-muted" aria-hidden>
                                                <div className="h-full rounded-full" style={{ width: `${max ? (row.total / max) * 100 : 0}%`, background: 'var(--an-chart-1)' }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </WidgetFrame>
        </div>
    )
}
