'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface AlertMiniMapProps {
    lat: number
    lng: number
    severity: 'critical' | 'warning' | 'info'
}

// Controller to pan the mini map when coords change
const MiniMapController = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap()
    useEffect(() => {
        map.setView([lat, lng], 14, { animate: true })
    }, [lat, lng, map])
    return null
}

const getMiniIcon = (severity: 'critical' | 'warning' | 'info') => {
    const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6'
    return L.divIcon({
        html: `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: #fff;
                border: 2px solid ${color};
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            ">
                <div style="w-2.5 h-2.5 rounded-full bg-${color}"></div>
            </div>
        `,
        className: 'custom-mini-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    })
}

export default function AlertMiniMap({ lat, lng, severity }: AlertMiniMapProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse rounded-xl">
                <span className="text-[10px] font-bold text-slate-400">Loading Map...</span>
            </div>
        )
    }

    // Generate a simple mock path around the alert location to simulate route history
    const pathCoordinates: [number, number][] = [
        [lat - 0.005, lng - 0.005],
        [lat - 0.002, lng - 0.004],
        [lat - 0.001, lng - 0.001],
        [lat, lng]
    ]

    return (
        <div className="w-full h-full relative z-0 rounded-xl overflow-hidden border border-slate-100 shadow-inner">
            <MapContainer
                center={[lat, lng]}
                zoom={14}
                zoomControl={false}
                attributionControl={false}
                className="w-full h-full"
                scrollWheelZoom={false}
                doubleClickZoom={false}
                dragging={false}
            >
                <MiniMapController lat={lat} lng={lng} />
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline 
                    positions={pathCoordinates} 
                    pathOptions={{ color: '#ef4444', weight: 3, opacity: 0.8 }} 
                />
                <Marker 
                    position={[lat, lng]} 
                    icon={getMiniIcon(severity)}
                />
            </MapContainer>
        </div>
    )
}
