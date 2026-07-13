'use client'

import { SettingsCard, Field, SettingsSelect } from './shared'
import type { DataRefreshSettings } from './types'

const INTERVAL_OPTIONS = [
    { value: '1', label: '1 minute' },
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
]

interface DataRefreshCardProps {
    value: DataRefreshSettings
    onChange: (value: DataRefreshSettings) => void
}

export function DataRefreshCard({ value, onChange }: DataRefreshCardProps) {
    return (
        <SettingsCard
            title="Fuel Data Refresh"
            description="Set how often fuel data is collected and updated."
        >
            <Field label="Data Refresh Interval">
                <SettingsSelect
                    value={value.interval}
                    onValueChange={(v) => onChange({ interval: v })}
                    options={INTERVAL_OPTIONS}
                    ariaLabel="Data Refresh Interval"
                />
            </Field>
            <p className="text-xs text-slate-500">
                Shorter intervals provide more real-time data but may increase data usage.
            </p>
        </SettingsCard>
    )
}
