'use client'

import { cn } from '@/lib/utils'

/** 4-bar GSM signal indicator. `strength` is 0–4. */
export function SignalBars({ strength, className }: { strength: number; className?: string }) {
    const bars = [1, 2, 3, 4]
    const color = strength >= 3 ? 'bg-emerald-500' : strength === 2 ? 'bg-amber-500' : strength === 1 ? 'bg-rose-500' : 'bg-slate-200'
    return (
        <span className={cn('inline-flex items-end gap-0.5', className)} aria-label={`Signal ${strength} of 4`}>
            {bars.map((b) => (
                <span
                    key={b}
                    className={cn('w-0.5 rounded-sm', b <= strength ? color : 'bg-slate-200')}
                    style={{ height: `${b * 3 + 2}px` }}
                />
            ))}
        </span>
    )
}
