'use client'

import { useState } from 'react'
import { BellPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn, extractApiError } from '@/lib/utils'
import { QueryError } from '@/components/shared/QueryError'
import { FuelTabs } from '../components/FuelTabs'
import { AlertKpiCards } from '../components/AlertKpiCards'
import { AlertsTable } from '../components/AlertsTable'
import { AlertDetailPanel } from '../components/AlertDetailPanel'
import { AlertFiltersModal } from '../components/AlertFiltersModal'
import { CreateAlertRuleModal } from '../components/CreateAlertRuleModal'
import { FalsePositiveDialog } from '../components/FalsePositiveDialog'
import { useFuelAlerts, useAlertFuelTrend } from '../components/useFuelAlerts'

export default function FuelAlertsPage() {
    const {
        alerts,
        filtered,
        kpis,
        filters,
        setFilters,
        search,
        setSearch,
        pagination,
        setPage,
        acknowledge: acknowledgeAlert,
        resolve: resolveAlert,
        markFalsePositive,
        tabCounts,
        activeFilterCount,
        isLoading,
        isFetching,
        isError,
    } = useFuelAlerts()
    // The detail panel is hidden until an alert row is clicked; the X clears it.
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [ruleOpen, setRuleOpen] = useState(false)
    // Alert being flagged as a false positive (drives the note dialog).
    const [falsePositiveId, setFalsePositiveId] = useState<string | null>(null)

    const selected = selectedId ? alerts.find((a) => a.id === selectedId) ?? null : null
    const falsePositiveAlert = falsePositiveId ? alerts.find((a) => a.id === falsePositiveId) ?? null : null
    const { points: trend, isLoading: isTrendLoading } = useAlertFuelTrend(selected)

    const acknowledge = (id: string) => {
        acknowledgeAlert(id)
            .then(() => toast.success('Alert acknowledged'))
            .catch((err) => toast.error(extractApiError(err)))
    }
    const resolve = (id: string) => {
        resolveAlert(id)
            .then(() => toast.success('Alert resolved'))
            .catch((err) => toast.error(extractApiError(err)))
    }
    // Opens the note dialog; the actual call happens on confirm.
    const remove = (id: string) => setFalsePositiveId(id)

    const confirmFalsePositive = (notes?: string) =>
        markFalsePositive(falsePositiveId!, notes)
            .then(() => {
                toast.success('Marked as false positive')
                if (selectedId === falsePositiveId) setSelectedId(null)
            })
            .catch((err) => {
                toast.error(extractApiError(err))
                throw err
            })

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
                    <Button size="sm" onClick={() => setRuleOpen(true)} className="h-9 gap-2 bg-blue-600 text-white shadow-none hover:bg-blue-700">
                        <BellPlus className="h-4 w-4" /> Create Alert
                    </Button>
                </div>
            </div>

            <FuelTabs active="Fuel Alerts" />

            {isError ? (
                <QueryError message="Failed to load fuel alerts." />
            ) : (
                <>
                    <AlertKpiCards kpis={kpis} isLoading={isLoading} />

                    {/* Table + detail panel */}
                    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
                        <div className={cn('min-w-0', selected ? 'xl:col-span-2' : 'xl:col-span-3')}>
                            <AlertsTable
                                alerts={filtered}
                                activeId={selected?.id ?? null}
                                onSelect={setSelectedId}
                                onOpenFilters={() => setFiltersOpen(true)}
                                onCreateRule={() => setRuleOpen(true)}
                                onAcknowledge={acknowledge}
                                onResolve={resolve}
                                onDelete={remove}
                                activeFilterCount={activeFilterCount}
                                search={search}
                                onSearchChange={setSearch}
                                pagination={pagination}
                                onPageChange={setPage}
                                isLoading={isLoading}
                                isFetching={isFetching}
                                tabCounts={tabCounts}
                            />
                        </div>
                        {selected && (
                            <div className="xl:col-span-1">
                                <AlertDetailPanel
                                    alert={selected}
                                    trend={trend}
                                    isTrendLoading={isTrendLoading}
                                    onClose={() => setSelectedId(null)}
                                    onAcknowledge={() => acknowledge(selected.id)}
                                    onResolve={() => resolve(selected.id)}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            <AlertFiltersModal open={filtersOpen} onOpenChange={setFiltersOpen} value={filters} onApply={setFilters} />
            <CreateAlertRuleModal open={ruleOpen} onOpenChange={setRuleOpen} />
            <FalsePositiveDialog
                open={!!falsePositiveId}
                onOpenChange={(o) => { if (!o) setFalsePositiveId(null) }}
                label={falsePositiveAlert?.vehicle}
                onConfirm={confirmFalsePositive}
            />
        </div>
    )
}
