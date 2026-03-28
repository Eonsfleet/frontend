'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const statusColors: Record<string, string> = {
    in_transit: '#10b981',
    idle: '#f59e0b',
    parked: '#6b7280',
    online: '#3b82f6',
    offline: '#ef4444',
}

interface VehicleLocation {
    id: string
    name: string
    lat: number
    lng: number
    status: 'in_transit' | 'idle' | 'parked' | 'online' | 'offline'
    speed?: number
    heading?: number | null
    address?: string | null
}

const MapController = ({ locations }: { locations: VehicleLocation[] }) => {
    const map = useMap()

    useEffect(() => {
        if (locations.length > 0) {
            const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng] as [number, number]))
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 })
        }
    }, [locations, map])

    return null
}

export default function DashboardMapComponent({ locations }: { locations: VehicleLocation[] }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
                <span className="text-sm text-slate-500">Loading Map...</span>
            </div>
        )
    }

    return (
        <div className="w-full h-full relative z-0" role="region" aria-label="Fleet location map">
            <MapContainer
                center={[0, 0]}
                zoom={2}
                scrollWheelZoom={false}
                className="w-full h-full"
            >
                <MapController locations={locations} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locations.map((loc) => (
                    <CircleMarker
                        key={loc.id}
                        center={[loc.lat, loc.lng]}
                        radius={8}
                        pathOptions={{
                            color: '#fff',
                            weight: 2,
                            fillColor: statusColors[loc.status] ?? '#6b7280',
                            fillOpacity: 1,
                        }}
                    >
                        <Popup>
                            <div className="text-sm space-y-1 min-w-[140px]">
                                <p className="font-semibold text-slate-900">{loc.name}</p>
                                <p className="capitalize" style={{ color: statusColors[loc.status] ?? '#6b7280' }}>
                                    ● {loc.status}
                                </p>
                                {loc.speed !== undefined && loc.speed > 0 && (
                                    <p className="text-slate-500">{loc.speed} km/h</p>
                                )}
                                {loc.address && (
                                    <p className="text-slate-500 text-xs leading-tight">{loc.address}</p>
                                )}
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    )
}
