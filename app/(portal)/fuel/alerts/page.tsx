'use client'

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FuelTabs } from '../components/FuelTabs'
import { AlertKpiCards } from '../components/AlertKpiCards'
import { AlertsTable } from '../components/AlertsTable'
import { AlertDetailPanel } from '../components/AlertDetailPanel'
import { AlertFiltersModal } from '../components/AlertFiltersModal'
import { CreateAlertRuleModal } from '../components/CreateAlertRuleModal'
import { useFuelAlerts, useAlertFuelTrend } from '../components/useFuelAlerts'

export default function FuelAlertsPage() {
    const { alerts, filtered, kpis, filters, setFilters, setStatus, removeAlert, activeFilterCount } = useFuelAlerts()
    // Open the first alert by default to mirror the design; X clears the selection.
    const [selectedId, setSelectedId] = useState<string | null>(alerts[0]?.id ?? null)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [ruleOpen, setRuleOpen] = useState(false)

    const selected = alerts.find((a) => a.id === selectedId) ?? null
    const trend = useAlertFuelTrend(selected)

    const acknowledge = (id: string) => { setStatus(id, 'acknowledged'); toast.success('Alert acknowledged') }
    const resolve = (id: string) => { setStatus(id, 'resolved'); toast.success('Alert resolved') }
    const remove = (id: string) => {
        removeAlert(id)
        if (selectedId === id) setSelectedId(null)
        toast.success('Alert deleted')
    }

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
                    <Button variant="outline" size="sm" onClick={() => setRuleOpen(true)} className="h-9 gap-2 shadow-none">
                        <Settings2 className="h-4 w-4" /> Alert Rules
                    </Button>
                </div>
            </div>

            <FuelTabs active="Fuel Alerts" />

            <AlertKpiCards kpis={kpis} />

            {/* Table + detail panel */}
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
                <div className={selected ? 'xl:col-span-2' : 'xl:col-span-3'}>
                    <AlertsTable
                        alerts={filtered}
                        activeId={selectedId}
                        onSelect={setSelectedId}
                        onOpenFilters={() => setFiltersOpen(true)}
                        onCreateRule={() => setRuleOpen(true)}
                        onAcknowledge={acknowledge}
                        onResolve={resolve}
                        onDelete={remove}
                        activeFilterCount={activeFilterCount}
                    />
                </div>
                {selected && (
                    <div className="xl:col-span-1">
                        <AlertDetailPanel alert={selected} trend={trend} onClose={() => setSelectedId(null)} />
                    </div>
                )}
            </div>

            <AlertFiltersModal open={filtersOpen} onOpenChange={setFiltersOpen} value={filters} onApply={setFilters} />
            <CreateAlertRuleModal open={ruleOpen} onOpenChange={setRuleOpen} />
        </div>
    )
}
