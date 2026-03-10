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
}

export default function GeofenceOverviewMap({ geofences }: Props) {
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
                const lat = coordinates.lat ?? coordinates[1]
                const lng = coordinates.lng ?? coordinates[0]
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
                let latlngs: L.LatLngExpression[]
                if (coordinates.type === 'Polygon' && Array.isArray(coordinates.coordinates)) {
                    latlngs = coordinates.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng])
                } else if (Array.isArray(coordinates)) {
                    latlngs = coordinates.map((pt: any) =>
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
