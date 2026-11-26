import React from 'react'
import { cn } from '@/lib/utils'
import { summariseOdometer, type OdometerTone } from '@/lib/odometer'
import type { VehicleOdometer } from '@/types/odometer'

const TONE_CLASS: Record<OdometerTone, string> = {
    neutral: 'bg-slate-100 text-slate-600',
    estimate: 'bg-amber-50 text-amber-700',
    warning: 'bg-orange-50 text-orange-700',
    danger: 'bg-red-50 text-red-700',
}

/** A small label such as "Estimate", "Pending review" or "Odometer reading required". Renders nothing for an ordinary figure. */
export function OdometerBadge({ odometer, className }: { odometer: Partial<VehicleOdometer> | null | undefined; className?: string }) {
    const { badge, tone } = summariseOdometer(odometer)
    if (!badge) return null
    return (
        <span
            data-testid="odometer-badge"
            className={cn('inline-block rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide', TONE_CLASS[tone], className)}
        >
            {badge}
        </span>
    )
}

/**
 * The accepted total with its honest qualifier. A vehicle with no accepted total shows
 * "Odometer reading required", never 0 and never a legacy figure.
 */
export function OdometerValue({ odometer, className }: { odometer: Partial<VehicleOdometer> | null | undefined; className?: string }) {
    const s = summariseOdometer(odometer)
    if (!odometer) return <p className={cn('text-sm font-medium text-slate-900', className)}>N/A</p>
    if (s.required) {
        return <p className={cn('text-sm font-medium text-orange-700', className)}>Odometer reading required</p>
    }
    return (
        <p className={cn('flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900', className)}>
            <span>{s.lifetime ?? 'N/A'}</span>
            <OdometerBadge odometer={odometer} />
        </p>
    )
}
