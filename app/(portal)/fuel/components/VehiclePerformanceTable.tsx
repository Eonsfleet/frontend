'use client'

import { Truck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Sparkline } from './Sparkline'
import type { PerfRow } from './useFuelAnalysis'

const fmtNaira = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function VehiclePerformanceTable({ rows, totalVehicles = 142 }: { rows: PerfRow[]; totalVehicles?: number }) {
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <h2 className="text-sm font-bold text-slate-900">Vehicle Fuel Performance</h2>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <th className="py-3 pr-4">Vehicle</th>
                            <th className="py-3 pr-4">Fuel Consumed (L)</th>
                            <th className="py-3 pr-4">Fuel Cost (USD)</th>
                            <th className="py-3 pr-4">Distance (km)</th>
                            <th className="py-3 pr-4">Avg. Fuel Efficiency (km/L)</th>
                            <th className="py-3 pr-4">vs Previous Period</th>
                            <th className="py-3">Trend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((r) => {
                            const up = r.deltaPercent >= 0
                            return (
                                <tr key={r.id} className="align-middle hover:bg-slate-50/60">
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate font-semibold text-slate-900">{r.vehicle}</div>
                                                <div className="truncate text-[11px] text-slate-400">{r.model}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4 font-medium text-slate-700">{r.consumedLiters.toLocaleString()} L</td>
                                    <td className="py-3 pr-4 font-medium text-slate-700">{fmtNaira(r.costNaira)}</td>
                                    <td className="py-3 pr-4 text-slate-600">{r.distanceKm.toLocaleString()} km</td>
                                    <td className="py-3 pr-4 text-slate-600">{r.efficiency.toFixed(2)} km/L</td>
                                    <td className="py-3 pr-4">
                                        <span className={cn('inline-flex items-center gap-1 font-semibold', up ? 'text-emerald-600' : 'text-rose-600')}>
                                            {up ? '↑' : '↓'} {Math.abs(r.deltaPercent)}%
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <div className="h-8 w-24">
                                            <Sparkline data={r.trend} color={up ? '#10b981' : '#ef4444'} height={32} />
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing 1 to {rows.length} of {totalVehicles} vehicles</span>
                <div className="flex items-center gap-1">
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50">‹</button>
                    {[1, 2, 3].map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={cn(
                                'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12px] font-medium',
                                p === 1 ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            {p}
                        </button>
                    ))}
                    <span className="px-1 text-slate-400">…</span>
                    <button type="button" className="flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 px-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50">29</button>
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">›</button>
                </div>
            </div>
        </Card>
    )
}
