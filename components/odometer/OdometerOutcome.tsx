import React from 'react'
import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react'
import { outcomeMessage } from '@/lib/odometer'
import { cn } from '@/lib/utils'
import type { SubmitReadingResult } from '@/types/odometer'

const TONE = {
    success: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 },
    info: { cls: 'border-blue-200 bg-blue-50 text-blue-800', Icon: Clock },
    warning: { cls: 'border-amber-200 bg-amber-50 text-amber-800', Icon: AlertTriangle },
    error: { cls: 'border-red-200 bg-red-50 text-red-800', Icon: XCircle },
} as const

/** What happened to a submitted reading: accepted, waiting to sync, or sent for review (with the reason). */
export function OdometerOutcome({ result }: { result: Pick<SubmitReadingResult, 'outcome' | 'review' | 'reading'> }) {
    const reason = result.review?.reason ?? result.reading?.validation?.reason ?? null
    const m = outcomeMessage(result.outcome, reason)
    const { cls, Icon } = TONE[m.tone]
    return (
        <div role="status" data-testid="odometer-outcome" className={cn('flex gap-2 rounded-md border p-3 text-sm', cls)}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
                <p className="font-semibold">{m.title}</p>
                <p className="text-xs">{m.detail}</p>
            </div>
        </div>
    )
}
