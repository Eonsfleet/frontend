'use client'

import { Card } from '@/components/ui/card'
import type { EfficiencyBar } from './useFuelAnalysis'

interface EfficiencyBarsCardProps {
    bars: EfficiencyBar[]
    fleetAvg: number
    max?: number
}

export function EfficiencyBarsCard({ bars, fleetAvg, max = 6 }: EfficiencyBarsCardProps) {
    const ticks = Array.from({ length: max + 1 }, (_, i) => i)
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <h2 className="text-sm font-bold text-slate-900">Fuel Efficiency (km/L)</h2>

            <div className="mt-4 space-y-3">
                {bars.map((b) => (
                    <div key={b.label} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 truncate text-[12px] font-medium text-slate-600">{b.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(b.value / max) * 100}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right text-[12px] font-bold text-slate-900">{b.value.toFixed(2)}</span>
                    </div>
                ))}

                {/* Fleet average — dashed track */}
                <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                    <span className="w-20 shrink-0 text-[12px] font-semibold text-slate-500">Fleet Average</span>
                    <div className="relative h-2 flex-1 rounded-full border border-dashed border-slate-300">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300/60" style={{ width: `${(fleetAvg / max) * 100}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[12px] font-bold text-slate-700">{fleetAvg.toFixed(2)}</span>
                </div>
            </div>

            {/* Axis ticks */}
            <div className="mt-2 flex justify-between pl-[92px] pr-12 text-[10px] text-slate-400">
                {ticks.map((t) => (
                    <span key={t}>{t}</span>
                ))}
            </div>
        </Card>
    )
}
