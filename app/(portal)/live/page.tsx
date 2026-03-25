'use client'

import { TelemetryDrawer } from '@/components/live/TelemetryDrawer'
import { TripPlaybackTimeline } from '@/components/live/TripPlaybackTimeline'
import {
    Navigation,
    Truck,
    RefreshCw,
    Search,
    Clock,
    Activity,
    ChevronRight,
    PlayCircle
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import * as api from '@/lib/api/vehicles'
import { cn, normalizeTelemetry } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'
import { useFleetTracking } from '@/hooks/useFleetTracking'
import { getGeofences } from '@/lib/api/geofencing'
import { getActiveTripForVehicle, getTripRoutes, getLastTripForVehicle } from '@/lib/api/trips'
import { getTripPlayback } from '@/lib/api/tracking'
import { getVehicleCurrentFuel } from '@/lib/api/fuel'

const LiveMapComponent = dynamic(
    () => import('@/components/live/LiveMapComponent'),
    { ssr: false }
)

const MOCK_TRIPS = [
    { id: 't1', plate: 'LND-123-XY', destination: 'Lagos Terminal', eta: '14:20 PM', status: 'on-time' },
    { id: 't2', plate: 'ABJ-456-ZZ', destination: 'Abuja Depot', eta: '16:45 PM', status: 'delayed' },
    { id: 't3', plate: 'PH-789-BC', destination: 'Port Harcourt', eta: '11:15 AM', status: 'on-time' },
]

export default function LiveTrackingPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
    const [isTelemetryOpen, setIsTelemetryOpen] = useState(false)
    const [isReplayOpen, setIsReplayOpen] = useState(false)

    // Playback State
    const [playbackIndex, setPlaybackIndex] = useState(0)
    const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const { token } = useAuthStore()

    // 1. Fetch initial vehicle locations
    const { data: routeData } = useQuery({
        queryKey: ['vehicle-locations', { per_page: 1000 }],
        queryFn: () => api.getVehiclesLocations({ per_page: 1000 }),
        enabled: !!token,
    })

    const initialVehicles = routeData?.data || []

    // 2. Real-time updates via WebSocket
    const { telemetryMap } = useFleetTracking()

    console.log("telemetry: ",telemetryMap)

    // 3. Fetch geofences
    const { data: geofenceData } = useQuery({
        queryKey: ['geofences'],
        queryFn: () => getGeofences(),
        enabled: !!token,
    })

    const geofences = geofenceData?.data?.geofences || []

    // 4. Fetch active trip for selected vehicle
    const { data: activeTrip } = useQuery({
        queryKey: ['active-trip', selectedVehicleId],
        queryFn: () => getActiveTripForVehicle(selectedVehicleId!),
        enabled: !!token && !!selectedVehicleId,
    })

    const { data: tripRouteData } = useQuery({
        queryKey: ['trip-route', activeTrip?.id],
        queryFn: () => getTripRoutes(activeTrip!.id),
        enabled: !!activeTrip?.id,
    })

    const tripRoutes = tripRouteData?.data || []

    // 5. Fetch last trip for playback
    const { data: lastTrip } = useQuery({
        queryKey: ['last-trip', selectedVehicleId],
        queryFn: () => getLastTripForVehicle(selectedVehicleId!),
        enabled: !!token && !!selectedVehicleId && isReplayOpen,
    })

    const { data: playbackResponse } = useQuery({
        queryKey: ['playback', lastTrip?.id],
        queryFn: () => getTripPlayback(selectedVehicleId!, lastTrip!.id, { include_gps_points: true }),
        enabled: !!lastTrip?.id,
    })

    const playbackPoints = playbackResponse?.data?.gps_points || []
    const currentPlaybackPoint = playbackPoints[playbackIndex]

    // 3. Normalize and combine data
    const trackedVehicles = useMemo(() => {
        return initialVehicles.map((v) => {
            const live = telemetryMap[v.id]
            const base = v.location ?? null // Initial telemetry from the locations API (may be null for untracked vehicles)

            const tel = live ?? base
            const attrs = v.attributes as any
            const normalized = normalizeTelemetry(tel, {
                deviceStatus: attrs?.deviceStatus || attrs?.device_status || (v as any).device?.status
            })

            return {
                id: v.id,
                registration_number: v.attributes.registration_number,
                display_number: v.attributes.display_number,
                device_id: v.attributes.device_id,
                latitude: normalized?.lat ?? 0,
                longitude: normalized?.lng ?? 0,
                speed: normalized?.speed ?? 0,
                heading: normalized?.heading ?? 0,
                status: normalized?.status ?? 'offline',
                is_online: normalized?.is_online ?? false,
                fuel: normalized?.fuel_level_percent ?? 0,
                odometer: normalized?.odometer ?? 0,
                ignition: normalized?.ignition === true,
                address: normalized?.address ?? 'Locating...',
                last_update: normalized?.gps_datetime ?? null,
            }
        })
    }, [initialVehicles, telemetryMap])

    console.log("trackedVehicles: ", trackedVehicles)

    // Fetch fuel data for all tracked vehicles from the fuel endpoint
    const fuelQueries = useQueries({
        queries: trackedVehicles.map((vehicle) => ({
            queryKey: ['vehicle-fuel', vehicle.id],
            queryFn: () => getVehicleCurrentFuel(Number(vehicle.id)),
            enabled: !!token && !!vehicle.id,
            refetchInterval: 30_000, // Refresh every 30 seconds
            staleTime: 25_000,
        })),
    })

    // Build a map of vehicle ID to fuel data from the fuel endpoint
    const fuelDataMap = useMemo(() => {
        const map: Record<string, { percent: number; liters: number; capacity: number }> = {}
        fuelQueries.forEach((query, index) => {
            const vehicle = trackedVehicles[index]
            if (query.data?.data?.fuel_level) {
                const fuelLevel = query.data.data.fuel_level
                map[vehicle.id] = {
                    percent: fuelLevel.fuel_level_percent ?? 0,
                    liters: fuelLevel.fuel_level_liters ?? 0,
                    capacity: fuelLevel.tank_capacity ?? 0,
                }
            }
        })
        return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(fuelQueries.map(q => q.data)), trackedVehicles.length])

    // Derived selected vehicle object
    const selectedVehicle = useMemo(() =>
        trackedVehicles.find(v => v.id === selectedVehicleId) || null
        , [trackedVehicles, selectedVehicleId])

    const filteredVehicles = useMemo(() => {
        if (!searchQuery) return trackedVehicles
        return trackedVehicles.filter(v =>
            v.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [trackedVehicles, searchQuery])

    console.log(filteredVehicles)

    return (
        <div className="h-[calc(100vh-64px)] -m-6 md:-m-8 flex overflow-hidden bg-slate-100 relative">
            {/* Left Sidebar: Active Operations */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        Live <span className="text-blue-600">Operations</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Monitoring {trackedVehicles.length} Active Assets
                    </p>
                </div>

                {/* Status Counters Bar */}
                <div className="px-4 py-2 border-b border-slate-100 bg-white grid grid-cols-5 gap-1">
                    {[
                        { label: 'ALL', count: trackedVehicles.length, color: 'bg-slate-500' },
                        { label: 'MOV', count: trackedVehicles.filter(v => v.status === 'in_transit').length, color: 'bg-emerald-500' },
                        { label: 'STP', count: trackedVehicles.filter(v => v.status === 'parked' || v.status === 'idle').length, color: 'bg-amber-500' },
                        { label: 'OFF', count: trackedVehicles.filter(v => !v.is_online).length, color: 'bg-rose-500' },
                        { label: 'ONL', count: trackedVehicles.filter(v => v.is_online).length, color: 'bg-blue-500' },
                    ].map(stat => (
                        <div key={stat.label} className="text-center p-1 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-[7px] font-black text-slate-400 leading-none mb-1">{stat.label}</p>
                            <p className="text-xs font-black text-slate-900 leading-none">{stat.count}</p>
                        </div>
                    ))}
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Search & Filter */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH FLEET..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Active Trips Section */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            Active Trips
                            <span className="text-blue-600">VIEW ALL</span>
                        </label>
                        {MOCK_TRIPS.map((trip) => {
                            const tripVehicle = trackedVehicles.find(v => v.registration_number === trip.plate)
                            const fuelData = tripVehicle ? fuelDataMap[tripVehicle.id] : null
                            const displayFuel = fuelData?.percent ?? (tripVehicle ? tripVehicle.fuel : null)
                            const fuelColor = displayFuel !== null && displayFuel < 20 ? 'text-rose-500' : displayFuel !== null && displayFuel < 40 ? 'text-amber-500' : 'text-emerald-500'
                            
                            return (
                                <div
                                    key={trip.id}
                                    onClick={() => {
                                        const v = trackedVehicles.find(v => v.registration_number === trip.plate)
                                        if (v) setSelectedVehicleId(v.id)
                                    }}
                                    className={cn(
                                        "p-4 rounded-2xl border transition-all cursor-pointer group",
                                        selectedVehicle?.registration_number === trip.plate
                                            ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100"
                                            : "bg-white border-slate-100 hover:border-blue-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className={cn("text-[11px] font-black uppercase italic", selectedVehicle?.registration_number === trip.plate ? "text-white" : "text-slate-900")}>
                                            {trip.plate}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            {displayFuel !== null && (
                                                <span className={cn(
                                                    "text-[9px] font-black px-2 py-0.5 rounded-full",
                                                    selectedVehicle?.registration_number === trip.plate 
                                                        ? "bg-white/20 text-white" 
                                                        : `${fuelColor} bg-slate-50`
                                                )}>
                                                    ⛽ {displayFuel}% {fuelData && `(${fuelData.liters.toFixed(1)}L)`}
                                                </span>
                                            )}
                                            <Badge className={cn(
                                                "text-[8px] font-black border-none",
                                                trip.status === 'on-time' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                            )}>
                                                {trip.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                        <Navigation className={cn("h-3 w-3", selectedVehicle?.registration_number === trip.plate ? "text-blue-200" : "text-blue-500")} />
                                        <span className={cn("truncate", selectedVehicle?.registration_number === trip.plate ? "text-blue-100" : "text-slate-500")}>TO: {trip.destination}</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className={cn("h-3 w-3", selectedVehicle?.registration_number === trip.plate ? "text-blue-200" : "text-slate-300")} />
                                            <span className={cn("text-[10px] font-black", selectedVehicle?.registration_number === trip.plate ? "text-white" : "text-slate-900")}>ETA: {trip.eta}</span>
                                        </div>
                                        <ChevronRight className={cn("h-3 w-3 transition-transform group-hover:translate-x-1", selectedVehicle?.registration_number === trip.plate ? "text-white" : "text-slate-300")} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="h-[1px] bg-slate-100 my-4" />

                    {/* All Vehicles Simple List */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Idle Fleet</label>
                        {filteredVehicles.map((v) => {
                            const fuelData = fuelDataMap[v.id]
                            const displayFuel = fuelData?.percent ?? v.fuel
                            const fuelColor = displayFuel < 20 ? 'text-rose-500' : displayFuel < 40 ? 'text-amber-500' : 'text-emerald-500'
                            
                            return (
                                <div
                                    key={v.id}
                                    onClick={() => setSelectedVehicleId(v.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                        selectedVehicleId === v.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-50 hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className="text-[10px] font-black uppercase italic tracking-tight">{v.registration_number}</span>
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            v.status === 'online' ? "bg-emerald-500" : "bg-slate-300"
                                        )} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={cn(
                                            "text-[9px] font-black",
                                            selectedVehicleId === v.id ? "text-white" : fuelColor
                                        )}>
                                            {displayFuel}%
                                        </span>
                                        {fuelData && (
                                            <span className={cn(
                                                "text-[8px] font-bold",
                                                selectedVehicleId === v.id ? "text-slate-400" : "text-slate-400"
                                            )}>
                                                ({fuelData.liters.toFixed(1)}L)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                        <RefreshCw className="h-3 w-3" />
                        Force Sync Fleet
                    </button>
                </div>
            </div>

            {/* Main Map View */}
            <div className="flex-1 relative bg-slate-200">
                <LiveMapComponent
                    vehicles={trackedVehicles}
                    geofences={geofences}
                    activeTripRoute={tripRoutes}
                    playbackMarker={isReplayOpen && currentPlaybackPoint ? {
                        latitude: currentPlaybackPoint.lat,
                        longitude: currentPlaybackPoint.lng,
                        heading: currentPlaybackPoint.heading || 0,
                        speed: currentPlaybackPoint.speed || 0
                    } : undefined}
                    selectedVehicleId={selectedVehicleId}
                    onSelectVehicle={setSelectedVehicleId}
                />

                {/* Overlays: Selected Info Bottom Bar */}
                {selectedVehicle && (
                    <div className="absolute bottom-8 left-8 right-8 xl:left-96 z-30 pointer-events-none">
                        <div className="max-w-4xl mx-auto flex items-end justify-between gap-6 pointer-events-auto">
                            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-500 flex-1">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                                        <Truck className="h-8 w-8" />
                                    </div>
                                    <div className="max-w-[150px]">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight truncate">{selectedVehicle.registration_number}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS:</span>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                selectedVehicle.status === 'online' ? "text-emerald-600" : "text-rose-600"
                                            )}>{selectedVehicle.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-12 w-[1px] bg-slate-100 hidden md:block" />

                                <div className="hidden md:flex flex-1 items-center justify-around">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Velocity</p>
                                        <p className="text-xl font-black text-slate-900 italic">{selectedVehicle.speed}<span className="text-[10px] font-bold text-slate-500 ml-1">KPH</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fuel Remaining</p>
                                        <p className="text-xl font-black text-slate-900 italic">{fuelDataMap[selectedVehicle.id]?.percent ?? selectedVehicle.fuel}<span className="text-[10px] font-bold text-slate-500 ml-1">%</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ignition</p>
                                        <p className={cn("text-xl font-black italic", selectedVehicle.ignition ? "text-blue-600" : "text-slate-400")}>{selectedVehicle.ignition ? 'ON' : 'OFF'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsTelemetryOpen(true)}
                                        className="p-4 bg-slate-900 text-white rounded-2xl hover:scale-105 transition-all shadow-xl shadow-slate-200"
                                    >
                                        <Activity className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setIsReplayOpen(true)}
                                        className="p-4 bg-blue-600 text-white rounded-2xl hover:scale-105 transition-all shadow-xl shadow-blue-100"
                                    >
                                        <PlayCircle className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-Components / Drawers */}
            <TelemetryDrawer
                isOpen={isTelemetryOpen}
                onClose={() => setIsTelemetryOpen(false)}
                vehicleId={selectedVehicleId}
                vehicle={selectedVehicle ? {
                    plate: selectedVehicle.registration_number,
                    speed: selectedVehicle.speed,
                    fuel: selectedVehicle.fuel,
                    temp: 0, // Will be fetched by TelemetryDrawer sensors but we can pass default
                    status: selectedVehicle.status,
                    voltage: '---',
                    signal: '---',
                    ignition: selectedVehicle.ignition,
                    odometer: selectedVehicle.odometer,
                    lat: selectedVehicle.latitude,
                    lng: selectedVehicle.longitude
                } : null}
            />

            <TripPlaybackTimeline
                isOpen={isReplayOpen}
                onClose={() => {
                    setIsReplayOpen(false)
                    setIsPlaybackPlaying(false)
                }}
                data={playbackPoints}
                currentIndex={playbackIndex}
                onIndexChange={setPlaybackIndex}
                isPlaying={isPlaybackPlaying}
                setIsPlaying={setIsPlaybackPlaying}
                speed={playbackSpeed}
                setSpeed={setPlaybackSpeed}
            />
        </div>
    )
}
