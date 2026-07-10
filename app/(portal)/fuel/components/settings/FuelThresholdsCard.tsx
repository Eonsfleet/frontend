'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsCard, UnitInput, InfoBanner, SettingsSelect } from './shared'
import type { ThresholdSettings } from './types'

interface ThresholdFieldProps {
    dotColor: string
    label: string
    helper: string
    value: string
    onChange: (value: string) => void
}

function ThresholdField({ dotColor, label, helper, value, onChange }: ThresholdFieldProps) {
    return (
        <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <span className={cn('h-2 w-2 rounded-full', dotColor)} />
                {label}
            </label>
            <p className="mb-1.5 text-xs text-slate-500">{helper}</p>
            <UnitInput value={value} onChange={onChange} unit="%" ariaLabel={label} />
        </div>
    )
}

function RadioOption({
    checked,
    label,
    onSelect,
    children,
}: {
    checked: boolean
    label: string
    onSelect: () => void
    children?: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex items-center gap-2 text-sm font-medium text-slate-700"
        >
            <span
                className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                    checked ? 'border-blue-600' : 'border-slate-300',
                )}
            >
                {checked && <span className="h-2 w-2 rounded-full bg-blue-600" />}
            </span>
            {label}
            {children}
        </button>
    )
}

interface FuelThresholdsCardProps {
    value: ThresholdSettings
    onChange: (value: ThresholdSettings) => void
}

export function FuelThresholdsCard({ value, onChange }: FuelThresholdsCardProps) {
    return (
        <SettingsCard
            title="Fuel Thresholds"
            description="Set default fuel level thresholds for alerts and monitoring."
        >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <ThresholdField
                    dotColor="bg-amber-500"
                    label="Low Fuel Threshold"
                    helper="When fuel level is at or below"
                    value={value.low}
                    onChange={(v) => onChange({ ...value, low: v })}
                />
                <ThresholdField
                    dotColor="bg-rose-500"
                    label="Critical Fuel Threshold"
                    helper="When fuel level is at or below"
                    value={value.critical}
                    onChange={(v) => onChange({ ...value, critical: v })}
                />
                <ThresholdField
                    dotColor="bg-emerald-500"
                    label="Refuel Full Threshold"
                    helper="When fuel level is at or above"
                    value={value.refuelFull}
                    onChange={(v) => onChange({ ...value, refuelFull: v })}
                />
            </div>

            <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Apply thresholds to</p>
                <div className="flex flex-wrap items-center gap-6">
                    <RadioOption
                        checked={value.applyTo === 'all'}
                        label="All Vehicles"
                        onSelect={() => onChange({ ...value, applyTo: 'all' })}
                    />
                    <div className="flex items-center gap-3">
                        <RadioOption
                            checked={value.applyTo === 'groups'}
                            label="Vehicle Groups"
                            onSelect={() => onChange({ ...value, applyTo: 'groups' })}
                        />
                        <div className="w-44">
                            <SettingsSelect
                                value=""
                                onValueChange={() => {}}
                                options={[]}
                                placeholder="Select groups"
                                ariaLabel="Select vehicle groups"
                                disabled={value.applyTo !== 'groups'}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <InfoBanner
                tone="amber"
                action={
                    <Link
                        href="/vehicles"
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                        Manage Vehicle Settings
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                }
            >
                Individual vehicle thresholds can be configured in the vehicle settings.
            </InfoBanner>
        </SettingsCard>
    )
}
