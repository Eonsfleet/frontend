'use client'

import { Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ACCURACY, TrackerSettingsDialog } from '@/components/analytics/telemetry/TrackerSettingsDialog'
import * as reports from '@/lib/api/telemetryReports'
import type { VehicleSetup } from '@/lib/api/telemetryReports'
import { FuelTabs } from '../components/FuelTabs'
import { Column, ReportTable } from '@/components/analytics/telemetry/ReportParts'
import { useReportFilters } from '@/components/analytics/telemetry/useReportFilters'
import { dash, formatDuration, formatNumber } from '@/components/analytics/telemetry/format'

function FuelSetup() {
    const { filters, set, value } = useReportFilters()
    const incomplete = value('incomplete') === '1'
    const [editing, setEditing] = useState<VehicleSetup | null>(null)
    const { data, isLoading } = useQuery({
        queryKey: ['fleet-setup', filters.page, incomplete],
        queryFn: () => reports.getFleetSetup({ page: filters.page, per_page: 25, incomplete }),
    })

    const columns: Column<VehicleSetup>[] = [
        { key: 'vehicle', header: 'Vehicle', render: r => <a href={`/vehicles/${r.vehicle_id}`} className="font-bold text-blue-600 hover:underline">{r.vehicle?.toUpperCase() ?? r.vehicle_id}</a> },
        {
            key: 'accuracy', header: 'Fuel accuracy', render: r => (
                <Badge className={cn(ACCURACY[r.fuel_accuracy].style)} title={ACCURACY[r.fuel_accuracy].note}>{ACCURACY[r.fuel_accuracy].label}</Badge>
            ),
        },
        { key: 'rate', header: 'Consumption rate', render: r => (r.consumption_l_per_100km !== null ? `${formatNumber(r.consumption_l_per_100km, 1)} L/100 km` : dash) },
        {
            key: 'tracker', header: 'Tracker', render: r => (r.tracker ? (
                <span className="text-slate-600">{r.tracker.protocol ?? '?'} · {r.tracker.model ?? 'model unknown'}</span>
            ) : <span className="text-slate-400">None</span>),
        },
        {
            key: 'sensor', header: 'Fuel input', render: r => (r.tracker?.inputs.fuel_level
                ? `IO ${r.tracker.inputs.fuel_level.io_id} (${r.tracker.inputs.fuel_level.unit})`
                : dash),
        },
        { key: 'interval', header: 'Parked interval', render: r => formatDuration(r.tracker?.reporting_interval_s ?? null) },
        {
            key: 'missing', header: 'To do', className: 'whitespace-normal min-w-[280px]', render: r => (r.missing.length === 0
                ? <span className="text-emerald-700">Complete</span>
                : <ul className="list-disc pl-4 space-y-0.5 text-slate-600">{r.missing.map(m => <li key={m.key}>{m.note}</li>)}</ul>),
        },
        {
            key: 'edit', header: '', render: r => (r.tracker && (r.tracker.protocol === 'teltonika' || r.tracker.protocol === 'gt06')
                ? <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Tracker settings</Button>
                : null),
        },
    ]

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Setup</h1>
                <p className="text-sm text-slate-500 mt-1">
                    How trustworthy each vehicle&apos;s fuel figures are, and what to fill in to improve them. Consumption rates and tank capacities are set on the vehicle.
                </p>
            </div>
            <FuelTabs active="Fuel Setup" />
            <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={incomplete} onChange={e => set({ incomplete: e.target.checked ? 1 : null })} />
                    Only vehicles with something to do (on this page)
                </label>
                <span className="text-slate-400">
                    {Object.values(ACCURACY).map(a => `${a.label}: ${a.note}`).join(' · ')}
                </span>
            </div>
            <ReportTable
                columns={columns}
                rows={data?.data}
                meta={data ? { ...data.meta, from: '', to: '', timezone: '', partial: false, available_from: null } : undefined}
                isLoading={isLoading}
                rowKey={r => r.vehicle_id}
                empty={incomplete ? 'Nothing to do on this page.' : 'No vehicles.'}
            />
            {editing && <TrackerSettingsDialog key={editing.vehicle_id} setup={editing} open onOpenChange={o => !o && setEditing(null)} />}
        </div>
    )
}

export default function FuelSetupPage() {
    return (
        <Suspense>
            <FuelSetup />
        </Suspense>
    )
}
