'use client'

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface TripMapOverviewProps {
    startLocation?: { latitude: number; longitude: number; name?: string }
    endLocation?: { latitude: number; longitude: number; name?: string }
    waypoints?: Array<{ latitude: number; longitude: number; name?: string }>
}

export function TripMapOverview({ startLocation, endLocation, waypoints = [] }: TripMapOverviewProps) {
    const mapRef = useRef<L.Map | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        if (!containerRef.current) return

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    setIsReady(true)
                    observer.disconnect()
                }
            }
        })

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!isReady || !containerRef.current || mapRef.current) return

        const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: false,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map)

        mapRef.current = map

        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [isReady])

    useEffect(() => {
        if (!mapRef.current || !startLocation || !endLocation) return

        const map = mapRef.current

        // Clear existing layers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer)
            }
        })

        const startIcon = L.divIcon({
            html: '<div style="background: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        })

        const endIcon = L.divIcon({
            html: '<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        })

        const waypointIcon = L.divIcon({
            html: '<div style="background: #f59e0b; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            className: '',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
        })

        const startMarker = L.marker([startLocation.latitude, startLocation.longitude], { icon: startIcon }).addTo(map)
        if (startLocation.name) {
            startMarker.bindPopup(startLocation.name)
        }

        const endMarker = L.marker([endLocation.latitude, endLocation.longitude], { icon: endIcon }).addTo(map)
        if (endLocation.name) {
            endMarker.bindPopup(endLocation.name)
        }

        // Add waypoint markers
        waypoints.forEach((wp) => {
            const marker = L.marker([wp.latitude, wp.longitude], { icon: waypointIcon }).addTo(map)
            if (wp.name) {
                marker.bindPopup(wp.name)
            }
        })

        // Draw route line
        const routePoints: L.LatLngExpression[] = [
            [startLocation.latitude, startLocation.longitude],
            ...waypoints.map(wp => [wp.latitude, wp.longitude] as L.LatLngExpression),
            [endLocation.latitude, endLocation.longitude],
        ]

        L.polyline(routePoints, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.7,
        }).addTo(map)

        // Fit bounds including waypoints
        const allPoints: L.LatLngExpression[] = [
            [startLocation.latitude, startLocation.longitude],
            ...waypoints.map(wp => [wp.latitude, wp.longitude] as L.LatLngExpression),
            [endLocation.latitude, endLocation.longitude],
        ]
        const bounds = L.latLngBounds(allPoints)
        map.fitBounds(bounds, { padding: [50, 50] })
    }, [startLocation, endLocation, waypoints])

    return (
        <div className="w-full h-full rounded-lg overflow-hidden bg-slate-100" ref={containerRef} />
    )
}
