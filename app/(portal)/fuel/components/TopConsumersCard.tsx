'use client'

import { ChevronDown, Truck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { TopConsumer } from './useFuelOverview'

interface TopConsumersCardProps {
    consumers: TopConsumer[]
}

const fmtL = (n: number) => `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
const fmtNaira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function TopConsumersCard({ consumers }: TopConsumersCardProps) {
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Top Fuel Consumers</h2>
                <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                >
                    This Month <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
            </div>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left">
                    <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="pb-2 font-bold">Vehicle</th>
                            <th className="pb-2 font-bold">Fuel Used (L)</th>
                            <th className="pb-2 text-right font-bold">Fuel Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {consumers.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-sm text-slate-400">
                                    No consumption data.
                                </td>
                            </tr>
                        )}
                        {consumers.map((c) => (
                            <tr key={c.id} className="align-middle">
                                {/* Col 1 — Vehicle: image + chassis + name */}
                                <td className="py-2.5 pr-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                            <Truck className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">{c.registration}</p>
                                            <p className="truncate text-[11px] text-slate-400">{c.model}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Col 2 — Fuel Used: value + progress bar beside it */}
                                <td className="py-2.5 pr-3">
                                    <div className="flex items-center gap-2">
                                        <span className="shrink-0 text-sm font-bold text-slate-900">{fmtL(c.litersUsed)}</span>
                                        <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                                style={{ width: `${Math.max(6, c.share * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>

                                {/* Col 3 — Fuel Cost */}
                                <td className="py-2.5 text-right text-sm font-semibold text-slate-700">
                                    {fmtNaira(c.costNaira)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                    type="button"
                    className="text-[13px] font-semibold text-blue-600 transition-colors duration-200 hover:text-blue-700"
                >
                    View full report →
                </button>
            </div>
        </Card>
    )
}
