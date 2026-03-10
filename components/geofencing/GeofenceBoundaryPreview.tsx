'use client'

import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Geofence } from '@/types'

// Fix Leaflet default icon paths for Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
})

interface Props {
    geofence: Geofence
    height?: string
}

export default function GeofenceBoundaryPreview({ geofence, height = '300px' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return

        const map = L.map(containerRef.current, {
            zoomControl: true,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: false,
        })

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; Carto',
        }).addTo(map)

        mapRef.current = map

        const { type, coordinates, radius } = geofence.attributes

        if (type === 'circle' && coordinates) {
            const lat = coordinates.lat ?? coordinates[1]
            const lng = coordinates.lng ?? coordinates[0]
            if (lat != null && lng != null) {
                const circle = L.circle([lat, lng], {
                    radius: radius ?? 500,
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 2,
                }).addTo(map)
                map.fitBounds(circle.getBounds(), { padding: [30, 30] })
            }
        } else if (type === 'polygon' && coordinates) {
            // coordinates can be GeoJSON Geometry { type: 'Polygon', coordinates: [...] }
            // or a raw array of latlng pairs
            let latlngs: L.LatLngExpression[]

            if (coordinates.type === 'Polygon' && Array.isArray(coordinates.coordinates)) {
                // GeoJSON: coordinates[0] is the outer ring, each point is [lng, lat]
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
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 2,
                }).addTo(map)
                map.fitBounds(polygon.getBounds(), { padding: [30, 30] })
            }
        }

        return () => {
            map.remove()
            mapRef.current = null
        }
    }, [geofence])

    return (
        <div
            ref={containerRef}
            style={{ height }}
            className="w-full rounded-md border border-slate-200 overflow-hidden relative z-0"
        />
    )
}
