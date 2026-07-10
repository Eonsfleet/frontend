'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { BreakdownRow } from './useFuelAnalysis'

const fmtNaira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function CostBreakdownCard({ rows }: { rows: BreakdownRow[] }) {
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <h2 className="text-sm font-bold text-slate-900">Cost Breakdown</h2>

            <div className="mt-4 space-y-3">
                {rows.map((r) => (
                    <div key={r.label}>
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="font-medium text-slate-600">{r.label}</span>
                            <span className="font-semibold text-slate-800">
                                {fmtNaira(r.amountNaira)} <span className="font-normal text-slate-400">({r.percent}%)</span>
                            </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className={cn('h-full rounded-full', r.color)} style={{ width: `${r.percent}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
