'use client'

import React, { useState, useMemo, useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ChevronLeft, Play, Pause, FastForward, Rewind,
    Calendar as CalendarIcon, Clock, Truck, MapPin,
    Layers, Search, Download, Settings, History,
    Navigation, List, Loader2, Maximize2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as vehicleApi from '@/lib/api/vehicles'
import * as trackingApi from '@/lib/api/tracking'
import * as tripsApi from '@/lib/api/trips'
import { format, subHours, startOfHour, addMinutes, parseISO } from 'date-fns'
import { Slider } from '@/components/ui/slider'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false })
const useMap = typeof window !== 'undefined' ? require('react-leaflet').useMap : () => null

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const MAPBOX_STYLE = 'mapbox/dark-v11'
const TILE_URL = MAPBOX_ACCESS_TOKEN
    ? `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

interface MovementData {
    lat: number;
    lng: number;
    timestamp: string;
    heading: number;
    speed: number;
}

interface Vehicle {
    id: string;
    attributes: {
        registration_number: string;
        // Add other vehicle attributes if needed
    };
}

export default function PlaybackPage() {
    const router = useRouter()
    const { setSidebarCollapsed } = useUIStore()
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
    const [startTime, setStartTime] = useState(format(subHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"))
    const [endTime, setEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))

    // Playback control state
    const [isPlaying, setIsPlaying] = useState(false)
    const [playbackIndex, setPlaybackIndex] = useState(0)
    const [playbackSpeed, setPlaybackSpeed] = useState(1) // 1x, 2x, 4x, 8x
    const [showEvents, setShowEvents] = useState(true)

    useEffect(() => {
        setSidebarCollapsed(true)
    }, [])

    const { data: vehicleData } = useQuery<{ data: Vehicle[] }>({
        queryKey: ['vehicles', { per_page: 50 }],
        queryFn: () => vehicleApi.getVehicles({ per_page: 50 }),
    })

    const vehicles = vehicleData?.data || []

    const { data: tripsData, isLoading: isLoadingTrips } = useQuery({
        queryKey: ['trips', selectedVehicleId],
        queryFn: () => tripsApi.getTrips({ page: 1 }), // Note: Filter by vehicle if API supports it, or filter client side
        enabled: !!selectedVehicleId
    })

    const vehicleTrips = useMemo(() => {
        if (!tripsData?.data?.trips) return []
        return tripsData.data.trips.filter(t => t.relationships?.vehicle?.data?.id === String(selectedVehicleId))
    }, [tripsData, selectedVehicleId])

    const { data: movementData, isLoading: isLoadingPlayback, isError } = useQuery({
        queryKey: ['playback', selectedVehicleId, selectedTripId],
        queryFn: () => trackingApi.getTripPlayback(selectedVehicleId!, selectedTripId!),
        enabled: !!selectedVehicleId && !!selectedTripId,
    })

    const movements = useMemo(() => movementData?.data?.gps_points || [], [movementData])
    const currentMovement = useMemo(() => movements[playbackIndex], [movements, playbackIndex])

    // Playback Loop
    useEffect(() => {
        let timer: NodeJS.Timeout
        if (isPlaying && playbackIndex < movements.length - 1) {
            timer = setTimeout(() => {
                setPlaybackIndex(prev => prev + 1)
            }, 1000 / playbackSpeed)
        } else if (playbackIndex >= movements.length - 1) {
            setIsPlaying(false)
        }
        return () => clearTimeout(timer)
    }, [isPlaying, playbackIndex, movements.length, playbackSpeed])

    const progressValue = useMemo(() => {
        if (movements.length <= 1) return [0]
        return [(playbackIndex / (movements.length - 1)) * 100]
    }, [playbackIndex, movements.length])

    const selectedVehicle = useMemo(() =>
        vehicles.find(v => String(v.id) === String(selectedVehicleId)),
        [vehicles, selectedVehicleId]
    )

    const MapController = ({ movements, currentIndex }: { movements: MovementData[], currentIndex: number }) => {
        const map = useMap()
        useEffect(() => {
            if (movements.length > 0 && currentIndex === 0) {
                const bounds = movements.map(m => [m.lat, m.lng] as [number, number])
                map.fitBounds(bounds, { padding: [50, 50] })
            }
        }, [movements.length])

        useEffect(() => {
            if (movements[currentIndex]) {
                const p = movements[currentIndex]
                map.flyTo([p.lat, p.lng], 16)
            }
        }, [currentIndex, map])

        return null
    }

    return (
        <div className="h-screen flex overflow-hidden bg-slate-900">
            {/* Playback Control Sidebar */}
            <aside className="w-80 flex flex-col bg-white border-r border-slate-200 z-20 shadow-2xl shrink-0">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-8 w-8">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <h2 className="font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-600" />
                            Playback
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Vehicle</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedVehicleId || ''}
                                onChange={(e) => {
                                    setSelectedVehicleId(e.target.value)
                                    setPlaybackIndex(0)
                                    setIsPlaying(false)
                                }}
                            >
                                <option value="" disabled>Select Asset...</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.attributes.registration_number}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Trip</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedTripId || ''}
                                onChange={(e) => {
                                    setSelectedTripId(e.target.value)
                                    setPlaybackIndex(0)
                                    setIsPlaying(false)
                                }}
                                disabled={!selectedVehicleId || isLoadingTrips}
                            >
                                <option value="" disabled>{isLoadingTrips ? 'Loading Trips...' : 'Select Trip...'}</option>
                                {vehicleTrips.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.attributes.trip_number} ({format(parseISO(t.attributes.planned_start_time), 'MMM dd')})
                                    </option>
                                ))}
                                {!isLoadingTrips && vehicleTrips.length === 0 && selectedVehicleId && (
                                    <option value="" disabled>No trips found</option>
                                )}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 opacity-50 pointer-events-none">
                            <div className="space-y-1.5 text-slate-400">
                                <label className="text-[10px] font-black uppercase tracking-widest">Start Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-3.5 h-3.5" />
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg h-9 pl-8 pr-2 text-[11px] font-bold text-slate-700 outline-none"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-slate-400">
                                <label className="text-[10px] font-black uppercase tracking-widest">End Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-3.5 h-3.5" />
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg h-9 pl-8 pr-2 text-[11px] font-bold text-slate-700 outline-none"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-slate-900 hover:bg-black font-black text-[10px] uppercase tracking-widest h-10 shadow-lg"
                            disabled={!selectedVehicleId || isLoadingPlayback}
                            onClick={() => {
                                setPlaybackIndex(0)
                                setIsPlaying(false)
                            }}
                        >
                            {isLoadingPlayback ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                            Sync Timeline
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-slate-50/50">
                    <div className="p-4">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Voyage Log Summary</div>
                        {selectedVehicleId && movements.length > 0 ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                                    <div className="absolute left-6 top-12 bottom-12 border-l border-dashed border-slate-200" />
                                    <div className="flex gap-4 mb-6 relative">
                                        <div className="w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow mt-1 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Origin</p>
                                            <p className="text-xs font-bold text-slate-900 leading-tight">
                                                {movements[0] ? `${movements[0].lat.toFixed(4)}, ${movements[0].lng.toFixed(4)}` : 'Mission Start Point'}
                                            </p>
                                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">{movements[0] ? format(new Date(movements[0].timestamp), 'MMM dd, HH:mm') : format(new Date(startTime), 'MMM dd, HH:mm')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-slate-200 border-4 border-white shadow mt-1 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Destination</p>
                                            <p className="text-xs font-bold text-slate-900 leading-tight">
                                                {movements[movements.length - 1] ? `${movements[movements.length - 1].lat.toFixed(4)}, ${movements[movements.length - 1].lng.toFixed(4)}` : 'Mission End Point'}
                                            </p>
                                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">{movements[movements.length - 1] ? format(new Date(movements[movements.length - 1].timestamp), 'MMM dd, HH:mm') : format(new Date(endTime), 'MMM dd, HH:mm')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Total Distance</div>
                                        <div className="text-sm font-black text-slate-900">12.4 KM</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Avg Speed</div>
                                        <div className="text-sm font-black text-slate-900">42 KM/H</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <History className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs font-bold text-slate-400 px-8">Define asset and timeframe to generate telemetry history.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </aside>

            {/* Map Environment Card */}
            <div className="flex-1 relative bg-slate-200 overflow-hidden">
                {typeof window !== 'undefined' && (
                    <MapContainer
                        center={[6.5244, 3.3792]}
                        zoom={12}
                        className="h-full w-full z-10"
                        zoomControl={false}
                    >
                        <TileLayer url={TILE_URL} attribution='&copy; Mapbox' />
                        <MapController movements={movements} currentIndex={playbackIndex} />

                        {movements.length > 1 && (
                            <Polyline
                                positions={movements.map(m => [m.lat, m.lng])}
                                color="#3b82f6"
                                weight={4}
                                opacity={0.6}
                                dashArray="10, 10"
                            />
                        )}

                        {currentMovement && (
                            <Marker
                                position={[currentMovement.lat, currentMovement.lng]}
                                icon={L.divIcon({
                                    className: 'custom-marker-wrapper',
                                    html: `
                                        <div class="marker-container is-active is-online">
                                            <div class="marker-pulse"></div>
                                            <div class="marker-base" style="transform: rotate(${currentMovement.heading || 0}deg); background: #2563eb; border-color: #fff;">
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
                    </MapContainer>
                )}

                {/* Dynamic Content Control Layer */}
                <TooltipProvider>
                    <div className="absolute top-6 right-6 flex flex-col gap-2">
                        <div className="bg-white/90 backdrop-blur rounded-xl shadow-2xl border border-slate-200 p-1.5 flex flex-col gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showEvents ? "secondary" : "ghost"}
                                        size="icon"
                                        className={cn("h-10 w-10 text-blue-600", !showEvents && "text-slate-400")}
                                        onClick={() => setShowEvents(!showEvents)}
                                    >
                                        <List className="w-5 h-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-bold">Toggle Event Log</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-slate-500 hover:text-blue-600"
                                        onClick={() => useUIStore.getState().toggleSidebar()}
                                    >
                                        <Maximize2 className="w-5 h-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-bold">Toggle Fullscreen</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </TooltipProvider>

                {/* Playback OS - Fixed Bottom Module */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-30">
                    <Card className="shadow-2xl border-0 overflow-hidden bg-white/95 backdrop-blur-xl border-t-4 border-t-blue-600">
                        <CardContent className="p-0">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 group">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-full text-slate-400 hover:text-blue-600"
                                                        onClick={() => setPlaybackIndex(Math.max(0, playbackIndex - 10))}
                                                    >
                                                        <Rewind className="w-5 h-5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs font-bold">Step Back</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-black transition-all"
                                                        onClick={() => setIsPlaying(!isPlaying)}
                                                        disabled={movements.length === 0}
                                                    >
                                                        {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 ml-1 fill-white" />}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs font-bold">{isPlaying ? 'Pause' : 'Play'}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-full text-slate-400 hover:text-blue-600"
                                                        onClick={() => setPlaybackIndex(Math.min(movements.length - 1, playbackIndex + 10))}
                                                    >
                                                        <FastForward className="w-5 h-5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs font-bold">Step Forward</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200 mx-2" />
                                    <div className="flex gap-1 bg-white p-1 rounded-full border border-slate-100">
                                        {[1, 2, 4, 8].map(speed => (
                                            <button
                                                key={speed}
                                                onClick={() => setPlaybackSpeed(speed)}
                                                className={cn(
                                                    "w-10 h-7 rounded-full text-[10px] font-black transition-all",
                                                    playbackSpeed === speed ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-900"
                                                )}
                                            >
                                                {speed}X
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="text-xl font-black text-slate-900 leading-tight">
                                        {currentMovement ? format(new Date(currentMovement.timestamp), 'HH:mm:ss') : '--:--:--'}
                                    </div>
                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                        Voyage Progress
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <Slider
                                    value={progressValue}
                                    max={100}
                                    step={0.1}
                                    className="mb-4"
                                    onValueChange={([val]: number[]) => {
                                        if (movements.length === 0) return
                                        const index = Math.floor((val / 100) * (movements.length - 1))
                                        setPlaybackIndex(index)
                                    }}
                                />
                                <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>T-Minus Zero</span>
                                    <div className="flex items-center gap-4 text-slate-900">
                                        {currentMovement && (
                                            <>
                                                <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" style={{ transform: `rotate(${currentMovement.heading}deg)` }} /> {currentMovement.heading}&deg;</span>
                                                <span className="flex items-center gap-1.5 text-blue-600"><Truck className="w-3.5 h-3.5" /> {currentMovement.speed} KM/H</span>
                                            </>
                                        )}
                                    </div>
                                    <span>Destination Reached</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <style jsx global>{`
                .leaflet-container {
                    background: #f8fafc !important;
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
                    border-radius: 12px;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                }
                .custom-popup .leaflet-popup-content {
                    margin: 0;
                }
                .custom-popup .leaflet-popup-tip {
                    background: white;
                }
            `}</style>
        </div>
    )
}
