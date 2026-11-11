'use client'

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FuelAnalytics } from '@/lib/api/fuelPage'
import { formatLitres, formatNaira, formatNumber } from '@/lib/fuel-format'
import { QualityBadge } from '../shared/QualityBadge'

const card = 'rounded-2xl bg-white p-4'
const tick = { fontSize: 11 }

function Kpi({ label, value, note, badge }: { label: string; value: string; note?: string; badge?: React.ReactNode }) {
    return (
        <div className={card}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                {badge}
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
        </div>
    )
}

export function AnalyticsKpis({ data }: { data: FuelAnalytics }) {
    const t = data.totals
    // All used litres measured, all estimated, or a mix: the badge says which.
    const quality = t.litres_used == null ? null : (t.litres_estimated ?? 0) === 0 ? 'measured' : (t.litres_measured ?? 0) === 0 ? 'estimated' : null
    const mixed = t.litres_used != null && quality === null
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi
                label="Fuel used"
                value={formatLitres(t.litres_used, quality ?? 'measured', 0)}
                note={mixed ? `${formatLitres(t.litres_measured, 'measured', 0)} measured · ${formatLitres(t.litres_estimated, 'estimated', 0)} estimated` : undefined}
                badge={t.litres_used != null && <QualityBadge quality={quality ?? 'estimated'} />}
            />
            <Kpi label="Distance" value={formatNumber(t.distance_km, 0, 'km')} />
            <Kpi label="Efficiency" value={formatNumber(t.l_per_100km, 1, 'L/100km')} note={t.km_per_litre != null ? `${formatNumber(t.km_per_litre, 2)} km per litre` : undefined} />
            <Kpi label="Refilled (tank sensor)" value={formatLitres(t.refilled_litres, 'measured', 0)} note={`${t.refill_count} refill${t.refill_count === 1 ? '' : 's'} detected`} />
            <Kpi label="Bought" value={formatLitres(t.purchased_litres, 'measured', 0)} note={t.spend != null ? `${formatNaira(t.spend)}${t.price_per_litre != null ? ` · ${formatNaira(t.price_per_litre)}/L` : ''}` : `${t.purchase_count} approved purchase${t.purchase_count === 1 ? '' : 's'}`} />
        </div>
    )
}

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
    return (
        <div className={card}>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {empty ? <p className="mt-3 text-sm text-slate-500">Nothing recorded for this period.</p> : <div className="mt-2 h-60">{children}</div>}
        </div>
    )
}

const label = (d: unknown) => String(d)
const dateTick = (d: string) => d.slice(5)

export function UsageCharts({ data }: { data: FuelAnalytics }) {
    const s = data.series
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title={`Fuel used and distance, by ${data.period.bucket}`} empty={!s.some((p) => p.litres != null)}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={s} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={dateTick} tick={tick} minTickGap={24} />
                        <YAxis yAxisId="l" tick={tick} width={44} />
                        <YAxis yAxisId="d" orientation="right" tick={tick} width={44} />
                        <Tooltip labelFormatter={label} formatter={(v, name) => [formatNumber(typeof v === 'number' ? v : null, 1), String(name)]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="l" dataKey="litres" name="Litres used" fill="#0055FF" radius={[3, 3, 0, 0]} />
                        <Line yAxisId="d" dataKey="distance_km" name="Distance (km)" stroke="#94a3b8" dot={false} connectNulls={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard title={`Efficiency (L/100km), by ${data.period.bucket}`} empty={!s.some((p) => p.l_per_100km != null)}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={dateTick} tick={tick} minTickGap={24} />
                        <YAxis tick={tick} width={44} domain={['auto', 'auto']} />
                        <Tooltip labelFormatter={label} formatter={(v) => [formatNumber(typeof v === 'number' ? v : null, 2, 'L/100km'), 'Efficiency']} />
                        {/* Lower is better; a bucket with no distance is a gap, not a zero. */}
                        <Line dataKey="l_per_100km" stroke="#059669" strokeWidth={2} dot={s.length < 40} connectNulls={false} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard title={`Refilled vs bought, by ${data.period.bucket}`} empty={!s.some((p) => p.refilled_litres != null || p.purchased_litres != null)}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={dateTick} tick={tick} minTickGap={24} />
                        <YAxis tick={tick} width={44} />
                        <Tooltip labelFormatter={label} formatter={(v, name) => [formatLitres(typeof v === 'number' ? v : null, 'measured', 1), String(name)]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="refilled_litres" name="Refilled (sensor)" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="purchased_litres" name="Bought" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard title={`Spend, by ${data.period.bucket}`} empty={!s.some((p) => p.spend != null)}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={dateTick} tick={tick} minTickGap={24} />
                        <YAxis tick={tick} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                        <Tooltip labelFormatter={label} formatter={(v) => [formatNaira(typeof v === 'number' ? v : null), 'Spend']} />
                        <Bar dataKey="spend" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    )
}

const LINE_COLORS = ['#0055FF', '#059669', '#f59e0b', '#7c3aed', '#e11d48']

/**
 * The tank over time, one line per chosen vehicle. Each vehicle's own unit is
 * kept: litres when the sensor gives litres, a percentage otherwise, drawn in
 * separate charts so the two scales are never mixed. Refills the tracker saw
 * are marked on the time axis.
 */
export function LevelHistory({ data }: { data: FuelAnalytics }) {
    if (data.levels === null) {
        return (
            <div className={card}>
                <h2 className="text-sm font-semibold text-slate-900">Fuel level history</h2>
                <p className="mt-3 text-sm text-slate-500">Choose one to five vehicles above to see the tank level over time with its refills.</p>
            </div>
        )
    }

    const withUnit = data.levels.map((v, i) => ({
        ...v,
        color: LINE_COLORS[i % LINE_COLORS.length],
        unit: v.points.some((p) => p.litres != null) ? ('L' as const) : ('%' as const),
    }))
    const groups = (['L', '%'] as const).map((unit) => ({ unit, vehicles: withUnit.filter((v) => v.unit === unit) })).filter((g) => g.vehicles.length > 0)

    if (groups.length === 0) {
        return (
            <div className={card}>
                <h2 className="text-sm font-semibold text-slate-900">Fuel level history</h2>
                <p className="mt-3 text-sm text-slate-500">No fuel sensor readings for the chosen vehicles in this period.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {groups.map(({ unit, vehicles }) => {
                const ids = new Set(vehicles.map((v) => v.vehicle_id))
                const rows = new Map<number, Record<string, number>>()
                for (const v of vehicles) {
                    for (const p of v.points) {
                        const value = unit === 'L' ? p.litres : p.percent
                        if (value == null) continue
                        const t = new Date(p.at).getTime()
                        rows.set(t, { ...(rows.get(t) ?? { t }), [`v${v.vehicle_id}`]: value })
                    }
                }
                const series = [...rows.values()].sort((a, b) => a.t - b.t)
                const refills = data.refills.filter((r) => ids.has(r.vehicle_id))
                return (
                    <div key={unit} className={card}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-slate-900">Fuel level history ({unit === 'L' ? 'litres' : 'percent of tank'})</h2>
                            <QualityBadge quality={unit === 'L' ? 'measured' : 'percent_only'} />
                        </div>
                        <div className="mt-2 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t: number) => new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} tick={tick} minTickGap={32} />
                                    <YAxis tick={tick} width={44} domain={unit === '%' ? [0, 100] : [0, 'auto']} />
                                    <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} formatter={(v, name) => [`${formatNumber(typeof v === 'number' ? v : null, 1)} ${unit}`, String(name)]} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    {vehicles.map((v) => (
                                        <Line key={v.vehicle_id} dataKey={`v${v.vehicle_id}`} name={v.registration_number ?? `Vehicle ${v.vehicle_id}`} stroke={v.color} dot={false} strokeWidth={1.5} connectNulls />
                                    ))}
                                    {refills.map((r) => (
                                        <ReferenceLine key={r.id} x={new Date(r.at).getTime()} stroke="#0ea5e9" strokeDasharray="3 3" />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        {refills.length > 0 && <p className="mt-1 text-xs text-slate-500">Dashed blue lines mark refills the tracker detected.</p>}
                    </div>
                )
            })}
        </div>
    )
}
