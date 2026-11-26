import { describe, expect, it } from 'vitest'
import { buildReading, emptyDraft, hasReadingValue } from '@/lib/odometerDraft'

const NOW = new Date('2026-11-27T10:00:00')
const draft = (over: Record<string, unknown> = {}) => ({ ...emptyDraft('km', NOW), ...over })

describe('buildReading', () => {
    it('submits nothing when no value was entered, so an ordinary edit never sends a reading', () => {
        const d = draft()
        expect(hasReadingValue(d)).toBe(false)
        expect(buildReading(d, 5000, NOW)).toEqual({ ok: true, reading: null })
    })

    it('builds the contract body with unit and effective time in UTC', () => {
        const r = buildReading(draft({ value: '52340', unit: 'mi', effectiveAt: '2026-11-27T08:50', note: ' at pickup ' }), null, NOW)
        expect(r.ok).toBe(true)
        if (!r.ok || !r.reading) throw new Error('expected a reading')
        expect(r.reading.payload).toEqual({
            value: 52340,
            unit: 'mi',
            effective_at: new Date('2026-11-27T08:50').toISOString(),
            kind: 'reading',
            note: 'at pickup',
        })
        expect(r.reading.payload).not.toHaveProperty('odometer_when_join')
    })

    it('rejects negative, non-numeric and absurd values', () => {
        expect(buildReading(draft({ value: '-1' }), null, NOW)).toMatchObject({ ok: false, errors: { value: expect.any(String) } })
        expect(buildReading(draft({ value: 'abc' }), null, NOW)).toMatchObject({ ok: false })
        expect(buildReading(draft({ value: '5000001' }), null, NOW)).toMatchObject({ ok: false })
        // the limit is applied after conversion to km
        expect(buildReading(draft({ value: '3200000', unit: 'mi' }), null, NOW)).toMatchObject({ ok: false })
    })

    it('accepts zero only when explicitly confirmed', () => {
        expect(buildReading(draft({ value: '0' }), null, NOW)).toMatchObject({ ok: false })
        expect(buildReading(draft({ value: '0', confirmZero: true }), null, NOW)).toMatchObject({ ok: true })
    })

    it('rejects a time more than 5 minutes in the future', () => {
        expect(buildReading(draft({ value: '10', effectiveAt: '2026-11-27T10:10' }), null, NOW)).toMatchObject({ ok: false, errors: { effectiveAt: expect.any(String) } })
        expect(buildReading(draft({ value: '10', effectiveAt: '2026-11-27T10:03' }), null, NOW)).toMatchObject({ ok: true })
    })

    it('requires a reason when lower than the accepted total (compared in km)', () => {
        expect(buildReading(draft({ value: '900' }), 1000, NOW)).toMatchObject({ ok: false, errors: { reason: expect.any(String) } })
        expect(buildReading(draft({ value: '900', reason: 'typo' }), 1000, NOW)).toMatchObject({ ok: true })
        // 600 mi = 965 km, lower than 1000 km
        expect(buildReading(draft({ value: '600', unit: 'mi' }), 1000, NOW)).toMatchObject({ ok: false })
        expect(buildReading(draft({ value: '700', unit: 'mi' }), 1000, NOW)).toMatchObject({ ok: true })
    })

    it('requires a reason for non-ordinary kinds and a photo for replacement or reset', () => {
        expect(buildReading(draft({ value: '10', kind: 'correction' }), null, NOW)).toMatchObject({ ok: false, errors: { reason: expect.any(String) } })
        const r = buildReading(draft({ value: '10', kind: 'reset', reason: 'new cluster' }), null, NOW)
        expect(r).toMatchObject({ ok: false, errors: { photo: expect.any(String) } })
        const photo = new File(['x'], 'd.jpg', { type: 'image/jpeg' })
        expect(buildReading(draft({ value: '10', kind: 'reset', reason: 'new cluster', photo }), null, NOW)).toMatchObject({ ok: true })
    })
})
