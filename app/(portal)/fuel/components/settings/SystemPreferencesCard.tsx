'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { SettingsCard, BLUE_CHECKBOX_CLASS } from './shared'
import type { SystemPreferenceSettings } from './types'

interface PreferenceRow {
    key: keyof SystemPreferenceSettings
    label: string
    tooltip: string
}

const ROWS: PreferenceRow[] = [
    {
        key: 'manualEntry',
        label: 'Allow manual fuel entry',
        tooltip: 'Lets drivers and staff log fuel purchases manually instead of relying only on sensor data.',
    },
    {
        key: 'bulkImport',
        label: 'Allow bulk fuel transactions import',
        tooltip: 'Enables importing fuel transactions in bulk from a CSV or provider export.',
    },
    {
        key: 'theftDetection',
        label: 'Enable fuel theft detection',
        tooltip: 'Runs anomaly detection on fuel level drops to flag potential theft or siphoning.',
    },
]

interface SystemPreferencesCardProps {
    value: SystemPreferenceSettings
    onChange: (value: SystemPreferenceSettings) => void
}

export function SystemPreferencesCard({ value, onChange }: SystemPreferencesCardProps) {
    return (
        <SettingsCard title="System Preferences">
            <TooltipProvider delayDuration={200}>
                <div className="space-y-3">
                    {ROWS.map((row) => {
                        const id = `system-pref-${row.key}`
                        return (
                            <div key={row.key} className="flex items-center gap-2.5">
                                <Checkbox
                                    id={id}
                                    checked={value[row.key]}
                                    onCheckedChange={(checked) => onChange({ ...value, [row.key]: checked === true })}
                                    className={BLUE_CHECKBOX_CLASS}
                                />
                                <label htmlFor={id} className="text-sm font-medium text-blue-700">
                                    {row.label}
                                </label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button type="button" aria-label={`About ${row.label}`}>
                                            <Info className="h-3.5 w-3.5 text-slate-400" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{row.tooltip}</TooltipContent>
                                </Tooltip>
                            </div>
                        )
                    })}
                </div>
            </TooltipProvider>
        </SettingsCard>
    )
}
