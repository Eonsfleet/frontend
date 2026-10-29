'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import * as reports from '@/lib/api/telemetryReports'
import type { FuelReportRow } from '@/lib/api/telemetryReports'
import { FuelTabs } from '../components/FuelTabs'
import { Column, Figure, ReportTable, ReportToolbar } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDate, formatNumber } from '@/components/analytics/telemetry/format'

const GROUPS = [
    { value: 'vehicle', label: 'Whole period' },
    { value: 'day', label: 'By day' },
    { value: 'week', label: 'By week' },
    { value: 'month', label: 'By month' },
] as const

const STATE_STYLE = { ok: '', partial: 'text-amber-700', unavailable: 'text-slate-400' } as const

const columns = (grouped: boolean): Column<FuelReportRow>[] => [
    ...(grouped ? [{ key: 'period', header: 'Period', render: (r: FuelReportRow) => formatDate(r.period) }] : []),
    { key: 'vehicle', header: 'Vehicle', render: r => <span className="font-bold">{r.vehicle ?? dash}</span> },
    { key: 'distance', header: 'Distance', render: r => formatNumber(r.distance_km, 0, 'km') },
    {
        key: 'estimated', header: 'GPS estimate', render: r => {
            if (!r.estimated) return dash
            const state = r.estimated.status.state
            return (
                <span className={cn('inline-flex items-center gap-1', STATE_STYLE[state])} title={r.estimated.status.note ?? undefined}>
                    {state === 'unavailable' ? 'Not estimated' : formatNumber(r.estimated.litres, 1, 'L')}
                    {state === 'partial' && <span title="Some trips were not estimated, or the distance may be low">*</span>}
                </span>
            )
        },
    },
    { key: 'measured', header: 'Sensor', render: r => (r.measured ? formatNumber(r.measured.litres, 1, 'L') : dash) },
    {
        key: 'purchased', header: 'Purchased', render: r => (r.purchased ? (
            <span>
                {formatNumber(r.purchased.litres, 1, 'L')}
                {r.purchased.pending > 0 && <span className="ml-1 text-slate-400">({r.purchased.pending} pending)</span>}
            </span>
        ) : dash),
    },
    { key: 'cost', header: 'Cost', render: r => (r.purchased ? formatNumber(r.purchased.cost, 0) : dash) },
    { key: 'refills', header: 'Refills detected', render: r => (r.refills ? `${formatNumber(r.refills.litres, 1, 'L')} (${r.refills.count})` : dash) },
    {
        key: 'consumption', header: 'Consumption', render: r => (r.consumption.litres === null ? dash : (
            <span className="inline-flex items-center gap-1.5">
                {formatNumber(r.consumption.litres, 1, 'L')}
                <Badge variant="outline" className={cn('text-[9px]', r.consumption.source === 'Sensor' ? 'border-emerald-300 text-emerald-700' : 'text-slate-500')}>{r.consumption.source}</Badge>
            </span>
        )),
    },
    { key: 'rate', header: 'L/100 km', render: r => formatNumber(r.consumption.l_per_100km, 1) },
    {
        key: 'gap', header: 'Bought − burnt', render: r => (r.purchased_minus_consumed === null ? dash : (
            <span className={cn(r.purchased_minus_consumed > 0 && 'font-bold text-amber-700')} title="Fuel bought that the recorded driving does not account for">
                {r.purchased_minus_consumed > 0 ? '+' : ''}{formatNumber(r.purchased_minus_consumed, 1, 'L')}
            </span>
        )),
    },
]

function FuelBySource() {
    const { filters, set, value } = useReportFilters('30d')
    const group = (value('group') ?? 'vehicle') as (typeof GROUPS)[number]['value']
    const { data, isLoading } = useQuery({ queryKey: ['fuel-by-source', filters, group], queryFn: () => reports.getFuelReport({ ...filters, group }) })
    const totals = data?.extra.totals
    const litres = (source: string) => totals?.by_source.find(s => s.source === source)

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel by Source</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Estimated, measured and purchased fuel side by side. An estimate is never counted as a measurement, and consumption uses the sensor when there is one.
                </p>
            </div>
            <FuelTabs active="Fuel by Source" />
            <ReportToolbar reportType="fuel.source-report" exportExtra={{ group }}>
                <select aria-label="Group" value={group} onChange={e => set({ group: e.target.value })} className="h-8 rounded-lg border border-slate-200 px-2 text-xs">
                    {GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
            </ReportToolbar>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Figure label="GPS estimate" value={formatNumber(litres('GPS estimate')?.litres, 0, 'L')} note="Distance and idle time × the vehicle's rate" />
                <Figure label="Sensor" value={formatNumber(litres('Sensor')?.litres, 0, 'L')} note="Measured by a declared fuel input" />
                <Figure label="Purchased" value={formatNumber(litres('System: purchase')?.litres, 0, 'L')} note={litres("System: purchase")?.cost ? `Cost ${formatNumber(litres("System: purchase")?.cost, 0)}` : "Fuel expenses"} />
                <Figure label="Refills detected" value={formatNumber(litres('System: refill detected')?.litres, 0, 'L')} note="From the tracker's fuel level" />
                <Figure
                    label="Not estimated"
                    value={totals ? totals.vehicles_not_estimated : dash}
                    note={<a href="/fuel/setup?incomplete=1" className="text-blue-600 hover:underline">Vehicles with no consumption rate →</a>}
                />
            </div>
            <ReportTable
                columns={columns(group !== 'vehicle')}
                rows={data?.data}
                meta={data?.meta}
                isLoading={isLoading}
                rowKey={r => `${r.vehicle_id}-${r.period ?? 'all'}`}
                empty="No fuel recorded in this period."
            />
            <p className="text-[10px] text-slate-400">
                * Some trips were not estimated, or their distance may be low. &quot;Not estimated&quot;: the vehicle has no consumption rate of its own, so the platform did not price its trips.
            </p>
        </div>
    )
}

export default function FuelBySourcePage() {
    return (
        <Suspense>
            <FuelBySource />
        </Suspense>
    )
}
