import type { Money } from '@/types/subscription'
import { cn } from '@/lib/utils'

// Currency comes from the backend per spec section 6.2 — never hard-code NGN.
export function formatMoney({ amount, currency }: Money): string {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency || 'NGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)
    } catch {
        return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
}

export function MoneyDisplay({ value, className }: { value: Money; className?: string }) {
    return <span className={cn('font-mono tabular-nums', className)}>{formatMoney(value)}</span>
}
