'use client'

import { summariseOdometer } from '@/lib/odometer'
import Link from 'next/link'
import { Car, Radio, Route as RouteIcon, User } from 'lucide-react'
import type { Vehicle } from '@/types/vehicle'
import { cn } from '@/lib/utils'

function driverName(v: Vehicle | null): string | null {
  const d = v?.relationships?.current_driver
  if (d && !Array.isArray(d) && 'name' in d) return d.name
  return null
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  in_transit: 'bg-blue-50 text-blue-700 border-blue-100',
  maintenance: 'bg-amber-50 text-amber-700 border-amber-100',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
}

export function PlaybackAssetCard({ vehicle, fallbackLabel, rangeLabel }: { vehicle: Vehicle | null; fallbackLabel: string; rangeLabel: string }) {
  if (!vehicle) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
        Select a vehicle to replay its journey.
      </div>
    )
  }
  const a = vehicle.attributes
  const driver = driverName(vehicle)
  const cluster = vehicle.relationships?.cluster?.name
  const online = a.is_online ?? a.device_online
  const title = [a.make, a.model, a.year].filter(Boolean).join(' ')
  const odo = summariseOdometer(a.odometer)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-blue-600">
          {a.image ? <img src={a.image} alt="" className="h-full w-full object-cover" /> : <Car className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-black text-slate-900">{a.registration_number || fallbackLabel}</h2>
            <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', STATUS_STYLE[a.status ?? ''] ?? STATUS_STYLE.inactive)}>
              {(a.status ?? 'unknown').replace('_', ' ')}
            </span>
          </div>
          <p className="truncate text-[11px] font-semibold text-slate-500">{title || 'Vehicle'}{a.color ? ` · ${a.color}` : ''}</p>
        </div>
        {online !== undefined && (
          <span className={cn('flex items-center gap-1 text-[10px] font-bold', online ? 'text-emerald-600' : 'text-slate-400')}>
            <Radio className="h-3 w-3" /> {online ? 'Online' : 'Offline'}
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-600"><User className="h-3 w-3 text-slate-400" /><dt className="sr-only">Driver</dt><dd className="truncate font-bold">{driver ?? 'No driver assigned'}</dd></div>
        <div className="truncate font-semibold text-slate-500"><dt className="inline">Cluster: </dt><dd className="inline font-bold text-slate-700">{cluster ?? '—'}</dd></div>
        <div className="truncate font-semibold text-slate-500"><dt className="inline">Fuel: </dt><dd className="inline font-bold text-slate-700">{a.fuel_type || '—'}</dd></div>
        <div className="truncate font-semibold text-slate-500"><dt className="inline">Odometer: </dt><dd className="inline font-bold text-slate-700">{odo.required ? 'Reading required' : odo.lifetime ? `${odo.lifetime}${odo.badge ? ` (${odo.badge.toLowerCase()})` : ''}` : '—'}</dd></div>
      </dl>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
        <span>{rangeLabel}</span>
        <span className="flex items-center gap-3">
          <Link href={`/tracking/history?vehicleId=${a.uuid ?? vehicle.id}`} className="flex items-center gap-1 text-blue-600 hover:underline"><RouteIcon className="h-3 w-3" /> Route history</Link>
          <Link href={`/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline">Vehicle</Link>
        </span>
      </div>
    </div>
  )
}
