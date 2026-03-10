'use client'

import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

// Normalization & Helpers (Passed from parent or redefined if pure)
const normalizeReg = (reg: string) => reg.toUpperCase()
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

interface TrackingMapProps {
    filteredVehicles: any[]
    locations: Record<string, any>
    selectedVehicle: any
    setSelectedVehicle: (v: any) => void
    vehicles: any[]
    TILE_URL: string
    getMarkerSVG: (bodyType: string) => string
    getVehicleIcon: (bodyType: string, status: string) => React.ReactNode
    playbackData?: any[]
    playbackIndex?: number
    isReplayMode?: boolean
}

const MapController = ({ selected, locs, allVehicles }: any) => {
    const map = useMap()

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).leafletMap = map
        }
    }, [map])

    useEffect(() => {
        if (allVehicles.length > 0) {
            const points = Object.values(locs)
                .map((l: any) => [l.lat, l.lng] as [number, number])
                .filter(p => !isNaN(p[0]) && !isNaN(p[1]))

            if (points.length > 0) {
                map.fitBounds(points, { padding: [100, 100], maxZoom: 12 })
            }
        }
    }, [allVehicles.length === 0])

    useEffect(() => {
        if (selected && locs[selected.id] && !allVehicles.isReplayMode) {
            const l = locs[selected.id]
            map.flyTo([l.lat, l.lng], 16)
        }
    }, [selected?.id, locs, map])

    useEffect(() => {
        if (allVehicles.isReplayMode && allVehicles.playbackData?.[allVehicles.playbackIndex]) {
            const p = allVehicles.playbackData[allVehicles.playbackIndex]
            map.flyTo([p.lat, p.lng], 16)
        }
    }, [allVehicles.playbackIndex, allVehicles.isReplayMode, map])

    return null
}

export default function TrackingMap({
    filteredVehicles,
    locations,
    selectedVehicle,
    setSelectedVehicle,
    vehicles,
    TILE_URL,
    getMarkerSVG,
    getVehicleIcon,
    playbackData = [],
    playbackIndex = 0,
    isReplayMode = false
}: TrackingMapProps) {
    const currentPlayback = playbackData[playbackIndex]
    return (
        <>
            <MapContainer
                center={[6.5244, 3.3792]}
                zoom={12}
                className="h-full w-full z-10"
                zoomControl={false}
            >
                <TileLayer url={TILE_URL} attribution='&copy; Mapbox' />

                <MapController
                    selected={selectedVehicle}
                    locs={locations}
                    allVehicles={{
                        length: vehicles.length,
                        isReplayMode,
                        playbackData,
                        playbackIndex
                    }}
                />

                {isReplayMode && playbackData.length > 0 && (
                    <>
                        <Polyline
                            positions={playbackData.map(p => [p.lat, p.lng])}
                            color="#3b82f6"
                            weight={4}
                            opacity={0.6}
                            dashArray="10, 10"
                        />
                        {currentPlayback && (
                            <Marker
                                position={[currentPlayback.lat, currentPlayback.lng]}
                                icon={L.divIcon({
                                    className: 'custom-marker-wrapper',
                                    html: `
                                        <div class="marker-container is-active is-online">
                                            <div class="marker-pulse"></div>
                                            <div class="marker-base" style="transform: rotate(${currentPlayback.heading || 0}deg); background: #2563eb; border-color: #fff;">
                                                <div class="marker-icon-wrapper">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white">
                                                        <path d="M12 19V5M5 12l7-7 7 7"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    `,
                                    iconSize: [40, 40],
                                    iconAnchor: [20, 20]
                                })}
                            />
                        )}
                    </>
                )}

                <MarkerClusterGroup chunkedLoading>
                    {filteredVehicles.filter(v => {
                        const loc = locations[v.id]
                        return loc && loc.lat != null && loc.lng != null && !isNaN(loc.lat) && !isNaN(loc.lng)
                    }).map(v => {
                        const loc = locations[v.id]
                        const isActive = loc.status === 'in_transit' || (loc.speed || 0) > 0
                        const isOnline = loc.is_online || v.attributes.is_online

                        return (
                            <Marker
                                key={v.id}
                                position={[loc.lat, loc.lng]}
                                icon={L.divIcon({
                                    className: 'custom-marker-wrapper',
                                    html: `
                                        <div class="marker-container ${isActive ? 'is-active' : ''} ${isOnline ? 'is-online' : 'is-offline'}">
                                            <div class="marker-pulse"></div>
                                            <div class="marker-base" style="transform: rotate(${loc.heading || 0}deg)">
                                                <div class="marker-icon-wrapper">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white">
                                                        ${getMarkerSVG(v.attributes.body_type)}
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    `,
                                    iconSize: [40, 40],
                                    iconAnchor: [20, 20]
                                })}
                                eventHandlers={{
                                    click: () => setSelectedVehicle(v)
                                }}
                            >
                                <Popup className="custom-popup" closeButton={false}>
                                    <div className="p-3 min-w-[200px] bg-white rounded-2xl shadow-2xl border border-slate-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <Badge className={cn(
                                                "text-[8px] px-2 h-4 font-black uppercase tracking-widest border-none",
                                                isActive ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                            )}>
                                                {isActive ? 'Moving' : loc.status === 'stopped' ? 'Stopped' : 'Idle'}
                                            </Badge>
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{normalizeReg(v.attributes.registration_number)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mb-4 p-2 bg-slate-50 rounded-xl">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                {getVehicleIcon(v.attributes.body_type, loc.status)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 leading-none">{capitalize(v.attributes.make)}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{capitalize(v.attributes.model)}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Velocity</span>
                                                <span className="text-sm font-black text-blue-600 italic">{loc.speed} <span className="text-[9px]">KPH</span></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Heading</span>
                                                <span className="text-sm font-black text-slate-900 italic">{loc.heading || 0}°</span>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MarkerClusterGroup>
            </MapContainer>

            <style jsx global>{`
                .leaflet-marker-icon {
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .marker-container {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .marker-base {
                    position: relative;
                    z-index: 2;
                    width: 32px;
                    height: 32px;
                    background: #1e293b;
                    border: 2px solid white;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    transition: transform 0.5s ease;
                }

                .marker-container.is-active .marker-base {
                    background: #2563eb;
                    border-color: #60a5fa;
                }

                .marker-container.is-offline .marker-base {
                    opacity: 0.6;
                    filter: grayscale(1);
                }

                .marker-pulse {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    background: rgba(37, 99, 235, 0.2);
                    border-radius: 50%;
                    transform: scale(0);
                    opacity: 0;
                    z-index: 1;
                }

                .marker-container.is-active .marker-pulse {
                    animation: marker-pulse 2s infinite;
                }

                @keyframes marker-pulse {
                    0% { transform: scale(0.5); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                .marker-icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .custom-popup .leaflet-popup-content-wrapper {
                    padding: 0;
                    overflow: hidden;
                    border-radius: 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2) !important;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .custom-popup .leaflet-popup-tip-container {
                    display: none;
                }
            `}</style>
        </>
    )
}
