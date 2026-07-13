/**
 * Maps between the fuel-settings API resource (snake_case, backend enums) and the
 * UI form state (camelCase, select-friendly codes). The two differ for a few fields
 * — economy unit, timezone, date format, currency — so those get explicit lookup
 * tables; the rest pass through.
 */

import type {
    FuelSettings,
    FuelEconomyUnit,
    DefaultLandingPage,
    DefaultDateRange,
} from '@/types/fuel'
import { DEFAULT_FUEL_SETTINGS, type FuelSettingsFormState } from './types'

// ── Economy unit ─────────────────────────────────────────────────────────────
const ECONOMY_TO_FORM: Record<FuelEconomyUnit, string> = {
    km_per_liter: 'km_l',
    l_per_100km: 'l_100km',
    mpg: 'mpg',
}
const ECONOMY_TO_API: Record<string, FuelEconomyUnit> = {
    km_l: 'km_per_liter',
    l_100km: 'l_per_100km',
    mpg: 'mpg',
}

// ── Timezone ─────────────────────────────────────────────────────────────────
const TZ_TO_FORM: Record<string, string> = {
    'Africa/Lagos': 'gmt+1_lagos',
    'Europe/London': 'gmt+0_london',
    'Europe/Paris': 'gmt+1_paris',
}
const TZ_TO_API: Record<string, string> = {
    'gmt+1_lagos': 'Africa/Lagos',
    'gmt+0_london': 'Europe/London',
    'gmt+1_paris': 'Europe/Paris',
}

// ── Date format ──────────────────────────────────────────────────────────────
const DATE_TO_FORM: Record<string, string> = {
    'MMM DD, YYYY': 'MMM_DD_YYYY',
    'DD/MM/YYYY': 'DD_MM_YYYY',
    'MM/DD/YYYY': 'MM_DD_YYYY',
}
const DATE_TO_API: Record<string, string> = {
    MMM_DD_YYYY: 'MMM DD, YYYY',
    DD_MM_YYYY: 'DD/MM/YYYY',
    MM_DD_YYYY: 'MM/DD/YYYY',
}

// ── Currency (form uses lowercase codes) ─────────────────────────────────────
const currencyToForm = (c?: string | null) => (c ? c.toLowerCase() : DEFAULT_FUEL_SETTINGS.general.currency)
const currencyToApi = (c: string) => c.toUpperCase()

const str = (value: number | null | undefined, fallback: string) =>
    value == null ? fallback : String(value)

const num = (value: string, fallback: number | null = null) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

const bool = (value: boolean | null | undefined, fallback: boolean) => (value == null ? fallback : value)

/** API resource → UI form state (falling back to defaults for missing fields). */
export function apiToForm(api: FuelSettings): FuelSettingsFormState {
    const d = DEFAULT_FUEL_SETTINGS
    return {
        general: {
            fuelUnit: api.fuel_measurement_unit ?? d.general.fuelUnit,
            economyUnit: (api.fuel_economy_unit && ECONOMY_TO_FORM[api.fuel_economy_unit]) || d.general.economyUnit,
            currency: currencyToForm(api.currency),
            decimalPrecision: str(api.decimal_precision, d.general.decimalPrecision),
            timeZone: (api.timezone && TZ_TO_FORM[api.timezone]) || d.general.timeZone,
            dateFormat: (api.date_format && DATE_TO_FORM[api.date_format]) || d.general.dateFormat,
            tankCapacity: str(api.default_fuel_tank_capacity_liters, d.general.tankCapacity),
            idleDetectionMinutes: str(api.idle_detection_for_fuel_analysis_minutes, d.general.idleDetectionMinutes),
        },
        thresholds: {
            low: str(api.low_fuel_threshold_percent, d.thresholds.low),
            critical: str(api.critical_fuel_threshold_percent, d.thresholds.critical),
            refuelFull: str(api.refuel_full_threshold_percent, d.thresholds.refuelFull),
            applyTo: api.threshold_scope === 'vehicle_groups' ? 'groups' : 'all',
        },
        idleDetection: {
            speedThreshold: str(api.idle_speed_threshold_kmh, d.idleDetection.speedThreshold),
            timeThreshold: str(api.idle_time_threshold_minutes, d.idleDetection.timeThreshold),
        },
        alerts: {
            channels: {
                inApp: bool(api.alert_channel_in_app, d.alerts.channels.inApp),
                email: bool(api.alert_channel_email, d.alerts.channels.email),
                sms: bool(api.alert_channel_sms, d.alerts.channels.sms),
                webhook: bool(api.alert_channel_webhook, d.alerts.channels.webhook),
            },
            quietFrom: api.quiet_hours_start ?? d.alerts.quietFrom,
            quietTo: api.quiet_hours_end ?? d.alerts.quietTo,
            dailySummaryEnabled: bool(api.daily_summary_enabled, d.alerts.dailySummaryEnabled),
            summaryTime: api.daily_summary_time ?? d.alerts.summaryTime,
        },
        dataRefresh: {
            interval: str(api.data_refresh_interval_minutes, d.dataRefresh.interval),
        },
        viewPreferences: {
            landingPage: api.default_landing_page ?? d.viewPreferences.landingPage,
            dateRange: api.default_date_range ?? d.viewPreferences.dateRange,
        },
        systemPreferences: {
            manualEntry: bool(api.allow_manual_fuel_entry, d.systemPreferences.manualEntry),
            bulkImport: bool(api.allow_bulk_fuel_transactions_import, d.systemPreferences.bulkImport),
            theftDetection: bool(api.fuel_theft_detection_enabled, d.systemPreferences.theftDetection),
        },
    }
}

/** UI form state → PUT payload (only the fields this form owns). */
export function formToApi(form: FuelSettingsFormState): Partial<FuelSettings> {
    return {
        fuel_measurement_unit: form.general.fuelUnit === 'gallons' ? 'gallons' : 'liters',
        fuel_economy_unit: ECONOMY_TO_API[form.general.economyUnit] ?? 'km_per_liter',
        currency: currencyToApi(form.general.currency),
        decimal_precision: num(form.general.decimalPrecision, 2),
        timezone: TZ_TO_API[form.general.timeZone] ?? 'Africa/Lagos',
        date_format: DATE_TO_API[form.general.dateFormat] ?? 'MMM DD, YYYY',
        default_fuel_tank_capacity_liters: num(form.general.tankCapacity, 0),
        idle_detection_for_fuel_analysis_minutes: num(form.general.idleDetectionMinutes, 1),

        low_fuel_threshold_percent: num(form.thresholds.low),
        critical_fuel_threshold_percent: num(form.thresholds.critical),
        refuel_full_threshold_percent: num(form.thresholds.refuelFull),
        threshold_scope: form.thresholds.applyTo === 'groups' ? 'vehicle_groups' : 'all_vehicles',

        idle_speed_threshold_kmh: num(form.idleDetection.speedThreshold),
        idle_time_threshold_minutes: num(form.idleDetection.timeThreshold, 1),

        alert_channel_in_app: form.alerts.channels.inApp,
        alert_channel_email: form.alerts.channels.email,
        alert_channel_sms: form.alerts.channels.sms,
        alert_channel_webhook: form.alerts.channels.webhook,
        quiet_hours_start: form.alerts.quietFrom,
        quiet_hours_end: form.alerts.quietTo,
        daily_summary_enabled: form.alerts.dailySummaryEnabled,
        daily_summary_time: form.alerts.summaryTime,

        data_refresh_interval_minutes: num(form.dataRefresh.interval, 1),

        default_landing_page: form.viewPreferences.landingPage as DefaultLandingPage,
        default_date_range: form.viewPreferences.dateRange as DefaultDateRange,

        allow_manual_fuel_entry: form.systemPreferences.manualEntry,
        allow_bulk_fuel_transactions_import: form.systemPreferences.bulkImport,
        fuel_theft_detection_enabled: form.systemPreferences.theftDetection,
    }
}
