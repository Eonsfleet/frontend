'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap, Circle, Polygon, Popup, Marker } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { Geofence } from '@/types'
import { FREE_TILE_URL, FREE_TILE_ATTRIBUTION } from '@/lib/map/freeTiles'

// Fix Leaflet icons issues with Next.js SSR
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
})

interface GeofenceMapEditorProps {
    initialGeofence?: Geofence
    vehicles?: (import('@/types').Vehicle | any)[]
    onChange: (data: { type: 'polygon' | 'circle', coordinates: any, radius?: number }) => void
    height?: string
    center?: { lat: number; lng: number }
}

const DefaultPosition: [number, number] = [6.5244, 3.3792] // Lagos, Nigeria

const MapCenterer = ({ initialGeofence }: { initialGeofence?: Geofence }) => {
    const map = useMap()
    useEffect(() => {
        if (!initialGeofence) return

        const { type, coordinates, radius } = initialGeofence.attributes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = coordinates as any

        if (type === 'circle') {
            const lat = c?.lat ?? c?.latitude
            const lng = c?.lng ?? c?.longitude
            if (lat && lng) map.setView([lat, lng], 15)
        } else if (type === 'polygon') {
            // Flat array of { lat, lng } — the format the API returns
            if (Array.isArray(c) && c.length > 0 && c[0].lat != null) {
                const bounds = L.latLngBounds(c.map((p: any) => [p.lat, p.lng] as [number, number]))
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] })
            // GeoJSON geometry fallback
            } else if (c?.type === 'Polygon') {
                const bounds = L.geoJSON(c).getBounds()
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] })
            }
        }
    }, [initialGeofence, map])
    return null
}

const MapPanner = ({ center }: { center?: { lat: number; lng: number } }) => {
    const map = useMap()
    useEffect(() => {
        if (center) {
            map.flyTo([center.lat, center.lng], 15, { duration: 1.2 })
        }
    }, [center, map])
    return null
}

export default function GeofenceMapEditor({ initialGeofence, vehicles, onChange, height = '400px', center }: GeofenceMapEditorProps) {
    const [mapReady, setMapReady] = useState(false)

    useEffect(() => {
        setMapReady(true)
    }, [])

    const _onEdited = (e: any) => {
        e.layers.eachLayer((layer: any) => {
            _syncLayerData(layer)
        })
    }

    const _onCreated = (e: any) => {
        _syncLayerData(e.layer)
    }

    const _onDeleted = (e: any) => {
        // Handle deletion if needed
    }

    const _syncLayerData = (layer: any) => {
        if (layer instanceof L.Circle) {
            const center = layer.getLatLng()
            const radius = layer.getRadius()
            onChange({
                type: 'circle',
                // API expects { lat, lng } for circle center
                coordinates: { lat: center.lat, lng: center.lng },
                radius: radius
            })
        } else if (layer instanceof L.Polygon) {
            const geojson = layer.toGeoJSON()
            // API expects a flat array of { lat, lng } objects, not a GeoJSON geometry
            const ring = geojson.geometry.coordinates[0] as number[][]
            const vertices = ring.map((p: number[]) => ({ lat: p[1], lng: p[0] }))
            onChange({
                type: 'polygon',
                coordinates: vertices,
            })
        }
    }

    if (!mapReady) return <div style={{ height }} className="w-full bg-slate-100 animate-pulse rounded-md" />

    const renderInitialLayer = () => {
        if (!initialGeofence) return null
        const { type, coordinates, radius } = initialGeofence.attributes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = coordinates as any

        if (type === 'circle') {
            const lat = c?.lat ?? c?.latitude
            const lng = c?.lng ?? c?.longitude
            if (lat != null && lng != null) {
                return <Circle center={[lat, lng]} radius={radius || 0} color="#2563eb" fillOpacity={0.2} stroke fill />
            }
        }

        if (type === 'polygon') {
            // Flat array of { lat, lng } — the format the API returns
            if (Array.isArray(c) && c.length > 0 && c[0].lat != null) {
                const positions = c.map((p: any) => [p.lat, p.lng] as [number, number])
                return <Polygon positions={positions} color="#2563eb" fillOpacity={0.2} />
            }
            // GeoJSON geometry fallback
            if (c?.type === 'Polygon') {
                const latlngs = (c.coordinates[0] as any[]).map((p: any) => [p[1], p[0]] as [number, number])
                return <Polygon positions={latlngs} color="#2563eb" fillOpacity={0.2} />
            }
        }

        return null
    }

    return (
        <div style={{ height }} role="region" aria-label="Geofence boundary editor map" className="w-full rounded-md border border-slate-200 overflow-hidden relative z-0">
            <MapContainer
                center={DefaultPosition}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
            >
                <MapCenterer initialGeofence={initialGeofence} />
                <MapPanner center={center} />
                <TileLayer
                    url={FREE_TILE_URL}
                    attribution={FREE_TILE_ATTRIBUTION}
                />
                <FeatureGroup>
                    <EditControl
                        position="topright"
                        onEdited={_onEdited}
                        onCreated={_onCreated}
                        onDeleted={_onDeleted}
                        draw={{
                            rectangle: false,
                            polyline: false,
                            circlemarker: false,
                            marker: false,
                            polygon: {
                                allowIntersection: false,
                                shapeOptions: {
                                    color: '#2563eb'
                                }
                            },
                            circle: {
                                shapeOptions: {
                                    color: '#2563eb'
                                }
                            }
                        }}
                    />
                    {renderInitialLayer()}
                </FeatureGroup>

                {/* Render Vehicle Markers */}
                {vehicles && vehicles.length > 0 && vehicles.map(v => {
                    const loc = v.relationships?.current_location || v.attributes?.current_location
                    if (loc?.latitude && loc?.longitude) {
                        return (
                            <Marker
                                key={v.id}
                                position={[loc.latitude, loc.longitude]}
                                icon={L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div class="p-1.5 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>`,
                                    iconSize: [28, 28],
                                    iconAnchor: [14, 14],
                                })}
                            >
                                <Popup>
                                    <div className="p-2 space-y-1">
                                        <p className="text-xs font-black uppercase text-slate-900">{v.attributes.registration_number}</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{v.attributes.make} {v.attributes.model}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    }
                    return null
                })}
            </MapContainer>
        </div>
    )
}
