'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Loader2,
    Navigation,
    Truck,
    RefreshCw,
    Layers,
    Search,
    Filter,
    Clock,
    Activity,
    ChevronRight,
    History,
    MoreVertical,
    Eye,
    EyeOff,
    X,
    MapPin,
    Crosshair,
    ShieldCheck,
    Map as MapIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useEcho } from '@/hooks/useEcho'
import * as api from '@/lib/api/vehicles'
import * as tripApi from '@/lib/api/trips'
import * as trackingApi from '@/lib/api/tracking'
import TrackingMap from './TrackingMap'
import { TelemetryDrawer } from '@/components/live/TelemetryDrawer'
import { TripPlaybackTimeline } from '@/components/live/TripPlaybackTimeline'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const getMarkerSVG = (bodyType: string) => {
    switch (bodyType?.toLowerCase()) {
        case 'truck': return '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h3a5 5 0 0 0 5-5v-1h-8v6Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'
        case 'van': return '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M18 18h2"/><path d="M4 18h2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M7 6v12"/><path d="M17 6v12"/>'
        default: return '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.3 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'
    }
}

const getVehicleIcon = (bodyType: string, status: string) => {
    const isMoving = status === 'moving'
    switch (bodyType?.toLowerCase()) {
        case 'truck': return <Truck className={cn("h-4 w-4", isMoving ? "text-emerald-500" : "text-slate-400")} />
        case 'van': return <Layers className={cn("h-4 w-4", isMoving ? "text-emerald-500" : "text-slate-400")} />
        default: return <Navigation className={cn("h-4 w-4", isMoving ? "text-emerald-500" : "text-slate-400")} />
    }
}

const MOCK_TRIPS = [
    { id: 't1', plate: 'LND-123-XY', destination: 'Lagos Terminal', eta: '14:20 PM', status: 'on-time', speed: 72, progress: 65 },
    { id: 't2', plate: 'ABJ-456-ZZ', destination: 'Abuja Depot', eta: '16:45 PM', status: 'delayed', speed: 45, progress: 30 },
    { id: 't3', plate: 'PH-789-BC', destination: 'Port Harcourt', eta: '11:15 AM', status: 'on-time', speed: 0, progress: 100 },
]

export default function TrackingPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { subscribe } = useEcho()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'idle' | 'offline' | 'online'>('all')
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
    const [isTelemetryOpen, setIsTelemetryOpen] = useState(false)
    const [isReplayOpen, setIsReplayOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'all' | 'focused'>('all')
    const [locations, setLocations] = useState<Record<string, any>>({})
    const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'hybrid'>('standard')

    // Playback state
    const [playbackData, setPlaybackData] = useState<any[]>([])
    const [playbackIndex, setPlaybackIndex] = useState(0)
    const [isPlayingPlayback, setIsPlayingPlayback] = useState(false)
    const [isLoadingPlayback, setIsLoadingPlayback] = useState(false)
    const [playbackType, setPlaybackType] = useState<'trip' | 'history'>('trip')
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfDay(subDays(new Date(), 1)),
        to: endOfDay(new Date())
    })

    const MAP_LAYERS = {
        standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        hybrid: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Needs special handling for Google
    }

    const { token } = useAuthStore()
    const { setSidebarCollapsed } = useUIStore()

    // Auto-collapse nav menu logic moved to main effect for cleanup

    const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-locations', { per_page: 100 }],
        queryFn: () => api.getVehiclesLocations({ per_page: 100 }),
        enabled: !!token,
    })

    const { data: tripData, isLoading: isLoadingTrips } = useQuery({
        queryKey: ['trips', { status: 'in_progress' }],
        queryFn: () => tripApi.getTrips({ status: 'in_progress' }),
        enabled: !!token && viewMode === 'focused',
    })

    const vehicles = useMemo(() => vehicleData?.data || [], [vehicleData])
    const ongoingTrips = useMemo(() => tripData?.data?.trips || [], [tripData])

    const selectedVehicle = useMemo(() =>
        vehicles.find(v => String(v.id) === String(selectedVehicleId)) || null
        , [vehicles, selectedVehicleId])

    const filteredVehicles = useMemo(() => {
        let result = vehicles
        if (searchQuery) {
            result = result.filter(v =>
                v.attributes.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        if (statusFilter !== 'all') {
            if (statusFilter === 'online') {
                result = result.filter(v => locations[v.id]?.is_online || v.attributes.is_online)
            } else if (statusFilter === 'moving') {
                result = result.filter(v => locations[v.id]?.status === 'in_transit' || (v as any).location?.status === 'in_transit' || (locations[v.id]?.speed || 0) > 0)
            } else if (statusFilter === 'idle') {
                result = result.filter(v => ['stopped', 'idle', 'active'].includes(locations[v.id]?.status || (v as any).location?.status || ''))
            } else if (statusFilter === 'offline') {
                result = result.filter(v => (v as any).location?.status === 'offline' || !(locations[v.id]?.is_online || v.attributes.is_online))
            }
        }
        if (selectedVehicleId && !result.find(v => String(v.id) === String(selectedVehicleId))) {
            const sv = vehicles.find(v => String(v.id) === String(selectedVehicleId))
            if (sv) result = [...result, sv]
        }
        return result
    }, [vehicles, searchQuery, statusFilter, locations, selectedVehicleId])

    const ongoingTripsData = useMemo(() => {
        return ongoingTrips.map(trip => {
            // API Structure confirmed via raw dump: trip.relationships.vehicle.id (direct)
            const relVehicle = trip.relationships?.vehicle as any
            const bestVehicleId = relVehicle?.id || (trip.attributes as any)?.vehicleId || (trip.attributes as any)?.vehicle_id

            // Link to fleet vehicle if possible for live telemetry synchronization
            const fleetVehicle = bestVehicleId ? vehicles.find(v => String(v.id) === String(bestVehicleId)) : null

            return {
                ...trip,
                vehiclePlate: fleetVehicle?.attributes.registration_number || relVehicle?.registration_number || 'N/A',
                vehicleId: bestVehicleId ? String(bestVehicleId) : null,
                startTime: trip.attributes.planned_start_time || (trip.attributes as any)?.created_at,
                endTime: trip.attributes.planned_end_time || new Date().toISOString()
            }
        })
    }, [ongoingTrips, vehicles])

    // Unified Playback Fetch Logic
    useEffect(() => {
        const fetchPlayback = async () => {
            if (!isReplayOpen || !selectedVehicleId) {
                setPlaybackData([])
                setPlaybackIndex(0)
                setIsPlayingPlayback(false)
                return
            }

            setIsLoadingPlayback(true)
            try {
                const selectedTrip = ongoingTripsData.find(t => t.vehicleId === selectedVehicleId)

                if (playbackType === 'trip' && selectedTrip) {
                    console.log('--- FETCHING TRIP PLAYBACK ---', { vehicleId: selectedVehicleId, tripId: selectedTrip.id })
                    const res = await trackingApi.getTripPlayback(selectedVehicleId, selectedTrip.id)
                    setPlaybackData(res.data?.gps_points || [])
                } else {
                    // Fallback to tracking playback (defaults to selected range or last 24h)
                    console.log('--- FETCHING TRACKING HISTORY ---', { vehicleId: selectedVehicleId, range: dateRange })
                    const start = dateRange?.from?.toISOString() || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                    const end = dateRange?.to?.toISOString() || new Date().toISOString()
                    const res = await trackingApi.getVehiclePlayback(selectedVehicleId, start, end)
                    setPlaybackData(res.data?.movements || res.data || [])
                }
                setPlaybackIndex(0)
            } catch (err) {
                console.error('Failed to fetch playback telemetry:', err)
            } finally {
                setIsLoadingPlayback(false)
            }
        }
        fetchPlayback()
    }, [isReplayOpen, selectedVehicleId, playbackType, ongoingTripsData])

    // Initialize locations from vehicle attributes and telemetry if available
    useEffect(() => {
        if (vehicles.length > 0) {
            setLocations(prev => {
                const next = { ...prev }
                let changed = false
                vehicles.forEach(v => {
                    // Use nested location object from getVehiclesLocations response
                    const tel = (v as any).location
                    const attrs = v.attributes as any

                    if (tel && !next[v.id]) {
                        next[v.id] = {
                            lat: tel.latitude,
                            lng: tel.longitude,
                            speed: tel.speed || 0,
                            heading: tel.heading || 0,
                            status: tel.status || 'active',
                            is_online: (v as any).is_online || false,
                            fuel: tel.fuel_level_percent,
                            odometer: tel.odometer,
                            lastUpdate: tel.gps_datetime
                        }
                        changed = true
                    } else if (attrs.latitude && !next[v.id]) {
                        next[v.id] = {
                            lat: attrs.latitude,
                            lng: attrs.longitude,
                            speed: attrs.speed || 0,
                            heading: attrs.heading || 0,
                            status: attrs.status || 'idle',
                            is_online: attrs.is_online || false
                        }
                        changed = true
                    }
                })
                return changed ? next : prev
            })
        }
    }, [vehicles])

    // WebSocket Telemetry Subscription
    const { organization } = useAuthStore()
    const { subscribePrivate } = useEcho()

    useEffect(() => {
        if (!token || !organization?.id) return

        // 1. Subscribe to Org-wide location updates
        const locationUnsubscribe = subscribePrivate(`location.organization.${organization.id}`, '.current.recent', (packet: any) => {
            if (packet.vehicle_id) {
                setLocations(prev => ({
                    ...prev,
                    [packet.vehicle_id]: {
                        ...prev[packet.vehicle_id],
                        lat: packet.latitude,
                        lng: packet.longitude,
                        speed: packet.speed,
                        heading: packet.heading,
                        status: packet.status,
                        is_online: true,
                        fuel: packet.fuel_level_percent,
                        odometer: packet.odometer,
                        lastUpdate: packet.gps_datetime,
                        // Additional telemetry for components
                        temp: packet.metadata?.engine_temperature,
                        voltage: packet.metadata?.battery_voltage,
                        ignition: packet.ignition === 'on'
                    }
                }))
            }
        })

        // 2. Subscribe to Vehicle Status Changes
        const statusUnsubscribe = subscribePrivate(`vehicle.status.${organization.id}`, '.vehicle.status.changed', (data: any) => {
            // Refetch vehicles to update list if needed or just update status color
            queryClient.invalidateQueries({ queryKey: ['vehicles-locations'] })
        })

        // 3. Subscribe to Fuel Alerts
        const fuelUnsubscribe = subscribePrivate(`fuel.alerts.${organization.id}`, '.fuel.alert.triggered', (alert: any) => {
            // Optional: Show toast or update local state for fuel warnings
            console.log('Fuel Alert Triggered:', alert)
        })

        return () => {
            if (locationUnsubscribe) locationUnsubscribe()
            if (statusUnsubscribe) statusUnsubscribe()
            if (fuelUnsubscribe) fuelUnsubscribe()
        }
    }, [token, organization?.id, subscribePrivate, queryClient])

    // Auto-collapse sidebar on mount
    const { isSidebarCollapsed, toggleSidebar } = useUIStore()
    useEffect(() => {
        setSidebarCollapsed(true)
        return () => setSidebarCollapsed(false)
    }, [setSidebarCollapsed])

    return (
        <UpgradeGate
            module="geofence"
            featureName="Live Tracking"
            description="Monitor your fleet in real-time with precise telemetry and location data."
        >
            <div className="h-screen w-full flex overflow-hidden bg-slate-100 relative">
                {/* Immersive Background Map */}
                <div className="absolute inset-0 z-0 h-full w-full">
                    <TrackingMap
                        filteredVehicles={filteredVehicles}
                        locations={locations}
                        selectedVehicle={selectedVehicle}
                        setSelectedVehicle={(v) => setSelectedVehicleId(v.id)}
                        vehicles={vehicles}
                        TILE_URL={MAP_LAYERS[mapStyle]}
                        getMarkerSVG={getMarkerSVG}
                        getVehicleIcon={getVehicleIcon}
                    />
                </div>

                {/* Dynamic Sidebar Overlay */}
                <div className="absolute left-6 top-6 bottom-6 z-20 flex flex-col pointer-events-none">
                    <div className={cn(
                        "w-72 h-full border border-white/20 rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden pointer-events-auto transition-all duration-500 ease-in-out",
                        viewMode === 'focused' ? "bg-white" : "bg-white/95 backdrop-blur-xl"
                    )}>
                        {/* Sidebar Header */}
                        <div className="p-6 border-b border-slate-100/50">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                    {viewMode === 'all' ? 'Fleet' : 'Active'} <span className="text-blue-600">{viewMode === 'all' ? 'Listing' : 'Trips'}</span>
                                </h2>
                                <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase tracking-widest">
                                    {viewMode === 'all' ? `${vehicles.length} Assets` : `${ongoingTrips.length} Active`}
                                </Badge>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={viewMode === 'all' ? "SEARCH ASSETS..." : "SEARCH TRIPS..."}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Sidebar Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                            {viewMode === 'all' ? (
                                <>
                                    {/* Status Quick Filters */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                        {(['all', 'moving', 'idle', 'offline', 'online'] as const).map((s) => {
                                            const count = s === 'all'
                                                ? vehicles.length
                                                : s === 'online'
                                                    ? vehicles.filter(v => locations[v.id]?.is_online || (v as any).is_online).length
                                                    : s === 'moving'
                                                        ? vehicles.filter(v => locations[v.id]?.status === 'in_transit' || (v as any).location?.status === 'in_transit').length
                                                        : s === 'idle'
                                                            ? vehicles.filter(v => locations[v.id]?.status === 'stopped' || (v as any).location?.status === 'stopped').length
                                                            : s === 'offline'
                                                                ? vehicles.filter(v => (v as any).location?.status === 'offline').length
                                                                : 0;

                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatusFilter(s)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                                                        statusFilter === s
                                                            ? (s === 'moving' ? "bg-emerald-600 border-emerald-600 text-white" :
                                                                s === 'idle' ? "bg-amber-600 border-amber-600 text-white" :
                                                                    s === 'offline' ? "bg-rose-600 border-rose-600 text-white" :
                                                                        s === 'online' ? "bg-blue-600 border-blue-600 text-white" :
                                                                            "bg-slate-900 border-slate-900 text-white")
                                                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                                    )}
                                                >
                                                    {s} ({count})
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="space-y-2">
                                        {isLoadingVehicles ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                                                <Loader2 className="h-8 w-8 animate-spin" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Fleet...</span>
                                            </div>
                                        ) : filteredVehicles.map((v) => {
                                            const loc = locations[v.id]
                                            const isSelected = String(selectedVehicleId) === String(v.id)
                                            const lastUpdate = loc?.lastUpdate || (v as any).location?.gps_datetime || 'N/A'
                                            const status = loc?.status || (v as any).location?.status

                                            return (
                                                <div
                                                    key={v.id}
                                                    onClick={() => setSelectedVehicleId(isSelected ? null : v.id)}
                                                    className={cn(
                                                        "group flex flex-col p-3 rounded-xl border transition-all cursor-pointer gap-2",
                                                        isSelected
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.01]"
                                                            : "bg-white border-slate-50 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "p-2 rounded-lg transition-colors",
                                                                isSelected ? "bg-white/20" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                                                            )}>
                                                                <Truck className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[10px] font-black uppercase italic tracking-tight leading-none mb-1">
                                                                    {v.attributes.registration_number}
                                                                </h4>
                                                                <p className={cn("text-[8px] font-bold uppercase", isSelected ? "text-blue-100" : "text-slate-400")}>
                                                                    {v.attributes.make} {v.attributes.model}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isSelected ? <Eye className="h-3 w-3 text-white" /> : <EyeOff className="h-3 w-3 text-slate-300" />}
                                                            <div className={cn(
                                                                "h-1.5 w-1.5 rounded-full",
                                                                status === 'in_transit' || status === 'moving' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                                                            )} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                                        <span className={cn("text-[7px] font-black uppercase tracking-widest", isSelected ? "text-blue-200" : "text-slate-400")}>
                                                            Last Update: {lastUpdate}
                                                        </span>
                                                        <span className={cn("text-[7px] font-black uppercase tracking-widest", isSelected ? "text-blue-200" : "text-slate-400")}>
                                                            {loc?.speed || 0} KPH
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    {isLoadingTrips ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Missions...</span>
                                        </div>
                                    ) : ongoingTripsData.length === 0 ? (
                                        <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                            <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No ongoing missions</p>
                                        </div>
                                    ) : (
                                        ongoingTripsData.map((trip) => {
                                            const isSelected = String(selectedVehicleId) === String(trip.vehicleId)
                                            return (
                                                <div
                                                    key={trip.id}
                                                    onClick={() => {
                                                        if (trip.vehicleId) {
                                                            setSelectedVehicleId(trip.vehicleId)
                                                            setIsReplayOpen(true)
                                                        }
                                                    }}
                                                    className={cn(
                                                        "group p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                                                        isSelected
                                                            ? "bg-blue-50 border-blue-200 shadow-sm scale-[1.01]"
                                                            : "bg-white border-slate-100 hover:border-blue-100 shadow-sm"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className={cn(
                                                                "text-[10px] font-black uppercase tracking-tighter",
                                                                isSelected ? "text-blue-600" : "text-slate-400"
                                                            )}>
                                                                {trip.vehiclePlate}
                                                            </h4>
                                                            <Badge className={cn(
                                                                "text-[8px] font-black border-none px-2 mt-1",
                                                                isSelected ? "bg-blue-100 text-blue-700" : "bg-emerald-500/10 text-emerald-600"
                                                            )}>
                                                                ETA: {trip.attributes.eta || 'N/A'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={cn("text-[8px] font-black uppercase tracking-widest", isSelected ? "text-blue-400" : "text-slate-400")}>Mission #</p>
                                                            <p className={cn("text-[10px] font-black italic", isSelected ? "text-blue-700" : "text-slate-900")}>{trip.attributes.trip_number}</p>
                                                        </div>
                                                    </div>

                                                    <div className={cn("relative h-1.5 w-full rounded-full overflow-hidden mb-3", isSelected ? "bg-blue-200/50" : "bg-slate-100")}>
                                                        <div
                                                            className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-1000", isSelected ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-blue-400")}
                                                            style={{ width: '65%' }}
                                                        />
                                                    </div>
                                                    <div className={cn("flex justify-between items-center text-[7px] font-black uppercase tracking-widest mt-1", isSelected ? "text-blue-500" : "text-slate-400")}>
                                                        <span>{locations[trip.vehicleId!]?.speed || 0} KPH</span>
                                                        <span>TRACKING ACTIVE</span>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Controls Command Deck */}
                <div className="absolute right-6 top-6 z-30 flex flex-col gap-4">
                    <TooltipProvider delayDuration={0}>
                        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-2 overflow-hidden items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setViewMode('all')}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            viewMode === 'all' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
                                        )}
                                    >
                                        <MapIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Global Fleet Tracking
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setViewMode('focused')}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            viewMode === 'focused' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
                                        )}
                                    >
                                        <Crosshair className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Focus Mission Tracking
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-2 overflow-hidden items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="h-12 w-12 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-emerald-500 transition-all group">
                                        <ShieldCheck className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Toggle Active Geofences
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            if (viewMode === 'all') {
                                                router.push('/tracking/playback')
                                            }
                                        }}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            viewMode === 'all' ? "text-slate-400 hover:bg-slate-50 hover:text-purple-500" : "text-slate-200 cursor-not-allowed"
                                        )}
                                    >
                                        <History className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Fleet Playback Router
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setMapStyle(mapStyle === 'standard' ? 'satellite' : 'standard')}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            mapStyle === 'satellite' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
                                        )}
                                    >
                                        <MapIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Toggle Satellite View
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => queryClient.invalidateQueries({ queryKey: ['vehicles'] })}
                                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all group"
                                    >
                                        <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Re-Sync Fleet Data
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-1 overflow-hidden items-center">
                            <button className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-900 font-black hover:bg-slate-50 transition-colors border-b border-slate-50">+</button>
                            <button className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-900 font-black hover:bg-slate-50 transition-colors">-</button>
                        </div>
                    </TooltipProvider>
                </div>


                {/* Overlays: Selected Info Bottom Bar */}
                {selectedVehicle && !isReplayOpen && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in slide-in-from-bottom-5 duration-500 delay-100 w-full max-w-xl">
                        <div className="bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] border border-white/50 p-4 flex items-center gap-6 pointer-events-auto">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter truncate">
                                            {selectedVehicle.attributes.registration_number}
                                        </h3>
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full shrink-0",
                                            (locations[selectedVehicle.id]?.status === 'moving' || locations[selectedVehicle.id]?.speed > 0) ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                                        )} />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-2.5 w-2.5 text-blue-500" />
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">
                                            {locations[selectedVehicle.id]?.lastUpdate || 'SYNCED REAL-TIME'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-10 w-[1px] bg-slate-100 shrink-0" />

                            <div className="flex items-center gap-5 shrink-0 px-2">
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Velocity</p>
                                    <p className="text-base font-black text-slate-900 italic tracking-tighter leading-none">
                                        {locations[selectedVehicle.id]?.speed || 0}<span className="text-[8px] font-bold text-slate-400 ml-0.5 font-sans not-italic">KPH</span>
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Fuel</p>
                                    <p className="text-base font-black text-slate-900 italic tracking-tighter leading-none">
                                        {locations[selectedVehicle.id]?.fuel || 0}<span className="text-[8px] font-bold text-slate-400 ml-0.5 font-sans not-italic">%</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => {
                                                    const hasTrip = ongoingTripsData.some(t => t.vehicleId === selectedVehicleId)
                                                    setPlaybackType(hasTrip ? 'trip' : 'history')
                                                    setIsReplayOpen(true)
                                                }}
                                                className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center border border-blue-100"
                                            >
                                                <History className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest">Replay</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => setIsTelemetryOpen(true)}
                                                className="h-10 w-10 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"
                                            >
                                                <Activity className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest">Sensors</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <div className="h-8 w-[1px] bg-slate-100 mx-1" />

                                <button
                                    onClick={() => setSelectedVehicleId(null)}
                                    className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
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
                    plate: (selectedVehicle as any).attributes.registration_number,
                    speed: locations[selectedVehicle.id]?.speed || (selectedVehicle as any).location?.speed || 0,
                    fuel: locations[selectedVehicle.id]?.fuel || (selectedVehicle as any).location?.fuel_level_percent || 0,
                    temp: locations[selectedVehicle.id]?.temp || (selectedVehicle as any).location?.metadata?.engine_temperature || 0,
                    status: locations[selectedVehicle.id]?.status || (selectedVehicle as any).location?.status,
                    voltage: locations[selectedVehicle.id]?.voltage || (selectedVehicle as any).location?.metadata?.battery_voltage || '14.2V',
                    signal: locations[selectedVehicle.id]?.signal || (selectedVehicle as any).location?.satellites + ' Sats',
                    ignition: locations[selectedVehicle.id]?.ignition || (selectedVehicle as any).location?.ignition === 'on',
                    odometer: locations[selectedVehicle.id]?.odometer || (selectedVehicle as any).location?.odometer,
                    lat: locations[selectedVehicle.id]?.lat || (selectedVehicle as any).location?.latitude,
                    lng: locations[selectedVehicle.id]?.lng || (selectedVehicle as any).location?.longitude,
                    lastUpdate: locations[selectedVehicle.id]?.lastUpdate || (selectedVehicle as any).location?.gps_datetime
                } : null}
            />

            <TripPlaybackTimeline
                isOpen={isReplayOpen}
                onClose={() => setIsReplayOpen(false)}
                data={playbackData}
                currentIndex={playbackIndex}
                onIndexChange={setPlaybackIndex}
                isPlaying={isPlayingPlayback}
                setIsPlaying={setIsPlayingPlayback}
                isLoading={isLoadingPlayback}
                title={playbackType === 'trip' ? 'TRIP REPLAY' : 'HISTORY REPLAY'}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
            />

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </UpgradeGate>
    )
}
