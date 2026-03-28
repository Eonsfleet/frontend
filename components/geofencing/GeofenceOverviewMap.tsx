'use client'

import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Geofence } from '@/types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
})

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

interface Props {
    geofences: Geofence[]
    vehicles?: (import('@/types').Vehicle | any)[]
}

export default function GeofenceOverviewMap({ geofences, vehicles }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return

        const map = L.map(containerRef.current, {
            zoomControl: true,
            attributionControl: false,
            scrollWheelZoom: true,
        })

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map)
        mapRef.current = map

        const bounds: L.LatLngBounds[] = []

        geofences.forEach((g, idx) => {
            const color = COLORS[idx % COLORS.length]
            const { type, coordinates, radius, name } = g.attributes

            if (type === 'circle' && coordinates) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = coordinates as any
                const lat: number | undefined = c.latitude ?? c.lat ?? c[1]
                const lng: number | undefined = c.longitude ?? c.lng ?? c[0]
                if (lat != null && lng != null) {
                    const circle = L.circle([lat, lng], {
                        radius: radius ?? 500,
                        color,
                        fillColor: color,
                        fillOpacity: 0.12,
                        weight: 2,
                    }).addTo(map)
                    circle.bindTooltip(`<strong>${name}</strong><br/>Circle · ${radius ? `${(radius / 1000).toFixed(1)}km` : ''}`, {
                        className: 'leaflet-geofence-tooltip',
                    })
                    bounds.push(circle.getBounds())
                }
            } else if (type === 'polygon' && coordinates) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = coordinates as any
                let latlngs: L.LatLngExpression[]
                if (c.type === 'Polygon' && Array.isArray(c.coordinates)) {
                    latlngs = c.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng])
                } else if (Array.isArray(c)) {
                    latlngs = c.map((pt: any) =>
                        Array.isArray(pt) ? [pt[1], pt[0]] : [pt.lat, pt.lng]
                    )
                } else {
                    latlngs = []
                }
                if (latlngs.length > 0) {
                    const polygon = L.polygon(latlngs as L.LatLngExpression[], {
                        color,
                        fillColor: color,
                        fillOpacity: 0.12,
                        weight: 2,
                    }).addTo(map)
                    polygon.bindTooltip(`<strong>${name}</strong><br/>Polygon`, {
                        className: 'leaflet-geofence-tooltip',
                    })
                    bounds.push(polygon.getBounds())
                }
            }
        })

        // Add vehicle markers
        if (vehicles && vehicles.length > 0) {
            vehicles.forEach(v => {
                const loc = v.relationships?.current_location || v.attributes?.current_location
                if (loc?.latitude && loc?.longitude) {
                    const marker = L.marker([loc.latitude, loc.longitude], {
                        icon: L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="p-1 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                        })
                    }).addTo(map)
                    
                    marker.bindPopup(`
                        <div class="p-2 space-y-1">
                            <p class="text-xs font-black uppercase text-slate-900">${v.attributes.registration_number}</p>
                            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">${v.attributes.make} ${v.attributes.model}</p>
                        </div>
                    `)
                }
            })
        }

        if (bounds.length > 0) {
            const combined = bounds.reduce((acc, b) => acc.extend(b))
            map.fitBounds(combined, { padding: [40, 40] })
        } else {
            // Default to Lagos if no geofences have location data
            map.setView([6.5244, 3.3792], 10)
        }

        return () => {
            map.remove()
            mapRef.current = null
        }
    }, [geofences])

    return (
        <div
            ref={containerRef}
            className="h-full w-full"
        />
    )
}
