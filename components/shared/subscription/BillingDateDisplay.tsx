import { format, differenceInCalendarDays } from 'date-fns'
import { cn } from '@/lib/utils'

// Full billing dates per spec section 6.3, with optional relative secondary text.
export function BillingDateDisplay({
    date,
    showRelative = false,
    className,
}: {
    date: string | Date
    showRelative?: boolean
    className?: string
}) {
    const parsed = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(parsed.getTime())) {
        return <span className={cn('text-slate-400', className)}>—</span>
    }

    const daysRemaining = differenceInCalendarDays(parsed, new Date())

    return (
        <span className={className}>
            <span className="block">{format(parsed, 'd MMMM yyyy')}</span>
            {showRelative && (
                <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                    {daysRemaining === 0
                        ? 'Today'
                        : daysRemaining > 0
                          ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
                          : `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} overdue`}
                </span>
            )}
        </span>
    )
}
