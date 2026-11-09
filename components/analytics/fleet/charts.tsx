'use client'

import { useRouter } from 'next/navigation'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface Slice {
    label: string
    value: number
    /** A CSS color, normally one of the --an-chart-* tokens. */
    color: string
}

/**
 * A donut with its legend beside it. The legend doubles as the text version of
 * the chart for screen readers, so the numbers are never only in the drawing.
 */
export function Donut({
    slices,
    centerLabel,
    ariaLabel,
    format = (n) => n.toLocaleString('en-GB'),
}: {
    slices: Slice[]
    centerLabel?: string
    ariaLabel: string
    /** How a value is written in the legend and the centre, e.g. a duration. */
    format?: (value: number) => string
}) {
    const total = slices.reduce((sum, s) => sum + s.value, 0)

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="relative h-36 w-36 shrink-0" role="img" aria-label={ariaLabel}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
                            {slices.map((s) => (
                                <Cell key={s.label} fill={s.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-semibold tabular-nums text-an-text">{format(total)}</span>
                    {centerLabel && <span className="text-xs text-an-muted">{centerLabel}</span>}
                </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                {slices.map((s) => (
                    <li key={s.label} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-an-muted">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                            <span className="truncate">{s.label}</span>
                        </span>
                        <span className="tabular-nums text-an-text">{format(s.value)}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export interface BarRow {
    id: number | string
    label: string
    value: number
}

interface RankedBarsProps {
    rows: BarRow[]
    format: (value: number) => string
    metricLabel: string
    limit?: number
}

/**
 * The top rows by one metric, as horizontal bars. Choosing the top rows out of
 * what the backend already grouped is a selection, not a calculation. Each bar
 * opens its page (`hrefFor(id)`), and a hidden list repeats the values as
 * text. A row with no page of its own (id null) is drawn but not linked.
 */
export function RankedBars({
    rows,
    format,
    metricLabel,
    limit = 10,
    hrefFor,
    subject,
}: RankedBarsProps & { hrefFor: (id: number | string) => string; subject: string }) {
    const router = useRouter()
    const top = [...rows].sort((a, b) => b.value - a.value).slice(0, limit)
    const open = (id: number | string) => router.push(hrefFor(id))

    return (
        <div className="space-y-2">
            <div className="w-full" style={{ height: Math.max(120, top.length * 32 + 24) }} role="img" aria-label={`Top ${top.length} ${subject} by ${metricLabel}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={6}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--an-text)' }} />
                        <Tooltip cursor={{ fill: 'var(--an-surface-muted)' }} formatter={(v) => [format(Number(v)), metricLabel]} />
                        <Bar
                            dataKey="value"
                            name={metricLabel}
                            fill="var(--an-chart-1)"
                            radius={[0, 4, 4, 0]}
                            isAnimationActive={false}
                            cursor="pointer"
                            onClick={(row) => {
                                const id = (row as unknown as BarRow).id
                                if (id !== '') open(id)
                            }}
                            label={{ position: 'right', fontSize: 12, fill: 'var(--an-muted)', formatter: (v: unknown) => format(Number(v)) }}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <ul className="sr-only">
                {top.map((r) => (
                    <li key={r.id}>
                        {r.id === '' ? r.label : <a href={hrefFor(r.id)}>{r.label}</a>}: {format(r.value)}
                    </li>
                ))}
            </ul>
        </div>
    )
}

/** The vehicles version, used by the Fleet tab. */
export const VehicleBars = (props: RankedBarsProps) => <RankedBars {...props} hrefFor={(id) => `/vehicles/${id}`} subject="vehicles" />
