import { describe, expect, it } from 'vitest'
import { carryFilters, parseFilters, previousDates, rangeDays, resolveDates, serializeFilters, type AnalyticsFilters } from '@/lib/analytics/filters'

const parse = (qs: string) => parseFilters(new URLSearchParams(qs))
const NOW = new Date('2026-11-03T10:00:00+01:00')

describe('analytics filters in the URL', () => {
    it('defaults to the last 30 days with no entity filters', () => {
        expect(parse('')).toEqual({ range: { kind: 'preset', preset: '30d' }, compare: false, vehicleIds: [], clusterIds: [], driverIds: [] })
    })

    it('reads the keys the existing pages already write, so bookmarks keep working', () => {
        expect(parse('filter=90d').range).toEqual({ kind: 'preset', preset: '90d' })
        expect(parse('start_date=2026-10-01&end_date=2026-10-10').range).toEqual({ kind: 'custom', start: '2026-10-01', end: '2026-10-10' })
        expect(parse('vehicle_id=7').vehicleIds).toEqual([7])
    })

    it('round-trips every filter', () => {
        const filters: AnalyticsFilters = {
            range: { kind: 'custom', start: '2026-10-01', end: '2026-10-20' },
            compare: true,
            vehicleIds: [9, 3],
            clusterIds: [2],
            driverIds: [5, 4],
        }
        const back = parseFilters(serializeFilters(filters))
        expect(back).toEqual({ ...filters, vehicleIds: [3, 9], driverIds: [4, 5] })
    })

    it('leaves defaults out of the URL', () => {
        expect(serializeFilters(parse('')).toString()).toBe('')
        expect(serializeFilters(parse('filter=30d')).toString()).toBe('')
        expect(serializeFilters(parse('filter=7d')).toString()).toBe('filter=7d')
    })

    it('falls back instead of trusting malformed values', () => {
        expect(parse('filter=999d').range).toEqual({ kind: 'preset', preset: '30d' })
        expect(parse('start_date=2026-13-45&end_date=2026-14-01').range).toEqual({ kind: 'preset', preset: '30d' })
        expect(parse('start_date=2026-10-10&end_date=2026-10-01').range).toEqual({ kind: 'preset', preset: '30d' })
        expect(parse('vehicle_ids=1,abc,-4,2.5,3,3').vehicleIds).toEqual([1, 3])
        expect(parse('compare=yes').compare).toBe(false)
    })

    it('keeps only filter keys when carrying a URL to another Analytics tab', () => {
        expect(carryFilters('filter=7d&page=3&ui=v2&vehicle_ids=1,2')).toBe('filter=7d&vehicle_ids=1%2C2')
    })
})

describe('analytics date ranges', () => {
    it('counts a preset or a custom range in whole days, inclusive', () => {
        expect(rangeDays({ kind: 'preset', preset: '7d' })).toBe(7)
        expect(rangeDays({ kind: 'custom', start: '2026-10-01', end: '2026-10-01' })).toBe(1)
        expect(rangeDays({ kind: 'custom', start: '2026-10-01', end: '2026-10-31' })).toBe(31)
    })

    it('resolves a preset to Lagos calendar days ending today', () => {
        expect(resolveDates({ kind: 'preset', preset: '7d' }, NOW)).toEqual({ start: '2026-10-28', end: '2026-11-03' })
    })

    it('puts the previous period directly before this one, the same length', () => {
        expect(previousDates({ kind: 'preset', preset: '7d' }, NOW)).toEqual({ start: '2026-10-21', end: '2026-10-27' })
        expect(previousDates({ kind: 'custom', start: '2026-10-10', end: '2026-10-12' }, NOW)).toEqual({ start: '2026-10-07', end: '2026-10-09' })
    })

    it('uses the Lagos date, not the UTC date, around midnight', () => {
        const lateLagos = new Date('2026-11-03T23:30:00+01:00') // 22:30 UTC, still the 3rd in both
        const earlyLagos = new Date('2026-11-04T00:30:00+01:00') // 23:30 UTC on the 3rd, already the 4th in Lagos
        expect(resolveDates({ kind: 'preset', preset: '7d' }, lateLagos).end).toBe('2026-11-03')
        expect(resolveDates({ kind: 'preset', preset: '7d' }, earlyLagos).end).toBe('2026-11-04')
    })
})
