import { describe, expect, it } from 'vitest'
import { compareLabel, defaultCompare, periodFor } from '@/app/(portal)/fuel/components/overview/period'

const TODAY = new Date(2026, 10, 10) // 10 Nov 2026

describe('overview periods', () => {
    it('opens on month to date', () => {
        expect(periodFor('mtd', TODAY)).toEqual({ from: '2026-11-01', to: '2026-11-10' })
    })

    it('counts the last N days including today', () => {
        expect(periodFor('last7', TODAY)).toEqual({ from: '2026-11-04', to: '2026-11-10' })
        expect(periodFor('last30', TODAY)).toEqual({ from: '2026-10-12', to: '2026-11-10' })
    })

    it('means the whole of last month, including a short one', () => {
        expect(periodFor('last_month', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
        expect(periodFor('last_month', new Date(2026, 2, 5))).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    })

    it('takes a custom range as typed', () => {
        expect(periodFor('custom', TODAY, { from: '2026-09-01', to: '2026-09-15' })).toEqual({ from: '2026-09-01', to: '2026-09-15' })
    })

    it('compares month to date with the same days last month and the rest with the range before', () => {
        expect(defaultCompare('mtd')).toBe('last_month')
        expect(defaultCompare('last30')).toBe('previous')
        expect(compareLabel('last_month', 10)).toBe('vs same days last month')
        expect(compareLabel('previous', 7)).toBe('vs previous 7 days')
        expect(compareLabel('previous', 1)).toBe('vs previous 1 day')
    })
})
