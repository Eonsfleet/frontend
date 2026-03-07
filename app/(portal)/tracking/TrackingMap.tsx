'use client'

import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

// Normalization & Helpers (Passed from parent or redefined if pure)
const normalizeReg = (reg: string) => reg.toUpperCase()
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

interface TrackingMapProps {
    filteredVehicles: any[]
    locations: Record<string, any>
    selectedVehicle: any
    setSelectedVehicle: (v: any) => void
    vehicles: any[]
    TILE_URL: string
    getMarkerSVG: (bodyType: string) => string
    getVehicleIcon: (bodyType: string, status: string) => React.ReactNode
}

const MapController = ({ selected, locs, allVehicles }: any) => {
    const map = useMap()

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).leafletMap = map
        }
    }, [map])

    useEffect(() => {
        if (allVehicles.length > 0) {
            const points = Object.values(locs)
                .map((l: any) => [l.lat, l.lng] as [number, number])
                .filter(p => !isNaN(p[0]) && !isNaN(p[1]))

            if (points.length > 0) {
                map.fitBounds(points, { padding: [100, 100], maxZoom: 12 })
            }
        }
    }, [allVehicles.length === 0])

    useEffect(() => {
        if (selected && locs[selected.id]) {
            const l = locs[selected.id]
            map.flyTo([l.lat, l.lng], 16)
        }
    }, [selected?.id, locs, map])

    return null
}

export default function TrackingMap({
    filteredVehicles,
    locations,
    selectedVehicle,
    setSelectedVehicle,
    vehicles,
    TILE_URL,
    getMarkerSVG,
    getVehicleIcon
}: TrackingMapProps) {
    return (
        <MapContainer
            center={[6.5244, 3.3792]}
            zoom={12}
            className="h-full w-full z-10"
            zoomControl={false}
        >
            <TileLayer url={TILE_URL} attribution='&copy; Mapbox' />

            <MapController
                selected={selectedVehicle}
                locs={locations}
                allVehicles={vehicles}
            />

            {filteredVehicles.map(v => {
                const loc = locations[v.id]
                if (!loc) return null
                const isActive = loc.status === 'moving' || loc.speed > 0

                return (
                    <Marker
                        key={v.id}
                        position={[loc.lat, loc.lng]}
                        icon={L.divIcon({
                            className: 'custom-marker',
                            html: `
                                <div class="marker-container ${isActive ? 'is-active' : ''}">
                                    <div class="marker-pulse"></div>
                                    <div class="marker-base" style="transform: rotate(${loc.heading || 0}deg)">
                                        <div class="marker-icon-wrapper">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white">
                                                ${getMarkerSVG(v.attributes.body_type)}
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        })}
                        eventHandlers={{
                            click: () => setSelectedVehicle(v)
                        }}
                    >
                        <Popup className="custom-popup" closeButton={false}>
                            <div className="p-3 min-w-[180px] bg-white rounded-xl shadow-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge className={cn("text-[9px] px-1.5 h-4 font-black uppercase tracking-widest", isActive ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                                        {isActive ? 'Moving' : 'Idle'}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{normalizeReg(v.attributes.registration_number)}</span>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        {getVehicleIcon(v.attributes.body_type, loc.status)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 leading-none">{capitalize(v.attributes.make)}</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{capitalize(v.attributes.model)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Speed</span>
                                        <span className="text-xs font-black text-blue-600">{loc.speed} <span className="text-[9px]">KM/H</span></span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Heading</span>
                                        <span className="text-xs font-black text-slate-900">{loc.heading || 0}°</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    )
}
