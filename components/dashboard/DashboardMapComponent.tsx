'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default Leaflet markers in Next.js
const customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

interface VehicleLocation {
    id: string
    name: string
    lat: number
    lng: number
    status: 'moving' | 'idle' | 'stopped'
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

    const center: [number, number] = locations.length > 0
        ? [locations[0].lat, locations[0].lng]
        : [39.8283, -98.5795] // Default to US center if no locations

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={center}
                zoom={4}
                scrollWheelZoom={false}
                className="w-full h-full rounded-md"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locations.map((loc) => (
                    <Marker
                        key={loc.id}
                        position={[loc.lat, loc.lng]}
                        icon={customIcon}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-semibold text-slate-900">{loc.name}</p>
                                <p className="text-slate-600 capitalize">Status: {loc.status}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
