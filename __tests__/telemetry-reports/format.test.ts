import { describe, expect, it } from 'vitest'
import { dash, formatDate, formatDuration, formatNumber, formatPlace, localDate, mapLink } from '@/components/analytics/telemetry/format'

describe('telemetry report formatting', () => {
    it('shows a dash for a figure that was not measured, never 0', () => {
        expect(formatDuration(null)).toBe(dash)
        expect(formatNumber(null, 1, 'km')).toBe(dash)
        expect(formatPlace(null)).toBe(dash)
        expect(mapLink(null)).toBeNull()
        expect(formatNumber(0, 1, 'km')).toBe('0 km')
    })

    it('writes durations the way a fleet manager reads them', () => {
        expect(formatDuration(45)).toBe('45 s')
        expect(formatDuration(1500)).toBe('25 min')
        expect(formatDuration(3600)).toBe('1 h')
        expect(formatDuration(5400)).toBe('1 h 30 min')
    })

    it('reads dates in Lagos time', () => {
        // 23:30 UTC on 27 Oct is 00:30 on the 28th in Lagos.
        expect(localDate(new Date('2026-10-27T23:30:00Z'))).toBe('2026-10-28')
        expect(formatDate('2026-10-28')).toContain('28')
    })
})
