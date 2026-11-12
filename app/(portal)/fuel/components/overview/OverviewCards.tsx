'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { FuelOverviewSummary, OverviewChange } from '@/lib/api/fuelPage'
import { changeSentiment, formatChange, formatLitres, formatNaira, formatNumber, formatPercent, type Quality } from '@/lib/fuel-format'
import { QualityBadge } from '../shared/QualityBadge'

const card = 'rounded-2xl bg-white p-4'

/** The page's honesty line: how much of the fleet the figures below stand on. */
export function QualityStrip({ quality }: { quality: FuelOverviewSummary['quality'] }) {
    if (quality.vehicles === 0) return null
    return (
        <p className="rounded-xl bg-white px-4 py-2 text-sm text-slate-600" data-testid="quality-strip">
            <span className="font-semibold text-slate-900">{quality.with_measured_usage}</span> of {quality.vehicles} vehicles have measured fuel use
            {' · '}<span className="font-semibold text-slate-900">{quality.estimated_only}</span> estimated only
            {' · '}<span className={cn('font-semibold', quality.no_data > 0 ? 'text-amber-700' : 'text-slate-900')}>{quality.no_data}</span> with no data this period
        </p>
    )
}

function ChangeLine({ change, higherIsBad = true, compare }: { change: OverviewChange | undefined; higherIsBad?: boolean; compare: string }) {
    const s = changeSentiment(change?.percent, higherIsBad)
    if (s === null) return <p className="mt-1 text-xs text-slate-400">No {compare.replace('vs ', '')} figure to compare</p>
    return (
        <p className="mt-1 text-xs">
            <span className={cn('font-semibold', s === 'bad' ? 'text-red-600' : s === 'good' ? 'text-emerald-600' : 'text-slate-500')}>{formatChange(change?.percent)}</span>
            <span className="text-slate-400"> {compare}</span>
        </p>
    )
}

function Kpi({ label, value, quality, detail, change, higherIsBad, compare }: {
    label: string
    value: string
    quality?: Quality | null
    detail?: string
    change?: OverviewChange
    higherIsBad?: boolean
    compare: string
}) {
    return (
        <div className={card}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                {quality !== undefined && <QualityBadge quality={quality} />}
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
            {detail && <p className="text-xs text-slate-500">{detail}</p>}
            <ChangeLine change={change} higherIsBad={higherIsBad} compare={compare} />
        </div>
    )
}

export function KpiCards({ data, compare }: { data: FuelOverviewSummary; compare: string }) {
    const c = data.current
    const used: Quality | null = c.litres == null ? null : (c.litres_estimated ?? 0) === 0 ? 'measured' : (c.litres_measured ?? 0) === 0 ? 'estimated' : null
    const split = c.litres != null && used === null ? `${formatLitres(c.litres_measured, 'measured', 0)} measured · ${formatLitres(c.litres_estimated, 'estimated', 0)} estimated` : undefined
    const eff: Quality | null = c.l_per_100km == null ? null : (c.litres_estimated ?? 0) > 0 ? 'estimated' : 'measured'

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi label="Fuel used" value={formatLitres(c.litres, used ?? 'measured', 0)} quality={used} detail={split} change={data.change.litres} compare={compare} />
            <Kpi label="Fuel spend" value={formatNaira(c.spend)} detail={c.price_per_litre != null ? `${formatNaira(c.price_per_litre)} per litre · approved purchases` : 'Approved purchases'} change={data.change.spend} compare={compare} />
            <Kpi label="Efficiency" value={c.l_per_100km == null ? '—' : `${formatNumber(c.l_per_100km, 1)} L/100 km`} quality={eff} detail={c.distance_km != null ? `${formatNumber(c.distance_km, 0, 'km')} driven` : undefined} change={data.change.l_per_100km} compare={compare} />
            <Kpi label="Fuel bought" value={formatLitres(c.purchased_litres, 'measured', 0)} detail="Litres on approved purchases" change={data.change.purchased_litres} compare={compare} />
            <Kpi label="Idling" value={formatLitres(c.idle_litres, 'estimated', 0)} quality={c.idle_litres == null ? null : 'estimated'} detail={c.idle_cost != null ? `${formatNaira(c.idle_cost)} at this period's price` : undefined} change={data.change.idle_litres} compare={compare} />
            <Kpi label="Distance" value={formatNumber(c.distance_km, 0, 'km')} change={data.change.distance_km} higherIsBad={false} compare={compare} />
        </div>
    )
}

export function BudgetCard({ budget }: { budget: FuelOverviewSummary['budget'] }) {
    if (budget === null) {
        return (
            <div className={card}>
                <h2 className="text-sm font-semibold text-slate-900">Fuel budget</h2>
                <p className="mt-2 text-sm text-slate-500">No litre budgets are set for this month.</p>
                <Link href="/fuel/settings/budgets" className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline">Set fuel budgets →</Link>
            </div>
        )
    }
    const over = (budget.projected_over_litres ?? 0) > 0
    const pct = Math.min(100, budget.used_percent ?? 0)
    return (
        <div className={card}>
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Fuel budget · {budget.month}</h2>
                <Link href="/fuel/settings/budgets" className="text-xs font-medium text-blue-700 hover:underline">Edit</Link>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatLitres(budget.used_litres, 'measured', 0)} <span className="text-sm font-normal text-slate-500">of {formatLitres(budget.budget_litres, 'measured', 0)}</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${formatPercent(budget.used_percent)} of budget used`}>
                <div className={cn('h-full rounded-full', (budget.used_percent ?? 0) >= 100 ? 'bg-red-500' : (budget.used_percent ?? 0) >= 85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
                Day {budget.days_elapsed} of {budget.days_in_month} · {budget.vehicles} vehicles budgeted
            </p>
            {budget.projected_litres != null && (
                <p className={cn('mt-1 text-sm font-medium', over ? 'text-red-600' : 'text-emerald-700')}>
                    At this pace: {formatLitres(budget.projected_litres, 'estimated', 0)}
                    {budget.projected_over_litres != null && ` (${over ? 'over' : 'under'} by ${formatLitres(Math.abs(budget.projected_over_litres), 'estimated', 0)})`}
                </p>
            )}
        </div>
    )
}

export function LossSignalsCard({ loss }: { loss: FuelOverviewSummary['loss'] }) {
    const gap = loss.bought_vs_used.gap_litres
    const rows: Array<{ label: string; value: string; note: string; alarm: boolean }> = [
        {
            label: 'Suspected drains',
            value: String(loss.drain_alerts.count),
            note: loss.drain_alerts.count === 0 ? 'No drain or leak alerts' : `${loss.drain_alerts.vehicles} vehicle${loss.drain_alerts.vehicles === 1 ? '' : 's'}${loss.drain_alerts.litres != null ? ` · ${formatLitres(loss.drain_alerts.litres, 'measured', 0)}` : ''}`,
            alarm: loss.drain_alerts.count > 0,
        },
        {
            label: 'Refills with no purchase',
            value: String(loss.unmatched_refills.count),
            note: loss.unmatched_refills.count === 0 ? 'Every device refill matches a purchase' : `${formatLitres(loss.unmatched_refills.litres, 'measured', 0)} went in without a record`,
            alarm: loss.unmatched_refills.count > 0,
        },
        {
            label: 'Bought vs used',
            value: gap == null ? '—' : `${gap > 0 ? '+' : ''}${formatNumber(gap, 0)} L`,
            note: gap == null ? 'Needs both purchases and usage' : gap > 0 ? 'More bought than the fleet recorded using. Worth a look, not proof of loss' : 'Used more than was bought',
            alarm: gap != null && gap > 0,
        },
        {
            label: 'Idling',
            value: formatLitres(loss.idle.litres, 'estimated', 0),
            note: loss.idle.cost != null ? `${formatNaira(loss.idle.cost)} burning while parked` : 'Estimated from engine hours',
            alarm: false,
        },
    ]
    return (
        <div className={card}>
            <h2 className="text-sm font-semibold text-slate-900">Where fuel may be leaking</h2>
            <ul className="mt-2 divide-y divide-slate-100">
                {rows.map((r) => (
                    <li key={r.label} className="flex items-start justify-between gap-3 py-2">
                        <div>
                            <p className="text-sm font-medium text-slate-900">{r.label}</p>
                            <p className="text-xs text-slate-500">{r.note}</p>
                        </div>
                        <p className={cn('text-lg font-bold tabular-nums', r.alarm ? 'text-red-600' : 'text-slate-900')}>{r.value}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}
