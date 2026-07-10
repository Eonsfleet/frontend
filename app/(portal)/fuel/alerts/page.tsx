'use client'

import { useState } from 'react'
import { Settings2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FuelTabs } from '../components/FuelTabs'
import { AlertKpiCards } from '../components/AlertKpiCards'
import { AlertsTable } from '../components/AlertsTable'
import { AlertDetailPanel } from '../components/AlertDetailPanel'
import { useFuelAlerts, useAlertFuelTrend } from '../components/useFuelAlerts'

export default function FuelAlertsPage() {
    const { alerts, kpis } = useFuelAlerts()
    // Open the first alert by default to mirror the design; X clears the selection.
    const [selectedId, setSelectedId] = useState<string | null>(alerts[0]?.id ?? null)
    const selected = alerts.find((a) => a.id === selectedId) ?? null
    const trend = useAlertFuelTrend(selected)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Alerts</h1>
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-100 px-1.5 text-[12px] font-bold text-rose-600">
                            {kpis.total}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Monitor and respond to fuel related alerts in real time.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none">
                        <Settings2 className="h-4 w-4" /> Alert Rules
                    </Button>
                    <Button size="sm" className="h-9 gap-2 bg-blue-600 text-white shadow-none hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Create Alert
                    </Button>
                </div>
            </div>

            <FuelTabs active="Fuel Alerts" />

            <AlertKpiCards kpis={kpis} />

            {/* Table + detail panel */}
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
                <div className={selected ? 'xl:col-span-2' : 'xl:col-span-3'}>
                    <AlertsTable alerts={alerts} activeId={selectedId} onSelect={setSelectedId} />
                </div>
                {selected && (
                    <div className="xl:col-span-1">
                        <AlertDetailPanel alert={selected} trend={trend} onClose={() => setSelectedId(null)} />
                    </div>
                )}
            </div>
        </div>
    )
}
