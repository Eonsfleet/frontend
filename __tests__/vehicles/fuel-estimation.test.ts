import { describe, expect, it } from 'vitest'
import {
    estimationDefaults,
    estimationPayload,
    MAX_CONSUMPTION_L_PER_100KM,
    MAX_IDLE_L_PER_HOUR,
    parseRate,
    rateError,
} from '@/lib/fuel-estimation'

describe('a vehicle’s own fuel rates', () => {
    it('allows a blank rate, so the make and model’s figure is used', () => {
        expect(rateError('', MAX_CONSUMPTION_L_PER_100KM, 'Consumption')).toBeNull()
        expect(rateError('   ', MAX_CONSUMPTION_L_PER_100KM, 'Consumption')).toBeNull()
        expect(rateError(undefined, MAX_CONSUMPTION_L_PER_100KM, 'Consumption')).toBeNull()
    })

    it('accepts a rate up to the limit the API enforces, and refuses beyond it', () => {
        expect(rateError('12.5', MAX_CONSUMPTION_L_PER_100KM, 'Consumption')).toBeNull()
        expect(rateError('500', MAX_CONSUMPTION_L_PER_100KM, 'Consumption')).toBeNull()
        expect(rateError('500.1', MAX_CONSUMPTION_L_PER_100KM, 'Consumption')).toBe('Consumption must be 500 or less.')
        expect(rateError('100', MAX_IDLE_L_PER_HOUR, 'Idle burn')).toBeNull()
        expect(rateError('100.5', MAX_IDLE_L_PER_HOUR, 'Idle burn')).toBe('Idle burn must be 100 or less.')
    })

    it('refuses zero, negatives and text: the API wants a rate above 0', () => {
        for (const bad of ['0', '-3', 'abc', '1,5']) {
            expect(rateError(bad, MAX_CONSUMPTION_L_PER_100KM, 'Consumption')).toBe('Consumption must be a number above 0.')
        }
    })

    it('reads a rate as a number, and a blank as nothing', () => {
        expect(parseRate('9.5')).toBe(9.5)
        expect(parseRate(' 9.5 ')).toBe(9.5)
        expect(parseRate('')).toBeNull()
        expect(parseRate(undefined)).toBeNull()
    })
})

describe('the form’s starting values', () => {
    it('shows the vehicle’s own rates, and leaves a missing one blank', () => {
        expect(estimationDefaults({ fuel_estimation: { enabled: true, liters_per_100km: 12.5, idle_liters_per_hour: null } })).toEqual({
            fuel_estimation_enabled: true,
            estimated_liters_per_100km: '12.5',
            estimated_idle_liters_per_hour: '',
        })
    })

    it('keeps estimation off for a vehicle that has it off', () => {
        expect(estimationDefaults({ fuel_estimation: { enabled: false, liters_per_100km: null, idle_liters_per_hour: null } }).fuel_estimation_enabled).toBe(false)
    })

    it('starts a new vehicle, or one the API says nothing about, with estimation on and no rates', () => {
        expect(estimationDefaults()).toEqual({ fuel_estimation_enabled: true, estimated_liters_per_100km: '', estimated_idle_liters_per_hour: '' })
        expect(estimationDefaults({})).toEqual({ fuel_estimation_enabled: true, estimated_liters_per_100km: '', estimated_idle_liters_per_hour: '' })
    })

    it('shows a rate of zero as it is, not as blank: it is a value somebody stored', () => {
        expect(estimationDefaults({ fuel_estimation: { enabled: true, liters_per_100km: 0, idle_liters_per_hour: 0 } }).estimated_liters_per_100km).toBe('0')
    })
})

describe('what is sent to the API', () => {
    it('sends numbers, and null for a blank so a rate that was set can be cleared', () => {
        expect(estimationPayload({ fuel_estimation_enabled: true, estimated_liters_per_100km: '12.5', estimated_idle_liters_per_hour: '' })).toEqual({
            fuel_estimation_enabled: true,
            estimated_liters_per_100km: 12.5,
            estimated_idle_liters_per_hour: null,
        })
    })

    it('keeps the rates a person typed when estimation is switched off', () => {
        expect(estimationPayload({ fuel_estimation_enabled: false, estimated_liters_per_100km: '9', estimated_idle_liters_per_hour: '1.2' })).toEqual({
            fuel_estimation_enabled: false,
            estimated_liters_per_100km: 9,
            estimated_idle_liters_per_hour: 1.2,
        })
    })

    it('treats a form that has no estimation fields as estimation on with nothing set', () => {
        expect(estimationPayload({})).toEqual({ fuel_estimation_enabled: true, estimated_liters_per_100km: null, estimated_idle_liters_per_hour: null })
    })
})
