'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FuelTrackingMap, type MapMarkerPoint, type FeaturedVehicle } from './FuelTrackingMap'
import type { VehicleRow } from './useFuelOverview'

interface RealtimeTrackingCardProps {
    markers: MapMarkerPoint[]
    featured: FeaturedVehicle | null
    /** For the List View tab. */
    vehicles: VehicleRow[]
}

export function RealtimeTrackingCard({ markers, featured, vehicles }: RealtimeTrackingCardProps) {
    const [view, setView] = useState<'map' | 'list'>('map')

    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-900">Real-time Fuel Tracking</h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                    </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                    Last updated: {format(new Date(), 'hh:mm:ss a')}
                </span>
            </div>

            <div className="mt-3 flex items-center gap-5 border-b border-slate-100">
                {(['map', 'list'] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => setView(v)}
                        aria-current={view === v ? 'true' : undefined}
                        className={cn(
                            'relative pb-2 text-sm transition-colors duration-200',
                            view === v ? 'font-medium text-blue-600' : 'font-medium text-slate-500 hover:text-slate-700',
                        )}
                    >
                        {v === 'map' ? 'Map View' : 'List View'}
                        {view === v && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {view === 'map' ? (
                    <FuelTrackingMap markers={markers} featured={featured} />
                ) : (
                    <div className="max-h-[340px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                        {vehicles.length === 0 && (
                            <p className="px-4 py-10 text-center text-sm text-slate-400">No vehicles to show.</p>
                        )}
                        {vehicles.map((v) => (
                            <div key={v.id} className="flex items-center justify-between px-4 py-2.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{v.registration}</p>
                                    <p className="truncate text-[11px] text-slate-400">{v.model}</p>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        'text-sm font-bold',
                                        v.fuelPercent == null ? 'text-slate-400'
                                            : v.fuelPercent <= 20 ? 'text-rose-600'
                                                : v.fuelPercent <= 40 ? 'text-amber-600' : 'text-emerald-600',
                                    )}>
                                        {v.fuelPercent ?? '—'}%
                                    </p>
                                    <p className="text-[11px] text-slate-400">{v.fuelLiters ?? '—'} L</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    )
}
