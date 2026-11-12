import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dash } from '@/components/analytics/telemetry/format'

/** The change from the previous period, as a percent. Null when it cannot be stated. */
export function percentChange(current: number | null | undefined, previous: number | null | undefined): number | null {
    if (current === null || current === undefined || previous === null || previous === undefined) return null
    if (previous === 0) return null
    return ((current - previous) / previous) * 100
}

/**
 * Whether a rise is good or bad depends on the metric: more alarms is worse,
 * more online devices is better. `neutral` colors neither way.
 */
export function Delta({ change, rise }: { change: number | null; rise: 'good' | 'bad' | 'neutral' }) {
    if (change === null) return <span className="text-xs text-an-muted">No previous figure</span>
    if (Math.abs(change) < 0.05) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-an-muted">
                <Minus className="h-3 w-3" aria-hidden /> No change
            </span>
        )
    }
    const up = change > 0
    const good = rise === 'neutral' ? null : up === (rise === 'good')
    const Icon = up ? ArrowUpRight : ArrowDownRight
    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                good === null ? 'text-an-muted' : good ? 'text-an-good' : 'text-an-bad',
            )}
        >
            <Icon className="h-3 w-3" aria-hidden />
            {Math.abs(change).toLocaleString('en-GB', { maximumFractionDigits: 1 })}%
            <span className="sr-only">{up ? ' higher' : ' lower'} than the previous period</span>
        </span>
    )
}

export function KpiCard({
    label,
    value,
    unit,
    note,
    delta,
    tone = 'default',
    icon,
}: {
    label: string
    /** null is "not measured": shown as a dash, never 0. */
    value: ReactNode | null
    unit?: string
    note?: ReactNode
    delta?: ReactNode
    tone?: 'default' | 'good' | 'warn' | 'bad'
    icon?: ReactNode
}) {
    return (
        <div className="flex flex-col gap-1 rounded-xl border border-an-border bg-an-surface p-4">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-an-muted">
                <span className="truncate">{label}</span>
                {icon && <span aria-hidden className="shrink-0">{icon}</span>}
            </div>
            <div
                className={cn(
                    'text-2xl font-semibold tabular-nums tracking-tight',
                    tone === 'good' && 'text-an-good',
                    tone === 'warn' && 'text-an-warn',
                    tone === 'bad' && 'text-an-bad',
                    tone === 'default' && 'text-an-text',
                )}
            >
                {value === null || value === undefined ? dash : value}
                {unit && value !== null && value !== undefined && <span className="ml-1 text-sm font-normal text-an-muted">{unit}</span>}
            </div>
            {(delta || note) && (
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-an-muted">
                    {delta}
                    {note}
                </div>
            )}
        </div>
    )
}
