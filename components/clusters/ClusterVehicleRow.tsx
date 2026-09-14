'use client'

import { cn } from '@/lib/utils'
import { VEHICLE_STATUS, resolveStatusKey } from '@/lib/vehicleStatus'
import { useRelativeTime } from '@/hooks/useRelativeTime'
import type { Vehicle } from '@/types/vehicle'
import { User, Gauge } from 'lucide-react'

function fuelBarColor(pct: number | null): string {
    if (pct == null) return 'bg-slate-300'
    if (pct <= 20) return 'bg-rose-500'
    if (pct <= 40) return 'bg-amber-500'
    return 'bg-emerald-500'
}

function fuelTextColor(pct: number | null): string {
    if (pct == null) return 'text-slate-400'
    if (pct <= 20) return 'text-rose-600'
    if (pct <= 40) return 'text-amber-600'
    return 'text-emerald-600'
}

function resolveDriverName(vehicle: Vehicle): string | null {
    const driver = vehicle.relationships?.current_driver
    if (!driver) return null
    if (Array.isArray(driver)) return null
    return driver.name || null
}

export function ClusterVehicleRow({ vehicle }: { vehicle: Vehicle }) {
    const loc = vehicle.relationships?.current_location
    const statusKey = resolveStatusKey({
        status: vehicle.attributes?.status,
        is_online: vehicle.attributes?.is_online ?? false,
        speed: Number(loc?.speed ?? vehicle.attributes?.speed ?? 0) || 0,
    })
    const statusCfg = VEHICLE_STATUS[statusKey]
    const lastPacket = useRelativeTime(vehicle.attributes?.last_packet_received_at)
    const driverName = resolveDriverName(vehicle)
    const imei = vehicle.relationships?.device?.imei ?? vehicle.relationships?.device?.data?.imei ?? null

    const fuelPct: number | null = (loc as any)?.fuel_level_percent ?? null

    return (
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
            <div className="min-w-0 flex-[1.4]">
                <p className="text-xs font-black text-slate-900 uppercase truncate">
                    {vehicle.attributes.registration_number}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                    {[vehicle.attributes.make, vehicle.attributes.model].filter(Boolean).join(' ') || '—'}
                </p>
                {imei && (
                    <p className="text-[10px] text-slate-300 font-mono truncate mt-0.5">IMEI: {imei}</p>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold', statusCfg.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                    {statusCfg.label}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">{lastPacket}</p>
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[11px] text-slate-500">
                <User className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <span className="truncate">{driverName || 'Unassigned'}</span>
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Gauge className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                {Number(loc?.speed ?? 0)} km/h
            </div>

            <div className="w-28 shrink-0">
                {fuelPct != null ? (
                    <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={cn('h-full rounded-full', fuelBarColor(fuelPct))}
                                style={{ width: `${Math.max(0, Math.min(100, fuelPct))}%` }}
                            />
                        </div>
                        <p className={cn('text-[10px] font-bold', fuelTextColor(fuelPct))}>{fuelPct}%</p>
                    </div>
                ) : (
                    <p className="text-[10px] font-semibold text-slate-300 italic">Fuel data unavailable</p>
                )}
            </div>
        </div>
    )
}
