'use client'

import Link from 'next/link'
import type { FuelAnalytics } from '@/lib/api/fuelPage'
import { formatLitres, formatNaira, formatNumber } from '@/lib/fuel-format'
import { QualityBadge } from '../shared/QualityBadge'

const card = 'rounded-2xl bg-white p-4'
const th = 'px-2 py-2 text-left text-xs font-medium text-slate-500'
const td = 'px-2 py-2 text-sm text-slate-700'
const when = (iso: string) => new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })

function Vehicle({ id, reg }: { id: number; reg: string | null }) {
    return <Link href={`/vehicles/${id}`} className="font-semibold text-slate-900 hover:underline">{reg ?? `Vehicle ${id}`}</Link>
}

export function RefillsTable({ refills }: { refills: FuelAnalytics['refills'] }) {
    return (
        <div className={card}>
            <h2 className="text-sm font-semibold text-slate-900">Refills detected by the tank sensor</h2>
            {refills.length === 0 ? <p className="mt-3 text-sm text-slate-500">No refills detected in this period.</p> : (
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                        <thead><tr><th className={th}>When</th><th className={th}>Vehicle</th><th className={th}>Litres</th><th className={th}>Purchase</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {refills.map((r) => (
                                <tr key={r.id}>
                                    <td className={td}>{when(r.at)}</td>
                                    <td className={td}><Vehicle id={r.vehicle_id} reg={r.registration_number} /></td>
                                    <td className={td}>{formatLitres(r.litres, 'measured', 1)}</td>
                                    <td className={td}>{r.matched_purchase ? 'Matched' : <span className="text-amber-700">No purchase on record</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export function DrainsTable({ drains }: { drains: FuelAnalytics['drains'] }) {
    if (drains.length === 0) return null
    return (
        <div className={card}>
            <h2 className="text-sm font-semibold text-slate-900">Suspected drains and leaks</h2>
            <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[480px]">
                    <thead><tr><th className={th}>When</th><th className={th}>Vehicle</th><th className={th}>Lost</th><th className={th}>Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {drains.map((d) => (
                            <tr key={d.id}>
                                <td className={td}>{when(d.at)}</td>
                                <td className={td}><Vehicle id={d.vehicle_id} reg={d.registration_number} /></td>
                                <td className={td}>{d.amount != null && d.unit ? `${formatNumber(d.amount, 1)} ${d.unit}` : '—'}</td>
                                <td className={`${td} capitalize`}>{d.status.replace('_', ' ')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export function VehicleTable({ rows }: { rows: FuelAnalytics['by_vehicle'] }) {
    return (
        <div className={card}>
            <h2 className="text-sm font-semibold text-slate-900">By vehicle</h2>
            {rows.length === 0 ? <p className="mt-3 text-sm text-slate-500">No fuel usage recorded for the chosen vehicles in this period.</p> : (
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr>
                                <th className={th}>Vehicle</th><th className={th}>Used</th><th className={th}>Distance</th><th className={th}>L/100km</th>
                                <th className={th}>km/L</th><th className={th}>Refilled</th><th className={th}>Bought</th><th className={th}>Spend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((r) => (
                                <tr key={r.vehicle_id}>
                                    <td className={td}>
                                        <Vehicle id={r.vehicle_id} reg={r.registration_number} />
                                        <span className="ml-1 text-xs text-slate-400">{[r.make, r.model].filter(Boolean).join(' ')}</span>
                                    </td>
                                    <td className={td}>{formatLitres(r.litres, r.basis, 0)} <QualityBadge quality={r.basis} /></td>
                                    <td className={td}>{formatNumber(r.distance_km, 0, 'km')}</td>
                                    <td className={td}>{formatNumber(r.l_per_100km, 1)}</td>
                                    <td className={td}>{formatNumber(r.km_per_litre, 2)}</td>
                                    <td className={td}>{formatLitres(r.refilled_litres, 'measured', 0)}</td>
                                    <td className={td}>{formatLitres(r.purchased_litres, 'measured', 0)}</td>
                                    <td className={td}>{formatNaira(r.spend)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
