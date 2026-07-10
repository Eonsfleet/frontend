'use client'

import { SettingsCard, Field, SettingsSelect } from './shared'
import type { ViewPreferenceSettings } from './types'

const LANDING_PAGE_OPTIONS = [
    { value: 'overview', label: 'Overview' },
    { value: 'realtime', label: 'Real-time Tracking' },
    { value: 'transactions', label: 'Fuel Transactions' },
    { value: 'analysis', label: 'Fuel Analysis' },
]

const DATE_RANGE_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'this_month', label: 'This Month' },
]

interface ViewPreferencesCardProps {
    value: ViewPreferenceSettings
    onChange: (value: ViewPreferenceSettings) => void
}

export function ViewPreferencesCard({ value, onChange }: ViewPreferencesCardProps) {
    return (
        <SettingsCard
            title="Default View Preferences"
            description="Configure default views for fuel module."
        >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Default Landing Page">
                    <SettingsSelect
                        value={value.landingPage}
                        onValueChange={(v) => onChange({ ...value, landingPage: v })}
                        options={LANDING_PAGE_OPTIONS}
                        ariaLabel="Default Landing Page"
                    />
                </Field>
                <Field label="Default Date Range">
                    <SettingsSelect
                        value={value.dateRange}
                        onValueChange={(v) => onChange({ ...value, dateRange: v })}
                        options={DATE_RANGE_OPTIONS}
                        ariaLabel="Default Date Range"
                    />
                </Field>
            </div>
        </SettingsCard>
    )
}
