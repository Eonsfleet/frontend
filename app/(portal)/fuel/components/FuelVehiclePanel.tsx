'use client'

import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getVehicleAbnormalities } from '@/lib/api/fuel'
import type { RealtimeFuelVehicle } from '@/lib/api/fuelPage'
import { ageMinutes, formatAge, formatHoursToEmpty, formatLitres, formatNumber } from '@/lib/fuel-format'
import { QualityBadge } from './shared/QualityBadge'
import { FreshnessLabel } from './shared/FreshnessLabel'
import { AlertActions } from './shared/AlertActions'
import { burnText } from './FuelLevelList'
import { useNow } from './useNow'

const ALERT_TITLE: Record<string, string> = {
    low_fuel: 'Low fuel',
    fuel_theft: 'Suspected drain',
    theft: 'Suspected drain',
    fuel_leakage: 'Possible leak',
    sudden_drop: 'Sudden drop',
    sensor_malfunction: 'Sensor fault',
    refill: 'Refill',
    refuel: 'Refill',
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">{children}</dd>
        </div>
    )
}

export function FuelVehiclePanel({ vehicle, onClose }: { vehicle: RealtimeFuelVehicle; onClose: () => void }) {
    const queryClient = useQueryClient()
    const now = useNow()
    const alerts = useQuery({
        queryKey: ['fuel', 'vehicle-alerts', vehicle.vehicle_id],
        queryFn: () => getVehicleAbnormalities(vehicle.vehicle_id, { per_page: 10 }),
    })
    const open = (alerts.data?.data.abnormalities ?? []).filter((a) => ['new', 'active', 'acknowledged'].includes(a.attributes.status) && a.attributes.type !== 'refuel')
    const changed = () => queryClient.invalidateQueries({ queryKey: ['fuel'] })

    return (
        <aside className="flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl bg-white p-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{vehicle.registration_number ?? `Vehicle ${vehicle.vehicle_id}`}</h2>
                    <p className="text-xs text-slate-500">{[vehicle.make, vehicle.model, vehicle.type].filter(Boolean).join(' · ')}</p>
                </div>
                <button type="button" onClick={onClose} aria-label="Close details" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-slate-900">{vehicle.level_percent == null ? '—' : `${Math.round(vehicle.level_percent)}%`}</span>
                <span className="text-sm text-slate-600">{formatLitres(vehicle.level_litres, vehicle.basis)}</span>
                <QualityBadge quality={vehicle.basis} />
            </div>
            <FreshnessLabel freshness={vehicle.freshness} ageMinutes={vehicle.age_minutes} className="mt-1" />

            <dl className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Burn rate">{burnText(vehicle).replace('Burn ', '')}</Stat>
                <Stat label="Empty in">{formatHoursToEmpty(vehicle.hours_to_empty)}</Stat>
                <Stat label="Range">{vehicle.range_km == null ? '—' : `≈ ${formatNumber(vehicle.range_km, 0, 'km')}`}</Stat>
                <Stat label="Tank">{vehicle.capacity_litres == null ? 'Not set' : formatNumber(vehicle.capacity_litres, 0, 'L')}</Stat>
            </dl>
            {vehicle.burn_basis && (
                <p className="mt-2 text-xs text-slate-400">Burn from {vehicle.burn_basis.points} readings over {vehicle.burn_basis.span_minutes} min. It cannot tell a drain from driving.</p>
            )}

            <div className="mt-4 border-t border-slate-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</h3>
                {vehicle.location ? (
                    <p className="mt-1 text-sm text-slate-700">
                        {vehicle.location.address ?? `${vehicle.location.latitude.toFixed(4)}, ${vehicle.location.longitude.toFixed(4)}`}
                        <span className="text-slate-400"> · {formatAge(ageMinutes(vehicle.location.at, now))}</span>
                        <br />
                        {vehicle.location.moving == null ? 'Position too old to say if it is moving' : vehicle.location.moving ? `Moving${vehicle.location.speed_kph ? ` at ${vehicle.location.speed_kph} km/h` : ''}` : 'Parked'}
                    </p>
                ) : <p className="mt-1 text-sm text-slate-500">No position reported.</p>}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Open alerts</h3>
                {alerts.isLoading && <p className="mt-1 text-sm text-slate-500">Loading…</p>}
                {alerts.isError && <p className="mt-1 text-sm text-red-600">Could not load this vehicle&apos;s alerts.</p>}
                {!alerts.isLoading && !alerts.isError && open.length === 0 && <p className="mt-1 text-sm text-slate-500">None.</p>}
                <ul className="mt-2 space-y-3">
                    {open.map((a) => (
                        <li key={a.id} className="rounded-lg border border-slate-100 p-2.5">
                            <p className="text-sm font-semibold text-slate-900">{ALERT_TITLE[a.attributes.type] ?? a.attributes.type}</p>
                            <p className="mb-2 text-xs text-slate-500">{formatAge(ageMinutes(a.attributes.alert_time, now))} · {a.attributes.status}</p>
                            <AlertActions
                                compact
                                alert={{ id: a.id, status: a.attributes.status, assigned_to: a.attributes.assigned_to ?? null, investigating: a.attributes.investigation_opened_at != null, label: vehicle.registration_number }}
                                onChanged={changed}
                            />
                        </li>
                    ))}
                </ul>
            </div>

            <Link href={`/vehicles/${vehicle.vehicle_id}`} className="mt-4 text-sm font-medium text-blue-700 hover:underline">Open vehicle →</Link>
        </aside>
    )
}
