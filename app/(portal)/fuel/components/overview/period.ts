import { addDays, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import type { CompareBasis } from '@/lib/api/fuelPage'

export type PeriodPreset = 'mtd' | 'last7' | 'last30' | 'last_month' | 'custom'

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
    mtd: 'Month to date',
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    last_month: 'Last month',
    custom: 'Custom range',
}

const day = (d: Date) => format(d, 'yyyy-MM-dd')

/** The dates a preset means on `today`. A custom range is whatever was typed. */
export function periodFor(preset: PeriodPreset, today: Date, custom?: { from: string; to: string }): { from: string; to: string } {
    switch (preset) {
        case 'mtd':
            return { from: day(startOfMonth(today)), to: day(today) }
        case 'last7':
            return { from: day(addDays(today, -6)), to: day(today) }
        case 'last30':
            return { from: day(addDays(today, -29)), to: day(today) }
        case 'last_month': {
            const previous = subMonths(today, 1)
            return { from: day(startOfMonth(previous)), to: day(endOfMonth(previous)) }
        }
        case 'custom':
            return custom ?? { from: day(startOfMonth(today)), to: day(today) }
    }
}

/** A month-to-date reads against the same days last month; every other range against the one before it. */
export function defaultCompare(preset: PeriodPreset): CompareBasis {
    return preset === 'mtd' ? 'last_month' : 'previous'
}

export function compareLabel(basis: CompareBasis, days: number): string {
    return basis === 'last_month' ? 'vs same days last month' : `vs previous ${days} day${days === 1 ? '' : 's'}`
}
