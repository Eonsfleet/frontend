'use client'

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { Radio, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MapMarkerPoint {
    id: number | string
    lat: number
    lng: number
    /** Fuel percentage — drives marker color. */
    fuelPercent?: number | null
    /** Vehicle id used to navigate to the detail page (null for non-vehicle markers, e.g. incidents). */
    vehicleId?: number | null
    /** Per-vehicle details shown in the overlay card when this marker is clicked. */
    featured?: FeaturedVehicle | null
}

export interface FeaturedVehicle {
    registration: string
    status: string
    fuelPercent: number | null
    fuelLiters: number | null
    location: string
    lastUpdated: string
}

interface FuelTrackingMapProps {
    markers: MapMarkerPoint[]
    /** Called with the clicked marker's vehicle id when "View Vehicle" is pressed. */
    onViewVehicle?: (vehicleId: number) => void
    className?: string
}

const LAGOS: [number, number] = [6.5244, 3.3792]

function markerColor(pct?: number | null): string {
    if (pct == null) return '#94a3b8'
    if (pct <= 20) return '#ef4444'
    if (pct <= 40) return '#f59e0b'
    return '#10b981'
}

// Text + dot colors for the vehicle status shown in the overlay card.
//  moving → green · parked → grey · offline → red · idle → amber
function statusStyles(status: string): { text: string; dot: string } {
    switch (status.toLowerCase()) {
        case 'moving':
            return { text: 'text-emerald-600', dot: 'bg-emerald-500' }
        case 'parked':
            return { text: 'text-slate-500', dot: 'bg-slate-400' }
        case 'offline':
            return { text: 'text-rose-600', dot: 'bg-rose-500' }
        case 'idle':
            return { text: 'text-amber-600', dot: 'bg-amber-500' }
        default:
            return { text: 'text-slate-600', dot: 'bg-slate-400' }
    }
}

// Truck badge marker, matching the Real-time Tracking map's vehicle icon.
function truckIcon(color: string, active: boolean) {
    const ring = active ? 'box-shadow:0 0 0 3px rgba(37,99,235,.35);' : ''
    return L.divIcon({
        className: 'fuel-map-truck',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#fff;border:2px solid ${active ? '#2563eb' : color};font-size:16px;line-height:1;${ring}">🚚</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
    })
}

/** Refit the map to the markers whenever they change. */
function FitBounds({ markers }: { markers: MapMarkerPoint[] }) {
    const map = useMap()
    useEffect(() => {
        if (markers.length === 0) return
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]))
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
    }, [markers, map])
    return null
}

export function FuelTrackingMap({ markers, onViewVehicle, className }: FuelTrackingMapProps) {
    const center = useMemo<[number, number]>(
        () => (markers[0] ? [markers[0].lat, markers[0].lng] : LAGOS),
        [markers],
    )

    // The marker the user clicked; its details populate the overlay card.
    const [selectedId, setSelectedId] = useState<MapMarkerPoint['id'] | null>(null)
    const selected = useMemo(
        () => markers.find((m) => m.id === selectedId) ?? null,
        [markers, selectedId],
    )
    const featured = selected?.featured ?? null

    return (
        <div className={cn('relative h-[360px] w-full overflow-hidden rounded-xl bg-slate-100', className)}>
            <MapContainer
                center={center}
                zoom={12}
                scrollWheelZoom
                touchZoom
                zoomControl
                className="h-full w-full"
                style={{ background: '#e5e7eb' }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {markers.map((m) => (
                    <Marker
                        key={m.id}
                        position={[m.lat, m.lng]}
                        icon={truckIcon(markerColor(m.fuelPercent), m.id === selectedId)}
                        eventHandlers={{ click: () => setSelectedId(m.id) }}
                    />
                ))}
                <FitBounds markers={markers} />
            </MapContainer>

            {featured && (
                <div className="pointer-events-auto absolute left-1/2 top-1/2 z-[500] w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{featured.registration}</span>
                        <div className="flex items-center gap-2">
                            <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', statusStyles(featured.status).text)}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', statusStyles(featured.status).dot)} /> {featured.status}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                aria-label="Close"
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                            <span>Fuel Level</span>
                            <span className="font-bold text-slate-900">
                                {featured.fuelPercent ?? '—'}% · {featured.fuelLiters ?? '—'}L
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${featured.fuelPercent ?? 0}%` }}
                            />
                        </div>
                    </div>

                    <dl className="mt-3 space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                            <dt className="text-slate-400">Last Updated</dt>
                            <dd className="font-semibold text-slate-700">{featured.lastUpdated}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                            <dt className="shrink-0 text-slate-400">Location</dt>
                            <dd className="text-right font-semibold text-slate-700">{featured.location}</dd>
                        </div>
                    </dl>

                    {selected?.vehicleId != null && (
                        <button
                            type="button"
                            onClick={() => onViewVehicle?.(selected.vehicleId as number)}
                            className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                        >
                            View Vehicle →
                        </button>
                    )}
                </div>
            )}

            {markers.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-500">
                        <Radio className="h-3.5 w-3.5 text-slate-400" /> No positioned vehicles in range
                    </div>
                </div>
            )}
        </div>
    )
}
