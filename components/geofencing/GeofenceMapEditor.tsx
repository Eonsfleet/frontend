'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { Geofence } from '@/types'

// Fix Leaflet icons issues with Next.js SSR
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
})

interface GeofenceMapEditorProps {
    initialGeofence?: Geofence
    onChange: (data: { type: 'polygon' | 'circle', coordinates: any, radius?: number }) => void
}

export default function GeofenceMapEditor({ initialGeofence, onChange }: GeofenceMapEditorProps) {
    const [mapReady, setMapReady] = useState(false)
    const DefaultPosition: [number, number] = [34.0522, -118.2437] // Los Angeles default

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
        // Clear logic would go here, maybe setting state back to null
    }

    const _syncLayerData = (layer: any) => {
        if (layer instanceof L.Circle) {
            const center = layer.getLatLng()
            const radius = layer.getRadius()
            onChange({
                type: 'circle',
                coordinates: { lat: center.lat, lng: center.lng },
                radius: radius
            })
        } else if (layer instanceof L.Polygon) {
            const geojson = layer.toGeoJSON()
            onChange({
                type: 'polygon',
                coordinates: geojson.geometry
            })
        }
    }

    if (!mapReady) return <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-md" />

    return (
        <div className="h-[400px] w-full rounded-md border border-slate-200 overflow-hidden relative z-0">
            <MapContainer
                center={DefaultPosition}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">Carto</a>'
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
                </FeatureGroup>
            </MapContainer>
        </div>
    )
}
