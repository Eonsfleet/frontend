'use client'

import { SettingsCard, Field, SettingsSelect, UnitInput, InfoBanner } from './shared'
import type { GeneralFuelSettings } from './types'

const FUEL_UNIT_OPTIONS = [
    { value: 'liters', label: 'Liters (L)' },
    { value: 'gallons', label: 'Gallons (gal)' },
]

const ECONOMY_UNIT_OPTIONS = [
    { value: 'km_l', label: 'km/L' },
    { value: 'mpg', label: 'MPG' },
    { value: 'l_100km', label: 'L/100km' },
]

const CURRENCY_OPTIONS = [
    { value: 'ngn', label: 'NGN - Nigerian Naira (₦)' },
    { value: 'usd', label: 'USD - US Dollar ($)' },
    { value: 'gbp', label: 'GBP - British Pound (£)' },
]

const DECIMAL_PRECISION_OPTIONS = [
    { value: '0', label: '0 (0)' },
    { value: '1', label: '1 (0.0)' },
    { value: '2', label: '2 (0.00)' },
]

const TIME_ZONE_OPTIONS = [
    { value: 'gmt+1_lagos', label: '(GMT+01:00) West Africa Time' },
    { value: 'gmt+0_london', label: '(GMT+00:00) Greenwich Mean Time' },
    { value: 'gmt+1_paris', label: '(GMT+01:00) Central European Time' },
]

const DATE_FORMAT_OPTIONS = [
    { value: 'MMM_DD_YYYY', label: 'May 16, 2024 (MMM DD, YYYY)' },
    { value: 'DD_MM_YYYY', label: '16/05/2024 (DD/MM/YYYY)' },
    { value: 'MM_DD_YYYY', label: '05/16/2024 (MM/DD/YYYY)' },
]

interface GeneralSettingsCardProps {
    value: GeneralFuelSettings
    onChange: (value: GeneralFuelSettings) => void
}

export function GeneralSettingsCard({ value, onChange }: GeneralSettingsCardProps) {
    const set = <K extends keyof GeneralFuelSettings>(key: K, fieldValue: GeneralFuelSettings[K]) =>
        onChange({ ...value, [key]: fieldValue })

    return (
        <SettingsCard
            title="General Settings"
            description="Configure basic preferences for fuel management."
        >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Field label="Fuel Measurement Unit">
                    <SettingsSelect
                        value={value.fuelUnit}
                        onValueChange={(v) => set('fuelUnit', v)}
                        options={FUEL_UNIT_OPTIONS}
                        ariaLabel="Fuel Measurement Unit"
                    />
                </Field>
                <Field label="Fuel Economy Unit">
                    <SettingsSelect
                        value={value.economyUnit}
                        onValueChange={(v) => set('economyUnit', v)}
                        options={ECONOMY_UNIT_OPTIONS}
                        ariaLabel="Fuel Economy Unit"
                    />
                </Field>
                <Field label="Currency">
                    <SettingsSelect
                        value={value.currency}
                        onValueChange={(v) => set('currency', v)}
                        options={CURRENCY_OPTIONS}
                        ariaLabel="Currency"
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Field label="Decimal Precision">
                    <SettingsSelect
                        value={value.decimalPrecision}
                        onValueChange={(v) => set('decimalPrecision', v)}
                        options={DECIMAL_PRECISION_OPTIONS}
                        ariaLabel="Decimal Precision"
                    />
                </Field>
                <Field label="Time Zone">
                    <SettingsSelect
                        value={value.timeZone}
                        onValueChange={(v) => set('timeZone', v)}
                        options={TIME_ZONE_OPTIONS}
                        ariaLabel="Time Zone"
                    />
                </Field>
                <Field label="Date Format">
                    <SettingsSelect
                        value={value.dateFormat}
                        onValueChange={(v) => set('dateFormat', v)}
                        options={DATE_FORMAT_OPTIONS}
                        ariaLabel="Date Format"
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Default Fuel Tank Capacity">
                    <UnitInput
                        value={value.tankCapacity}
                        onChange={(v) => set('tankCapacity', v)}
                        unit="L"
                        ariaLabel="Default Fuel Tank Capacity"
                    />
                </Field>
                <Field label="Idle Detection for Fuel Analysis">
                    <UnitInput
                        value={value.idleDetectionMinutes}
                        onChange={(v) => set('idleDetectionMinutes', v)}
                        unit="minutes"
                        ariaLabel="Idle Detection for Fuel Analysis"
                    />
                </Field>
            </div>

            <InfoBanner>These settings will be applied across the entire organization.</InfoBanner>
        </SettingsCard>
    )
}
