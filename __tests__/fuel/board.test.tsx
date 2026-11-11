import { describe, expect, it } from 'vitest'
import { applyLiveOverrides, sortBoard, summarize } from '@/app/(portal)/fuel/components/useFuelBoard'
import type { RealtimeFuelVehicle } from '@/lib/api/fuelPage'

const NOW = Date.parse('2026-11-10T10:00:00Z')

const vehicle = (id: number, over: Partial<RealtimeFuelVehicle> = {}): RealtimeFuelVehicle => ({
    vehicle_id: id, registration_number: `LAG-${id}`, make: 'Toyota', model: 'Hilux', type: 'pickup', cluster_id: null,
    level_litres: 40, level_percent: 50, basis: 'measured', capacity_litres: 80,
    recorded_at: '2026-11-10T09:40:00Z', age_minutes: 20, freshness: 'stale',
    burn_litres_per_hour: 5, burn_percent_per_hour: null, burn_basis: { span_minutes: 60, points: 6 },
    hours_to_empty: 8, range_km: 400, location: null, open_alerts: 0, ...over,
})

describe('live overlay', () => {
    it('makes a vehicle live again when a newer packet carries its level', () => {
        const [v] = applyLiveOverrides([vehicle(1)], { 1: { fuelPercent: 47, fuelLiters: 37.6, lastUpdate: '2026-11-10T09:58:00Z' } }, NOW)

        expect(v).toMatchObject({ level_percent: 47, level_litres: 37.6, age_minutes: 2, freshness: 'live' })
        expect(v.basis).toBe('measured')
    })

    it('never gives a percent-only tank litres from a packet', () => {
        const [v] = applyLiveOverrides([vehicle(2, { basis: 'percent_only', level_litres: null })], { 2: { fuelPercent: 30, fuelLiters: 24, lastUpdate: '2026-11-10T09:59:00Z' } }, NOW)

        expect(v.level_litres).toBeNull()
        expect(v.level_percent).toBe(30)
    })

    it('ignores a packet older than the polled reading', () => {
        const [v] = applyLiveOverrides([vehicle(3, { age_minutes: 5, freshness: 'live' })], { 3: { fuelPercent: 90, lastUpdate: '2026-11-10T09:00:00Z' } }, NOW)

        expect(v.age_minutes).toBe(5)
        expect(v.freshness).toBe('live')
    })

    it('moves the position and motion without touching the fuel reading', () => {
        const [v] = applyLiveOverrides([vehicle(4)], { 4: { lat: 6.5, lng: 3.4, speedKmh: 0, lastUpdate: '2026-11-10T09:59:00Z' } }, NOW)

        expect(v.location).toMatchObject({ latitude: 6.5, longitude: 3.4, moving: false, speed_kph: 0 })
        expect(v.age_minutes).toBe(20)
    })

    it('leaves a vehicle with no packet exactly as polled', () => {
        const original = vehicle(5)
        expect(applyLiveOverrides([original], {}, NOW)[0]).toBe(original)
    })
})

describe('ordering and counts', () => {
    const list = [
        vehicle(1, { hours_to_empty: 8, level_percent: 50 }),
        vehicle(2, { hours_to_empty: null, level_percent: 10 }),
        vehicle(3, { hours_to_empty: 2, level_percent: 70 }),
    ]

    it('puts the vehicle that runs dry soonest first, and unknown range last', () => {
        expect(sortBoard(list, 'range').map((v) => v.vehicle_id)).toEqual([3, 1, 2])
    })

    it('can sort by level', () => {
        expect(sortBoard(list, 'level').map((v) => v.vehicle_id)).toEqual([2, 1, 3])
    })

    it('counts live, stale and low from what is shown', () => {
        const s = summarize([vehicle(1, { freshness: 'live' }), vehicle(2, { level_percent: 12 }), vehicle(3, { level_percent: null })], 4)
        expect(s).toEqual({ reporting: 3, live: 1, stale: 2, silent: 4, low: 1 })
    })
})
