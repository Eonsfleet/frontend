'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AnalyticsFilterBar } from '@/components/analytics/shell/AnalyticsFilterBar'
import { FreshnessBar } from '@/components/analytics/overview/FreshnessBar'
import { KpiCard } from '@/components/analytics/kit/KpiCard'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { Donut, RankedBars, type BarRow, type Slice } from '@/components/analytics/fleet/charts'
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { useInView } from '@/hooks/analytics/useInView'
import { useMaintenanceCost, useMaintenanceDue, useMaintenanceWorkflow, useScheduleSummary, useWorkshopSummary } from '@/hooks/analytics/useMaintenanceQueries'
import { evaluateWidget } from '@/lib/analytics/applicability'
import { nairaFromKobo } from '@/lib/analytics/money'
import { formatDate, formatNumber } from '@/components/analytics/telemetry/format'
import { cn } from '@/lib/utils'
import type { UpcomingMaintenance } from '@/types/analytics'

const PERIODS = ['7d', '30d', '90d', '1y'] as const
const idle = { isPending: false, isError: false, error: null, refetch: () => undefined }
const count = (n: number) => n.toLocaleString('en-GB')
const pretty = (key: string | null) => (key ? key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Unspecified')

const WEEKS = [
    { label: 'Within 7 days', test: (d: number) => d <= 7 },
    { label: '8 to 14 days', test: (d: number) => d >= 8 && d <= 14 },
    { label: '15 to 21 days', test: (d: number) => d >= 15 && d <= 21 },
    { label: '22 to 30 days', test: (d: number) => d >= 22 },
] as const

/** Counts upcoming schedules into weekly buckets. Grouping only: every count is from the rows the backend sent. */
export function bucketDue(rows: UpcomingMaintenance[]) {
    return WEEKS.map((w) => ({ bucket: w.label, schedules: rows.filter((r) => w.test(r.days_until_due)).length }))
}

const inDays = (d: number) => (d < 0 ? `${Math.abs(d)} d overdue` : d === 0 ? 'Due today' : `In ${d} d`)

/**
 * The Maintenance tab, rebuilt as charts. Only the cost trend follows the period;
 * the other cards are all-time or have a window of their own, and say so. Cost
 * figures are closed jobs only, dated by their last update (the backend keeps no
 * closed date for them), and are shown in naira from the backend's kobo. "Due soon"
 * needs the insights permission, which is separate from the maintenance one, so a
 * mechanic sees a plain access message on that card and the rest still shows.
 */
export function MaintenanceV2() {
    const { filters } = useAnalyticsFilters()

    const schedulesEval = useMemo(() => evaluateWidget('maintenance-schedules', filters), [filters])
    const dueEval = useMemo(() => evaluateWidget('maintenance-due', filters), [filters])
    const costEval = useMemo(() => evaluateWidget('maintenance-cost', filters), [filters])
    const workflowEval = useMemo(() => evaluateWidget('maintenance-workflow', filters), [filters])
    const workshopEval = useMemo(() => evaluateWidget('maintenance-workshop', filters), [filters])

    const schedules = useScheduleSummary()
    const due = useMaintenanceDue()
    const cost = useMaintenanceCost(filters, costEval.range === 'applied')

    const { ref: lowRef, seen: lowSeen } = useInView<HTMLDivElement>()
    const workflow = useMaintenanceWorkflow(lowSeen)
    const workshop = useWorkshopSummary(lowSeen)

    const s = schedules.data
    const scheduleSlices: Slice[] = s
        ? [
              { label: 'Overdue', value: s.overdue, color: 'var(--an-bad)' },
              { label: 'Due within 14 days', value: s.upcoming_14d, color: 'var(--an-chart-4)' },
              { label: 'On schedule or finished', value: Math.max(0, s.current), color: 'var(--an-good)' },
          ].filter((x) => x.value > 0)
        : []

    const upcoming = useMemo(() => due.data?.upcoming ?? [], [due.data])
    const dueBuckets = useMemo(() => bucketDue(upcoming), [upcoming])

    const trend = (cost.data?.trend ?? []).map((t) => ({ period: t.period, naira: t.total_kobo / 100, jobs: t.jobs_count }))
    const costliest: BarRow[] = (cost.data?.by_vehicle ?? []).map((v) => ({ id: v.vehicle_id, label: v.registration_number ?? `Vehicle ${v.vehicle_id}`, value: v.total_kobo }))

    const stages: BarRow[] = (workflow.data?.by_status ?? []).filter((r) => r.count > 0).map((r) => ({ id: '', label: pretty(r.status), value: r.count }))

    return (
        <div className="space-y-5">
            <AnalyticsFilterBar entities={false} compare={false} presets={PERIODS} custom={false} />
            <FreshnessBar />

            <div className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame title="Maintenance schedules" evaluation={schedulesEval} query={schedules} isEmpty={!!s && s.total === 0} emptyText="No maintenance schedules yet.">
                    {s && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <KpiCard label="Schedules" value={formatNumber(s.total, 0)} />
                                <KpiCard label="Overdue" value={formatNumber(s.overdue, 0)} tone={s.overdue > 0 ? 'bad' : 'default'} />
                                <KpiCard label="Due in 14 days" value={formatNumber(s.upcoming_14d, 0)} tone={s.upcoming_14d > 0 ? 'warn' : 'default'} />
                            </div>
                            <Donut slices={scheduleSlices} centerLabel="schedules" ariaLabel="Maintenance schedules by due date" />
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame
                    title="Maintenance due in the next 30 days"
                    evaluation={dueEval}
                    query={due}
                    isEmpty={!!due.data && due.data.upcoming_count === 0 && due.data.overdue_count === 0}
                    emptyText="Nothing is due in the next 30 days, and nothing is overdue."
                >
                    {due.data && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <KpiCard label="Due in 30 days" value={formatNumber(due.data.upcoming_count, 0)} tone={due.data.upcoming_count > 0 ? 'warn' : 'default'} />
                                <KpiCard label="Overdue" value={formatNumber(due.data.overdue_count, 0)} tone={due.data.overdue_count > 0 ? 'bad' : 'default'} note="All time, open schedules" />
                            </div>
                            <div className="h-40 w-full" role="img" aria-label="Schedules due by week">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dueBuckets} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="var(--an-border)" />
                                        <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} />
                                        <Tooltip cursor={{ fill: 'var(--an-surface-muted)' }} />
                                        <Bar dataKey="schedules" name="Schedules" fill="var(--an-chart-4)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div role="region" aria-label="Schedules due soon" tabIndex={0} className="max-h-48 overflow-y-auto rounded-lg border border-an-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent">
                                <ul className="divide-y divide-an-border">
                                    {upcoming.map((u) => (
                                        <li key={u.schedule_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium text-an-text">{u.vehicle?.registration_number ?? 'Vehicle'}</span>
                                                <span className="block truncate text-xs text-an-muted">
                                                    {pretty(u.title)} · {formatDate(u.due_date)}
                                                </span>
                                            </span>
                                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', u.days_until_due <= 7 ? 'bg-an-warn-soft text-an-warn' : 'bg-an-surface-muted text-an-muted')}>{inDays(u.days_until_due)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {due.data.upcoming_count > upcoming.length && <p className="text-xs text-an-warn">Showing the first {upcoming.length} of {due.data.upcoming_count}.</p>}
                        </div>
                    )}
                </WidgetFrame>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame title="Maintenance cost over time" evaluation={costEval} query={cost} isEmpty={!!cost.data && trend.length === 0} emptyText="No closed jobs with a cost in this period.">
                    {cost.data && (
                        <div className="space-y-3">
                            <KpiCard label="Cost of closed jobs in the period" value={nairaFromKobo(cost.data.total_cost_kobo)} />
                            <div className="h-48 w-full" role="img" aria-label="Maintenance cost per period">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trend} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="var(--an-border)" />
                                        <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} minTickGap={24} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--an-muted)' }} tickFormatter={(v) => `₦${Number(v).toLocaleString('en-GB')}`} width={72} />
                                        <Tooltip formatter={(v) => [`₦${Number(v).toLocaleString('en-GB')}`, 'Cost']} cursor={{ fill: 'var(--an-surface-muted)' }} />
                                        <Bar dataKey="naira" name="Cost" fill="var(--an-chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-an-muted">Closed jobs only, counted in the period of their last update, since the backend keeps no closed date.</p>
                            <ul className="sr-only">
                                {cost.data.trend.map((t) => (
                                    <li key={t.period}>
                                        {t.period}: {nairaFromKobo(t.total_kobo)}, {t.jobs_count} jobs
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame title="Vehicles that cost the most to maintain" evaluation={costEval} query={cost} isEmpty={!!cost.data && costliest.length === 0} emptyText="No closed jobs with a cost in this period.">
                    <RankedBars rows={costliest} format={nairaFromKobo} metricLabel="cost" hrefFor={(id) => `/vehicles/${id}`} subject="vehicles" />
                </WidgetFrame>
            </div>

            <div ref={lowRef} className="grid gap-4 lg:grid-cols-2">
                <WidgetFrame
                    title="Maintenance jobs by stage"
                    evaluation={workflowEval}
                    query={lowSeen ? workflow : idle}
                    isEmpty={!lowSeen || (!!workflow.data && stages.length === 0)}
                    emptyText={lowSeen ? 'No maintenance jobs yet.' : 'Loads when scrolled into view.'}
                >
                    {workflow.data && (
                        <div className="space-y-3">
                            <KpiCard
                                label="Average time from start to completion"
                                value={workflow.data.avg_turnaround_days === null ? null : `${formatNumber(workflow.data.avg_turnaround_days, 1)} days`}
                                note="Closed jobs with a start and completion date"
                            />
                            <RankedBars rows={stages} format={count} metricLabel="jobs" hrefFor={() => ''} subject="job stages" limit={7} />
                            <p className="text-xs text-an-muted">Seven stages are listed. Jobs in any other status, such as rejected, are not.</p>
                        </div>
                    )}
                </WidgetFrame>

                <WidgetFrame title="Workshop" evaluation={workshopEval} query={lowSeen ? workshop : idle} isEmpty={!lowSeen} emptyText="Loads when scrolled into view.">
                    {workshop.data && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <KpiCard label="Jobs" value={formatNumber(workshop.data.total_jobs, 0)} />
                            <KpiCard label="In progress" value={formatNumber(workshop.data.in_progress, 0)} />
                            <KpiCard label="Awaiting verification" value={formatNumber(workshop.data.pending_verification, 0)} tone={workshop.data.pending_verification > 0 ? 'warn' : 'default'} />
                            <KpiCard label="Closed" value={formatNumber(workshop.data.closed, 0)} />
                            <KpiCard label="Cost of closed jobs" value={nairaFromKobo(workshop.data.total_cost_kobo)} note="All time" />
                            <KpiCard label="Vendor rating" value={workshop.data.avg_vendor_rating === null ? null : formatNumber(workshop.data.avg_vendor_rating, 1)} note={workshop.data.avg_vendor_rating === null ? 'No reviews yet' : 'Average of reviews'} />
                        </div>
                    )}
                </WidgetFrame>
            </div>
        </div>
    )
}
