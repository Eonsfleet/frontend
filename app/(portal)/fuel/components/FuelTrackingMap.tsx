'use client'

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MapMarkerPoint {
    id: number | string
    lat: number
    lng: number
    /** Fuel percentage — drives marker color. */
    fuelPercent?: number | null
}

export interface FeaturedVehicle {
    registration: string
    status: string
    fuelPercent: number | null
    fuelLiters: number | null
    consumptionLph: number
    location: string
    lastUpdated: string
}

interface FuelTrackingMapProps {
    markers: MapMarkerPoint[]
    featured?: FeaturedVehicle | null
    onViewVehicle?: () => void
    className?: string
}

const LAGOS: [number, number] = [6.5244, 3.3792]

function markerColor(pct?: number | null): string {
    if (pct == null) return '#94a3b8'
    if (pct <= 20) return '#ef4444'
    if (pct <= 40) return '#f59e0b'
    return '#10b981'
}

function pinIcon(color: string) {
    return L.divIcon({
        className: 'fuel-map-pin',
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:#fff;transform:rotate(45deg)"></div></div>`,
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

export function FuelTrackingMap({ markers, featured, onViewVehicle, className }: FuelTrackingMapProps) {
    const center = useMemo<[number, number]>(
        () => (markers[0] ? [markers[0].lat, markers[0].lng] : LAGOS),
        [markers],
    )

    return (
        <div className={cn('relative h-[340px] w-full overflow-hidden rounded-xl border border-slate-200', className)}>
            <MapContainer
                center={center}
                zoom={12}
                scrollWheelZoom={false}
                zoomControl
                className="h-full w-full"
                style={{ background: '#e5e7eb' }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {markers.map((m) => (
                    <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(markerColor(m.fuelPercent))} />
                ))}
                <FitBounds markers={markers} />
            </MapContainer>

            {featured && (
                <div className="pointer-events-auto absolute left-1/2 top-1/2 z-[500] w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{featured.registration}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {featured.status}
                        </span>
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
                            <dt className="text-slate-400">Consumption</dt>
                            <dd className="font-semibold text-slate-700">{featured.consumptionLph} L/h</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-slate-400">Last Updated</dt>
                            <dd className="font-semibold text-slate-700">{featured.lastUpdated}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                            <dt className="shrink-0 text-slate-400">Location</dt>
                            <dd className="text-right font-semibold text-slate-700">{featured.location}</dd>
                        </div>
                    </dl>

                    <button
                        type="button"
                        onClick={onViewVehicle}
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                    >
                        View Vehicle →
                    </button>
                </div>
            )}

            {markers.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm">
                        <Radio className="h-3.5 w-3.5 text-slate-400" /> No positioned vehicles in range
                    </div>
                </div>
            )}
        </div>
    )
}
