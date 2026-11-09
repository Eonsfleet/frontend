'use client'

import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { FuelTrackingMap, type MapMarkerPoint } from './FuelTrackingMap'
import type { VehicleRow } from './useFuelOverview'

interface RealtimeTrackingCardProps {
    markers: MapMarkerPoint[]
    /** For the List View tab. */
    vehicles: VehicleRow[]
    /** When the vehicle list was last fetched (ms). 0 until the first fetch. */
    updatedAt?: number
    /** Navigate to a vehicle's detail page from the map overlay. */
    onViewVehicle?: (vehicleId: number) => void
}

export function RealtimeTrackingCard({ markers, vehicles, updatedAt = 0, onViewVehicle }: RealtimeTrackingCardProps) {
    const positionedVehicles = markers.filter((marker) => marker.vehicleId != null).length

    return (
        <Card className="rounded-2xl border-0 bg-white p-5 shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-bold text-slate-900">Fleet Fuel Map</h2>
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-slate-400">
                        {positionedVehicles}/{vehicles.length} vehicles have current location data
                    </p>
                </div>
                {/* When this list was fetched, not the clock: the old "Live" badge and
                    "Last updated: now" made a stale vehicle look current. */}
                <span className="text-[11px] font-medium text-slate-400 sm:pt-1">
                    {updatedAt > 0 ? `Refreshed ${format(new Date(updatedAt), 'hh:mm:ss a')} · each vehicle shows its own report time` : 'Loading…'}
                </span>
            </div>

            <div className="mt-4">
                <FuelTrackingMap markers={markers} onViewVehicle={onViewVehicle} />
            </div>
        </Card>
    )
}
