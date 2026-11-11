'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { getFuelSettings, updateFuelSettings } from '@/lib/api/fuel'
import { extractApiError } from '@/lib/utils'
import { QueryError } from '@/components/shared/QueryError'
import { apiToForm, formToApi } from '../components/settings/mappers'
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
    const queryClient = useQueryClient()
    const [form, setForm] = useState<FuelSettingsFormState>(DEFAULT_FUEL_SETTINGS)
    const [activeSection, setActiveSection] = useState('General Settings')

    const { data, dataUpdatedAt, isLoading, isError, refetch } = useQuery({
        queryKey: ['fuel-settings'],
        queryFn: () => getFuelSettings(),
    })

    // Re-seed the form whenever a fresh server response arrives (initial load or
    // post-save refetch). React sanctions this "adjust state while rendering" pattern
    // when it's guarded by a stored marker (here the query's dataUpdatedAt).
    const [syncedAt, setSyncedAt] = useState(0)
    if (data?.data && dataUpdatedAt !== syncedAt) {
        setSyncedAt(dataUpdatedAt)
        setForm(apiToForm(data.data.fuel_settings))
    }

    const { mutate: save, isPending: isSaving } = useMutation({
        mutationFn: () => updateFuelSettings(formToApi(form)),
        onSuccess: () => {
            toast.success('Fuel settings updated successfully')
            queryClient.invalidateQueries({ queryKey: ['fuel-settings'] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const handleNavigate = (id: string) => {
        setActiveSection(SECTION_LABELS[id] ?? activeSection)
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // Reset restores the last-saved server values (or defaults if unavailable).
    const handleReset = () => {
        setForm(data?.data ? apiToForm(data.data.fuel_settings) : DEFAULT_FUEL_SETTINGS)
        toast.success('Settings reset')
    }

    if (isError) {
        return (
            <div className="space-y-6">
                <SettingsHeader onReset={handleReset} onSave={() => save()} isSaving={isSaving} />
                <QueryError message="Failed to load fuel settings." onRetry={refetch} />
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center text-slate-300">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <SettingsHeader onReset={handleReset} onSave={() => save()} isSaving={isSaving} />

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
                    <Link href="/fuel/settings/budgets" className="block rounded-2xl bg-white p-4 hover:bg-slate-50">
                        <p className="text-sm font-semibold text-slate-900">Fuel budgets</p>
                        <p className="mt-1 text-sm text-slate-500">Set a monthly litre budget for each vehicle. The Overview tracks use against it.</p>
                        <p className="mt-2 text-sm font-medium text-blue-700">Manage budgets →</p>
                    </Link>
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
