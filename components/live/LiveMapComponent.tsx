'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

// Robust icon creation using standard HTML string to avoid react-dom/server issues in some environments
const createVehicleIcon = (status: string, heading: number = 0, isSelected: boolean = false) => {
    const color = isSelected ? '#2563eb' : (status === 'online' ? '#10b981' : '#ed7171')

    // Simple HTML string for the icon
    const html = `
        <div style="
            transform: rotate(${heading}deg);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: white;
            border-radius: 50%;
            border: 2px solid ${color};
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            transition: transform 0.3s ease;
        ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
        </div>
    `

    return L.divIcon({
        html,
        className: 'custom-vehicle-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    })
}

function MapController({ locations, selectedVehicleId }: { locations: { id: string; lat: number; lng: number }[]; selectedVehicleId: string | null }) {
    const map = useMap()
    const [hasFitted, setHasFitted] = useState(false)

    // Handle initial bounds fitting
    useEffect(() => {
        if (!hasFitted && locations.length > 0) {
            const validLocations = locations.filter(loc => loc.lat !== 0 && loc.lng !== 0)
            if (validLocations.length > 0) {
                const bounds = L.latLngBounds(validLocations.map(loc => [loc.lat, loc.lng]))
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
                setHasFitted(true)
            }
        }
    }, [locations, map, hasFitted])

    // Handle smooth fly-to on selection
    useEffect(() => {
        if (selectedVehicleId) {
            const selected = locations.find(v => v.id === selectedVehicleId)
            if (selected && selected.lat !== 0 && selected.lng !== 0) {
                map.flyTo([selected.lat, selected.lng], 17, { duration: 1.5 })
            }
        }
    }, [selectedVehicleId, map, locations])

    return null
}

interface LiveMapProps {
    vehicles: {
        id: string
        registration_number: string
        latitude: number
        longitude: number
        speed: number
        heading: number
        status: string
    }[]
    selectedVehicleId: string | null
    onSelectVehicle: (id: string) => void
}

export default function LiveMapComponent({ vehicles, selectedVehicleId, onSelectVehicle }: LiveMapProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Initializing Tracking Engine...</span>
        </div>
    )

    const initialCenter: [number, number] = vehicles.length > 0 && vehicles[0].latitude !== 0
        ? [vehicles[0].latitude, vehicles[0].longitude]
        : [6.5244, 3.3792]

    return (
        <div className="w-full h-full relative z-0" style={{ height: '100%', minHeight: '400px' }}>
            <MapContainer
                center={initialCenter}
                zoom={12}
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController
                    locations={vehicles.map(v => ({ id: v.id, lat: v.latitude, lng: v.longitude }))}
                    selectedVehicleId={selectedVehicleId}
                />

                {vehicles.map((v) => {
                    // Skip rendering markers at (0,0) or missing coords
                    if (!v.latitude || !v.longitude || (Math.abs(v.latitude) < 0.0001 && Math.abs(v.longitude) < 0.0001)) {
                        return null;
                    }

                    return (
                        <Marker
                            key={v.id}
                            position={[v.latitude, v.longitude]}
                            icon={createVehicleIcon(v.status, v.heading, selectedVehicleId === v.id)}
                            eventHandlers={{
                                click: () => onSelectVehicle(v.id)
                            }}
                        >
                            <Popup className="custom-map-popup">
                                <div className="p-2 min-w-[150px]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Asset</p>
                                    <p className="text-sm font-black text-slate-900 italic mb-1">{v.registration_number}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] font-bold text-blue-600 font-mono tracking-tighter">{v.speed} KPH</span>
                                        <span className={cn(
                                            "h-2 w-2 rounded-full",
                                            v.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                        )} />
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>

            <style jsx global>{`
                .custom-vehicle-marker {
                    background: transparent !important;
                    border: none !important;
                }
                .custom-map-popup .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                    padding: 4px;
                }
                .custom-map-popup .leaflet-popup-tip-container {
                    display: none;
                }
            `}</style>
        </div>
    )
}
