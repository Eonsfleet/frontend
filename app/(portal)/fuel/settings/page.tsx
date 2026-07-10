'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { SettingsHeader } from '../components/settings/SettingsHeader'
import { SettingsNav } from '../components/settings/SettingsNav'
import { GeneralSettingsCard } from '../components/settings/GeneralSettingsCard'
import { FuelThresholdsCard } from '../components/settings/FuelThresholdsCard'
import { IdleDetectionCard } from '../components/settings/IdleDetectionCard'
import { AlertsNotificationsCard } from '../components/settings/AlertsNotificationsCard'
import { DataRefreshCard } from '../components/settings/DataRefreshCard'
import { ViewPreferencesCard } from '../components/settings/ViewPreferencesCard'
import { SystemPreferencesCard } from '../components/settings/SystemPreferencesCard'
import { DEFAULT_FUEL_SETTINGS, type FuelSettingsFormState } from '../components/settings/types'

const SECTION_LABELS: Record<string, string> = {
    'general-settings': 'General Settings',
    'fuel-thresholds': 'Fuel Thresholds',
    'fuel-alerts': 'Fuel Alerts & Notifications',
}

export default function FuelSettingsPage() {
    const [form, setForm] = useState<FuelSettingsFormState>(DEFAULT_FUEL_SETTINGS)
    const [activeSection, setActiveSection] = useState('General Settings')
    const [isSaving, setIsSaving] = useState(false)

    const handleNavigate = (id: string) => {
        setActiveSection(SECTION_LABELS[id] ?? activeSection)
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleReset = () => {
        setForm(DEFAULT_FUEL_SETTINGS)
        toast.success('Settings reset to defaults')
    }

    const handleSave = () => {
        setIsSaving(true)
        setTimeout(() => {
            setIsSaving(false)
            toast.success('Fuel settings updated successfully')
        }, 500)
    }

    return (
        <div className="space-y-6">
            <SettingsHeader onReset={handleReset} onSave={handleSave} isSaving={isSaving} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_1fr_320px]">
                <div className="xl:order-1">
                    <SettingsNav active={activeSection} onNavigate={handleNavigate} />
                </div>

                <div className="space-y-6 xl:order-2">
                    <div id="general-settings">
                        <GeneralSettingsCard
                            value={form.general}
                            onChange={(general) => setForm((f) => ({ ...f, general }))}
                        />
                    </div>
                    <div id="fuel-thresholds">
                        <FuelThresholdsCard
                            value={form.thresholds}
                            onChange={(thresholds) => setForm((f) => ({ ...f, thresholds }))}
                        />
                    </div>
                    <IdleDetectionCard
                        value={form.idleDetection}
                        onChange={(idleDetection) => setForm((f) => ({ ...f, idleDetection }))}
                    />
                </div>

                <div className="space-y-6 xl:order-3">
                    <div id="fuel-alerts">
                        <AlertsNotificationsCard
                            value={form.alerts}
                            onChange={(alerts) => setForm((f) => ({ ...f, alerts }))}
                        />
                    </div>
                    <DataRefreshCard
                        value={form.dataRefresh}
                        onChange={(dataRefresh) => setForm((f) => ({ ...f, dataRefresh }))}
                    />
                    <ViewPreferencesCard
                        value={form.viewPreferences}
                        onChange={(viewPreferences) => setForm((f) => ({ ...f, viewPreferences }))}
                    />
                    <SystemPreferencesCard
                        value={form.systemPreferences}
                        onChange={(systemPreferences) => setForm((f) => ({ ...f, systemPreferences }))}
                    />
                </div>
            </div>
        </div>
    )
}
