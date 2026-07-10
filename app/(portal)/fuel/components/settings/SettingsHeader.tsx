'use client'

import { RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FuelTabs } from '../FuelTabs'

interface SettingsHeaderProps {
    onReset: () => void
    onSave: () => void
    isSaving?: boolean
}

export function SettingsHeader({ onReset, onSave, isSaving }: SettingsHeaderProps) {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Management</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Configure fuel system preferences, thresholds, units and integrations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none" onClick={onReset}>
                        <RotateCcw className="h-4 w-4" /> Reset to Default
                    </Button>
                    <Button
                        size="sm"
                        className="h-9 gap-2 bg-blue-600 hover:bg-blue-700"
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <FuelTabs active="Fuel Settings" />
        </div>
    )
}
