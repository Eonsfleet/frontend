'use client'

import { SettingsCard, Field, UnitInput } from './shared'
import type { IdleDetectionSettings } from './types'

interface IdleDetectionCardProps {
    value: IdleDetectionSettings
    onChange: (value: IdleDetectionSettings) => void
}

export function IdleDetectionCard({ value, onChange }: IdleDetectionCardProps) {
    return (
        <SettingsCard
            title="Idle Detection Settings"
            description="Idle detection helps improve fuel analysis accuracy."
        >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Idle Speed Threshold">
                    <UnitInput
                        value={value.speedThreshold}
                        onChange={(v) => onChange({ ...value, speedThreshold: v })}
                        unit="km/h"
                        ariaLabel="Idle Speed Threshold"
                    />
                </Field>
                <Field label="Idle Time Threshold">
                    <UnitInput
                        value={value.timeThreshold}
                        onChange={(v) => onChange({ ...value, timeThreshold: v })}
                        unit="minutes"
                        ariaLabel="Idle Time Threshold"
                    />
                </Field>
            </div>
        </SettingsCard>
    )
}
