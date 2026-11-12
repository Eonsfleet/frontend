import { describe, expect, it } from 'vitest'
import { evaluateWidget, ignoredNote } from '@/lib/analytics/applicability'
import { parseFilters } from '@/lib/analytics/filters'

const f = (qs: string) => parseFilters(new URLSearchParams(qs))
const NOW = new Date('2026-11-03T10:00:00+01:00')

describe('widget applicability', () => {
    it('serves legacy widgets 7d, 30d, 90d and 12 months, and refuses 60d and custom ranges', () => {
        for (const preset of ['7d', '30d', '90d', '1y']) expect(evaluateWidget('incidents-trend', f(`filter=${preset}`), NOW).range).toBe('applied')
        expect(evaluateWidget('incidents-trend', f('filter=60d'), NOW).range).toBe('unsupported')
        expect(evaluateWidget('incidents-trend', f('start_date=2026-10-01&end_date=2026-10-05'), NOW).range).toBe('unsupported')
    })

    it('never substitutes another range: an unsupported range carries a reason', () => {
        const result = evaluateWidget('alarms', f('filter=90d'), NOW)
        expect(result.range).toBe('unsupported')
        expect(result.rangeNote).toMatch(/60 days/)
    })

    it('serves telemetry widgets up to 60 days, including short custom ranges', () => {
        expect(evaluateWidget('alarms', f('filter=60d'), NOW).range).toBe('applied')
        expect(evaluateWidget('alarms', f('start_date=2026-09-20&end_date=2026-10-20'), NOW).range).toBe('applied')
        expect(evaluateWidget('alarms', f('start_date=2026-06-01&end_date=2026-10-20'), NOW).range).toBe('unsupported')
    })

    it('treats snapshot and fixed-window widgets as fixed, with their own window named', () => {
        const status = evaluateWidget('fleet-status', f('filter=1y'), NOW)
        expect(status.range).toBe('fixed')
        expect(status.rangeNote).toBe('Current status')
        expect(evaluateWidget('incident-summary', f('filter=7d'), NOW).rangeNote).toBe('All time')
    })

    it('names the entity filters a widget does not apply instead of implying they were', () => {
        const result = evaluateWidget('fleet-status', f('vehicle_ids=1&driver_ids=2'), NOW)
        expect(result.ignored).toEqual(['vehicles', 'drivers'])
        expect(ignoredNote(result.ignored)).toBe('Whole fleet: the vehicle and driver filters are not applied')
        expect(ignoredNote(['clusters'])).toBe('Whole fleet: the cluster filter is not applied')
        expect(ignoredNote([])).toBeNull()
    })

    it('applies all three entity filters on telemetry widgets and none on legacy ones', () => {
        expect(evaluateWidget('alarms', f('vehicle_ids=1&driver_ids=2&cluster_ids=3'), NOW).ignored).toEqual([])
        expect(evaluateWidget('incidents-trend', f('vehicle_ids=1&cluster_ids=3'), NOW).ignored).toEqual(['vehicles', 'clusters'])
    })

    describe('comparison with the previous period', () => {
        it('is off unless asked for', () => {
            expect(evaluateWidget('alarms', f('filter=7d'), NOW).compare).toBe('off')
        })

        it('applies when the previous period is still inside the 60 days kept', () => {
            expect(evaluateWidget('alarms', f('filter=7d&compare=prev'), NOW).compare).toBe('applied')
            expect(evaluateWidget('alarms', f('filter=30d&compare=prev'), NOW).compare).toBe('applied')
        })

        it('is unavailable when the previous period starts before the kept window, and says why', () => {
            const result = evaluateWidget('alarms', f('filter=60d&compare=prev'), NOW)
            expect(result.compare).toBe('unavailable')
            expect(result.compareReason).toMatch(/60-day window/)
        })

        it('is unavailable on widgets whose backend cannot return a previous period', () => {
            const result = evaluateWidget('incidents-trend', f('filter=7d&compare=prev'), NOW)
            expect(result.compare).toBe('unavailable')
            expect(result.compareReason).toMatch(/previous period/)
        })
    })
})
