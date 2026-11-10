'use client'

import Link from 'next/link'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { FuelOverviewSummary } from '@/lib/api/fuelPage'
import { ageMinutes, formatAge, formatLitres, formatNaira, formatNumber } from '@/lib/fuel-format'
import { QualityBadge } from '../shared/QualityBadge'
import { AlertActions } from '../shared/AlertActions'
import { useNow } from '../useNow'

const card = 'rounded-2xl bg-white p-4'

const ALERT_TITLE: Record<string, string> = {
    low_fuel: 'Low fuel',
    fuel_theft: 'Suspected drain',
    fuel_leakage: 'Possible leak',
    sensor_malfunction: 'Sensor fault',
}

const SEVERITY_TONE: Record<string, string> = {
    critical: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
}

export function NeedsActionCard({ needsAction }: { needsAction: FuelOverviewSummary['needs_action'] }) {
    const queryClient = useQueryClient()
    const now = useNow()
    const { counts, alerts } = needsAction
    return (
        <div className={card} id="needs-action">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Needs action today</h2>
                <span className="text-xs text-slate-500">{counts.new} new · {counts.acknowledged} acknowledged</span>
            </div>
            {alerts.length === 0 && <p className="mt-3 text-sm text-slate-500">Nothing is waiting on you.</p>}
            <ul className="mt-2 divide-y divide-slate-100">
                {alerts.map((a) => (
                    <li key={a.id} className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/vehicles/${a.vehicle_id}`} className="text-sm font-semibold text-slate-900 hover:underline">{a.registration_number ?? `Vehicle ${a.vehicle_id}`}</Link>
                            <span className="text-sm text-slate-700">{ALERT_TITLE[a.type] ?? a.type}</span>
                            {a.severity && <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase', SEVERITY_TONE[a.severity] ?? 'bg-slate-100 text-slate-600')}>{a.severity}</span>}
                            <span className="text-xs text-slate-400">{formatAge(ageMinutes(a.alert_time, now))}</span>
                            {a.difference != null && a.difference > 0 && a.unit && <span className="text-xs text-slate-500">{formatNumber(a.difference, 1)} {a.unit}</span>}
                        </div>
                        {a.message && <p className="mt-0.5 text-xs text-slate-500">{a.message}</p>}
                        <div className="mt-2">
                            <AlertActions
                                compact
                                alert={{ id: a.id, status: a.status, assigned_to: a.assigned_to, investigating: a.investigating, label: a.registration_number }}
                                onChanged={() => queryClient.invalidateQueries({ queryKey: ['fuel'] })}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

const th = 'px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400'
const td = 'px-2 py-2 text-sm text-slate-700'

export function BreakdownCards({ data }: { data: FuelOverviewSummary }) {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={cn(card, 'overflow-x-auto')}>
                <h2 className="text-sm font-semibold text-slate-900">Where it goes · by cluster</h2>
                {data.by_cluster.length === 0 ? <p className="mt-3 text-sm text-slate-500">No fuel use recorded for this period.</p> : (
                    <table className="mt-2 w-full">
                        <thead><tr><th className={th}>Cluster</th><th className={th}>Vehicles</th><th className={th}>Litres</th><th className={th}>L/100 km</th><th className={th}>Spend</th></tr></thead>
                        <tbody>
                            {data.by_cluster.map((r) => (
                                <tr key={r.cluster_id ?? 'none'} className="border-t border-slate-100">
                                    <td className={cn(td, 'font-medium text-slate-900')}>{r.name}</td>
                                    <td className={td}>{r.vehicles}</td>
                                    <td className={td}>{formatNumber(r.litres, 0)}</td>
                                    <td className={td}>{formatNumber(r.l_per_100km, 1)}</td>
                                    <td className={td}>{formatNaira(r.spend)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className={cn(card, 'overflow-x-auto')}>
                <h2 className="text-sm font-semibold text-slate-900">Where it goes · by vehicle type</h2>
                {data.by_type.length === 0 ? <p className="mt-3 text-sm text-slate-500">No fuel use recorded for this period.</p> : (
                    <table className="mt-2 w-full">
                        <thead><tr><th className={th}>Type · make · model</th><th className={th}>Vehicles</th><th className={th}>Litres</th><th className={th}>L/100 km</th></tr></thead>
                        <tbody>
                            {data.by_type.map((r, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                    <td className={cn(td, 'font-medium capitalize text-slate-900')}>{[r.type, r.make, r.model].filter(Boolean).join(' · ') || 'Not set'}</td>
                                    <td className={td}>{r.vehicles}</td>
                                    <td className={td}>{formatNumber(r.litres, 0)}</td>
                                    <td className={td}>{formatNumber(r.l_per_100km, 1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export function OutliersCard({ outliers }: { outliers: FuelOverviewSummary['outliers'] }) {
    return (
        <div className={cn(card, 'overflow-x-auto')}>
            <h2 className="text-sm font-semibold text-slate-900">Burning more than their peers</h2>
            <p className="text-xs text-slate-500">Vehicles using at least 20% more per 100 km than the median of the same make and model.</p>
            {outliers.length === 0 ? <p className="mt-3 text-sm text-slate-500">No vehicle stands out against its peers this period.</p> : (
                <table className="mt-2 w-full">
                    <thead><tr><th className={th}>Vehicle</th><th className={th}>L/100 km</th><th className={th}>Peer median</th><th className={th}>Extra litres</th><th className={th}>Basis</th></tr></thead>
                    <tbody>
                        {outliers.map((o) => (
                            <tr key={o.vehicle_id} className="border-t border-slate-100">
                                <td className={td}>
                                    <Link href={`/vehicles/${o.vehicle_id}`} className="font-medium text-slate-900 hover:underline">{o.registration_number ?? `Vehicle ${o.vehicle_id}`}</Link>
                                    <span className="block text-xs capitalize text-slate-400">{[o.make, o.model].filter(Boolean).join(' ')} · {o.peers} peers</span>
                                </td>
                                <td className={cn(td, 'font-semibold text-red-600')}>{formatNumber(o.l_per_100km, 1)}</td>
                                <td className={td}>{formatNumber(o.peer_median_l_per_100km, 1)}</td>
                                <td className={td}>{formatLitres(o.excess_litres, o.basis, 0)}</td>
                                <td className={td}><QualityBadge quality={o.basis} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export function TrendCard({ trend }: { trend: FuelOverviewSummary['trend'] }) {
    const hasLitres = trend.some((p) => p.litres != null)
    return (
        <div className={card}>
            <h2 className="text-sm font-semibold text-slate-900">Daily fuel used</h2>
            {!hasLitres ? <p className="mt-3 text-sm text-slate-500">No daily usage recorded for this period.</p> : (
                <div className="mt-2 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} minTickGap={24} />
                            <YAxis tick={{ fontSize: 11 }} width={44} />
                            <Tooltip formatter={(v) => [formatLitres(typeof v === 'number' ? v : null, 'measured', 0), 'Litres']} labelFormatter={(d) => String(d)} />
                            {/* A day with no record is a gap, not a zero. */}
                            <Area type="monotone" dataKey="litres" stroke="#0055FF" fill="#0055FF22" connectNulls={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
