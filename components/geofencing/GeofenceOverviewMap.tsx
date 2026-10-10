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
        const container = containerRef.current
        if (!container) return

        // Compute all lat/lng points from raw data — no Leaflet calls needed
        const allPoints: L.LatLngTuple[] = []

        geofences.forEach((g) => {
            const { type, coordinates, radius } = g.attributes
            if (type === 'circle' && coordinates) {
                const c = coordinates as any
                const lat = c.lat ?? c.latitude
                const lng = c.lng ?? c.longitude
                if (lat != null && lng != null) {
                    // Approximate bounding box for a circle using radius in degrees
                    const r = (radius ?? 500) / 111320
                    allPoints.push([lat + r, lng + r])
                    allPoints.push([lat - r, lng - r])
                }
            } else if (type === 'polygon' && coordinates) {
                const c = coordinates as any
                if (Array.isArray(c)) {
                    c.forEach((pt: any) => {
                        if (Array.isArray(pt)) allPoints.push([pt[1], pt[0]])
                        else if (pt.lat != null) allPoints.push([pt.lat, pt.lng])
                    })
                } else if (c?.type === 'Polygon' && Array.isArray(c.coordinates)) {
                    c.coordinates[0].forEach(([lng, lat]: [number, number]) => allPoints.push([lat, lng]))
                }
            }
        })

        const initMap = () => {
            if (mapRef.current) return
            if (container.clientWidth === 0 || container.clientHeight === 0) return

            const map = L.map(container, {
                zoomControl: true,
                attributionControl: false,
                scrollWheelZoom: true,
            })

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
            mapRef.current = map

            // Set initial view before adding layers so projection is ready
            if (allPoints.length > 0) {
                map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] })
            } else {
                map.setView([6.5244, 3.3792], 10)
            }

            // Now safe to add layers — map has a valid size and projection
            geofences.forEach((g, idx) => {
                const color = COLORS[idx % COLORS.length]
                const { type, coordinates, radius, name } = g.attributes

                if (type === 'circle' && coordinates) {
                    const c = coordinates as any
                    const lat = c.lat ?? c.latitude
                    const lng = c.lng ?? c.longitude
                    if (lat != null && lng != null) {
                        L.circle([lat, lng], {
                            radius: radius ?? 500,
                            color,
                            fillColor: color,
                            fillOpacity: 0.12,
                            weight: 2,
                        })
                            .bindTooltip(`<strong>${name}</strong><br/>Circle · ${radius ? `${(radius / 1000).toFixed(1)}km` : ''}`, { className: 'leaflet-geofence-tooltip' })
                            .addTo(map)
                    }
                } else if (type === 'polygon' && coordinates) {
                    const c = coordinates as any
                    let latlngs: L.LatLngExpression[] = []
                    if (c?.type === 'Polygon' && Array.isArray(c.coordinates)) {
                        latlngs = c.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng])
                    } else if (Array.isArray(c)) {
                        latlngs = c.map((pt: any) =>
                            Array.isArray(pt) ? [pt[1], pt[0]] : [pt.lat, pt.lng]
                        )
                    }
                    if (latlngs.length > 0) {
                        L.polygon(latlngs as L.LatLngExpression[], {
                            color,
                            fillColor: color,
                            fillOpacity: 0.12,
                            weight: 2,
                        })
                            .bindTooltip(`<strong>${name}</strong><br/>Polygon`, { className: 'leaflet-geofence-tooltip' })
                            .addTo(map)
                    }
                }
            })

            // Vehicle markers
            vehicles?.forEach(v => {
                const loc = v.relationships?.current_location || v.attributes?.current_location
                if (loc?.latitude && loc?.longitude) {
                    L.marker([loc.latitude, loc.longitude], {
                        icon: L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="p-1 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                        })
                    })
                        .bindPopup(`<div class="p-2"><p class="text-xs font-black uppercase">${v.attributes.registration_number}</p><p class="text-[9px] text-slate-500 uppercase">${v.attributes.make} ${v.attributes.model}</p></div>`)
                        .addTo(map)
                }
            })

            observer.disconnect()
        }

        const observer = new ResizeObserver(() => {
            if (!mapRef.current) {
                initMap()
            } else {
                mapRef.current.invalidateSize()
            }
        })
        observer.observe(container)

        // Try immediately — works if container already has size
        initMap()

        return () => {
            observer.disconnect()
            mapRef.current?.remove()
            mapRef.current = null
        }
    }, [geofences, vehicles])

    return <div ref={containerRef} className="h-full w-full" />
}
