import type { VehicleAttributes } from '@/types'

/**
 * A vehicle's own fuel estimation rates. They are what the platform multiplies
 * distance and idling time by when the tracker reports no fuel level, and they
 * win over the typical figure for the vehicle's make and model.
 *
 * The limits are the ones the API and the telemetry platform enforce: a rate
 * above them is refused, so the form says so before it is sent.
 */
export const MAX_CONSUMPTION_L_PER_100KM = 500
export const MAX_IDLE_L_PER_HOUR = 100

export interface EstimationFormValues {
    fuel_estimation_enabled: boolean
    estimated_liters_per_100km: string
    estimated_idle_liters_per_hour: string
}

export interface EstimationPayload {
    fuel_estimation_enabled: boolean
    estimated_liters_per_100km: number | null
    estimated_idle_liters_per_hour: number | null
}

/** Blank is allowed (the make and model's typical figure is used); anything else must be above 0 and within the limit. */
export function rateError(value: string | null | undefined, max: number, label: string): string | null {
    const text = (value ?? '').trim()
    if (text === '') return null
    const number = Number(text)
    if (!Number.isFinite(number) || number <= 0) return `${label} must be a number above 0.`
    if (number > max) return `${label} must be ${max} or less.`
    return null
}

export function parseRate(value: string | null | undefined): number | null {
    const text = (value ?? '').trim()
    return text === '' ? null : Number(text)
}

/** The form's starting values: the vehicle's own rates as text, and estimation on unless the vehicle says otherwise. */
export function estimationDefaults(attributes?: Pick<VehicleAttributes, 'fuel_estimation'>): EstimationFormValues {
    const estimation = attributes?.fuel_estimation
    return {
        fuel_estimation_enabled: estimation?.enabled ?? true,
        estimated_liters_per_100km: estimation?.liters_per_100km != null ? String(estimation.liters_per_100km) : '',
        estimated_idle_liters_per_hour: estimation?.idle_liters_per_hour != null ? String(estimation.idle_liters_per_hour) : '',
    }
}

/** What the API takes: a blank rate is null, which clears it so the make and model's figure applies again. */
export function estimationPayload(values: Partial<EstimationFormValues>): EstimationPayload {
    return {
        fuel_estimation_enabled: values.fuel_estimation_enabled ?? true,
        estimated_liters_per_100km: parseRate(values.estimated_liters_per_100km),
        estimated_idle_liters_per_hour: parseRate(values.estimated_idle_liters_per_hour),
    }
}
