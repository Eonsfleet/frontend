'use client'

import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LowFuelAlert } from './useFuelOverview'

interface LowFuelAlertsCardProps {
    alerts: LowFuelAlert[]
    className?: string
}

export function LowFuelAlertsCard({ alerts, className }: LowFuelAlertsCardProps) {
    return (
        <Card className={cn('rounded-2xl border-0 bg-white p-5 shadow-none', className)}>
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Fuel Attention</h2>
            </div>

            <ul className="mt-3 space-y-2.5">
                {alerts.length === 0 && (
                    <li className="rounded-lg bg-slate-50 py-6 text-center text-sm text-slate-400">
                        No vehicle is reporting a low fuel level.
                    </li>
                )}
                {alerts.map((a) => (
                    <li key={a.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
                        {/* Col 1 — icon */}
                        <div className="row-span-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                            <AlertTriangle className="h-4 w-4" />
                        </div>

                        {/* Col 2 — registration + percent (litres) */}
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">{a.registration}</span>
                            <span className="shrink-0 text-xs font-bold text-rose-600">
                                {a.fuelPercent}% <span className="font-normal text-slate-400">({a.fuelLiters ?? '—'} L)</span>
                            </span>
                        </div>

                        {/* Under the registration: the model, and when the level was reported */}
                        <p className="col-start-2 truncate text-[11px] text-slate-400">{a.model} · reported {a.time}</p>
                    </li>
                ))}
            </ul>
        </Card>
    )
}
