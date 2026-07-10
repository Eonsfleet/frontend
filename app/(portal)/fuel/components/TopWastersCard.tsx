'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WasterRow } from './useFuelAnalysis'

export function TopWastersCard({ rows }: { rows: WasterRow[] }) {
    const max = Math.max(...rows.filter((r) => !r.isTotal).map((r) => r.liters), 1)
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <h2 className="text-sm font-bold text-slate-900">Top Fuel Wasters</h2>

            <div className="mt-4 space-y-3">
                {rows.map((r) => (
                    <div key={r.label} className={cn(r.isTotal && 'border-t border-slate-100 pt-3')}>
                        <div className="flex items-center justify-between text-[12px]">
                            <span className={cn('font-medium', r.isTotal ? 'font-bold text-rose-600' : 'text-slate-600')}>{r.label}</span>
                            <span className={cn('font-semibold', r.isTotal ? 'text-rose-600' : 'text-slate-800')}>
                                {r.liters.toFixed(2)} L
                            </span>
                        </div>
                        {!r.isTotal && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className={cn('h-full rounded-full', r.color)} style={{ width: `${(r.liters / max) * 100}%` }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    )
}
