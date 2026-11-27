import React from 'react'
import { Clock, PauseCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { syncNotice, waitingText } from '@/lib/odometer'
import type { OdometerSync } from '@/types/odometer'

const TONE = {
    waiting: { cls: 'border-blue-200 bg-blue-50 text-blue-800', Icon: Clock },
    calm: { cls: 'border-slate-200 bg-slate-50 text-slate-700', Icon: PauseCircle },
    retry: { cls: 'border-amber-200 bg-amber-50 text-amber-800', Icon: RefreshCw },
} as const

/** Readings waiting for the telemetry platform. The accepted total is never changed by a waiting reading. */
export function SyncNoticeBox({ sync }: { sync: OdometerSync | null | undefined }) {
    const n = syncNotice(sync)
    if (!n) return null
    const { cls, Icon } = TONE[n.tone]
    const pending = sync?.pending ?? 0
    return (
        <div role="status" data-testid="sync-notice" data-tone={n.tone} className={cn('flex gap-2 rounded-md border p-3 text-sm', cls)}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-0.5">
                {pending > 0 && <p className="font-semibold" data-testid="sync-count">{waitingText(pending)}</p>}
                <p className={pending > 0 ? 'text-xs' : 'font-semibold'}>{n.label}</p>
                {n.message && <p className="text-xs">{n.message}</p>}
                {n.tone === 'calm' && <p className="text-xs">Nothing to retry: it is sent on its own once the platform is switched on. The odometer total is unchanged until then.</p>}
                {n.tone === 'waiting' && <p className="text-xs">The odometer total is unchanged until the platform acknowledges it.</p>}
            </div>
        </div>
    )
}

/** Compact wording for a reading row. Neither a failure nor a success. */
export function SyncBadge({ sync }: { sync: OdometerSync | null | undefined }) {
    const n = syncNotice(sync, 1)
    const base = n ?? { tone: 'waiting' as const, label: 'Waiting for the telemetry platform', message: null }
    const { cls } = TONE[base.tone]
    return (
        <span data-testid="sync-badge" data-tone={base.tone} title={base.message ?? undefined} className={cn('inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-medium', cls)}>
            {base.label}
        </span>
    )
}
