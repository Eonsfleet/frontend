'use client'

import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { FuelTrackingMap, type MapMarkerPoint } from './FuelTrackingMap'
import type { VehicleRow } from './useFuelOverview'

interface RealtimeTrackingCardProps {
    markers: MapMarkerPoint[]
    /** For the List View tab. */
    vehicles: VehicleRow[]
    /** Navigate to a vehicle's detail page from the map overlay. */
    onViewVehicle?: (vehicleId: number) => void
}

export function RealtimeTrackingCard({ markers, vehicles, onViewVehicle }: RealtimeTrackingCardProps) {
    const positionedVehicles = markers.filter((marker) => marker.vehicleId != null).length

    return (
        <Card className="rounded-2xl border-0 bg-white p-5 shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-bold text-slate-900">Fleet Fuel Map</h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                        </span>
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-slate-400">
                        {positionedVehicles}/{vehicles.length} vehicles have current location data
                    </p>
                </div>
                <span className="text-[11px] font-medium text-slate-400 sm:pt-1">
                    Last updated: {format(new Date(), 'hh:mm:ss a')}
                </span>
            </div>

            <div className="mt-4">
                <FuelTrackingMap markers={markers} onViewVehicle={onViewVehicle} />
            </div>
        </Card>
    )
}
