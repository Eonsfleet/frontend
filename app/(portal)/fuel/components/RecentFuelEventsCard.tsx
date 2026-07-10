'use client'

import { FuelIcon, AlertTriangle, Timer, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { FuelEvent } from './useFuelRealtime'

const EVENT_META: Record<FuelEvent['kind'], { icon: LucideIcon; iconClass: string }> = {
    refill_started: { icon: FuelIcon, iconClass: 'bg-emerald-50 text-emerald-500' },
    refill_completed: { icon: FuelIcon, iconClass: 'bg-emerald-50 text-emerald-500' },
    low: { icon: AlertTriangle, iconClass: 'bg-rose-50 text-rose-500' },
    drain: { icon: AlertTriangle, iconClass: 'bg-rose-50 text-rose-500' },
    idle: { icon: Timer, iconClass: 'bg-amber-50 text-amber-500' },
}

export function RecentFuelEventsCard({ events }: { events: FuelEvent[] }) {
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent Fuel Events</h2>
            </div>

            <ul className="mt-3 space-y-3">
                {events.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No recent events.</li>}
                {events.map((e) => {
                    const meta = EVENT_META[e.kind]
                    const Icon = meta.icon
                    return (
                        <li key={e.id} className="flex items-center gap-3">
                            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.iconClass)}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-slate-900">{e.title}</p>
                                <p className="truncate text-[11px] text-slate-400">{e.time}</p>
                            </div>
                            <span className="shrink-0 text-[11px] font-medium text-slate-500">{e.detail}</span>
                        </li>
                    )
                })}
            </ul>
        </Card>
    )
}
