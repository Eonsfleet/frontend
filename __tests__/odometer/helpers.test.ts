import { describe, expect, it } from 'vitest'
import {
    formatDistance,
    formatLifetime,
    formatToday,
    isEstimate,
    mileageStateLabel,
    needsOdometerReading,
    odometerHeadline,
    outcomeMessage,
    sourceLabel,
    summariseOdometer,
    unitToKm,
} from '@/lib/odometer'
import type { VehicleOdometer } from '@/types/odometer'

const odo = (o: Partial<VehicleOdometer>): VehicleOdometer => ({ lifetime_km: null, today_km: null, source: null, ...o })

describe('odometer presentation helpers', () => {
    it('never renders null as 0 or as a number', () => {
        const none = odo({ status: 'uninitialised' })
        expect(formatLifetime(none)).toBeNull()
        expect(formatToday(none)).toBeNull()
        expect(formatDistance(null)).toBeNull()
        expect(formatDistance(undefined)).toBeNull()
        expect(formatDistance('abc')).toBeNull()
        expect(odometerHeadline(none)).toBe('Odometer reading required')
    })

    it('shows zero when zero is a real value', () => {
        expect(formatToday(odo({ lifetime_km: 10, today_km: 0 }))).toBe('0 km')
    })

    it('uses the display value and unit, rounding only for presentation', () => {
        const o = odo({ lifetime_km: 84231.55, unit: 'mi', display: { lifetime: 52340.123456, today: 26.2 } })
        expect(formatLifetime(o)).toBe('52,340.1 mi')
        expect(formatToday(o)).toBe('26.2 mi')
        // inputs are not mutated by presenting
        expect(o.display?.lifetime).toBe(52340.123456)
    })

    it('falls back to kilometres when display is absent', () => {
        expect(formatLifetime(odo({ lifetime_km: 1000 }))).toBe('1,000 km')
    })

    it('treats a missing accepted total, or status uninitialised, as reading required', () => {
        expect(needsOdometerReading(odo({}))).toBe(true)
        expect(needsOdometerReading(odo({ lifetime_km: 5, status: 'uninitialised' }))).toBe(true)
        expect(needsOdometerReading(odo({ lifetime_km: 5, status: 'verified' }))).toBe(false)
        expect(needsOdometerReading(null)).toBe(false)
    })

    it('labels estimates, pending review and disputed', () => {
        expect(summariseOdometer(odo({ lifetime_km: 5, status: 'gps_derived', source: 'gps_derived' })).badge).toBe('Estimate')
        expect(summariseOdometer(odo({ lifetime_km: 5, status: 'estimated', source: 'continuity_estimate' })).badge).toBe('Estimate')
        expect(isEstimate(odo({ lifetime_km: 5, status: 'verified', source: 'continuity_estimate' }))).toBe(true)
        expect(summariseOdometer(odo({ lifetime_km: 5, status: 'pending_review' })).badge).toBe('Pending review')
        expect(summariseOdometer(odo({ lifetime_km: 5, status: 'verified', review: { pending: true, review_id: 1, reason: 'decrease' } })).badge).toBe('Pending review')
        expect(summariseOdometer(odo({ lifetime_km: 5, status: 'disputed' })).badge).toBe('Disputed')
        expect(summariseOdometer(odo({ lifetime_km: 5, status: 'verified', source: 'tracker_aligned' })).badge).toBeNull()
    })

    it('has no label for the retired source values rather than a wrong one', () => {
        expect(sourceLabel('device_native')).toBeNull()
        expect(sourceLabel('haversine')).toBeNull()
        expect(sourceLabel(null)).toBeNull()
        expect(sourceLabel('installer_supplied')).toBe('Installer reading')
    })

    it('converts miles to kilometres', () => {
        expect(unitToKm(100, 'mi')).toBeCloseTo(160.9344, 4)
        expect(unitToKm(100, 'km')).toBe(100)
    })

    it('describes each submission outcome, including the review reason', () => {
        expect(outcomeMessage('accepted').tone).toBe('success')
        expect(outcomeMessage('pending_sync').title).toMatch(/waiting to sync/i)
        const review = outcomeMessage('pending_review', 'decrease')
        expect(review.detail).toMatch(/lower than the accepted total/)
        expect(review.detail).toMatch(/unchanged/)
    })

    it('labels mileage maintenance states', () => {
        expect(mileageStateLabel('inactive_no_baseline')).toBe('Odometer reading required')
        expect(mileageStateLabel('target_required')).toBe('Mileage target required')
        expect(mileageStateLabel('suspended')).toMatch(/suspended/i)
        expect(mileageStateLabel('active')).toBeNull()
    })
})
